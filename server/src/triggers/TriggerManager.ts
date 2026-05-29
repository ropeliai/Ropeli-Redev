import { randomUUID } from 'node:crypto';
import { startConsumer as startScheduleConsumer } from './consumers/scheduleConsumer.js';
import { startConsumer as startWebhookConsumer } from './consumers/webhookConsumer.js';
import { startConsumer as startPollingConsumer } from './consumers/pollingConsumer.js';
import { TriggerRegistry } from './TriggerRegistry.js';
import type {
  NormalizedTriggerEvent,
  TriggerActivationResult,
  TriggerCloseResult,
  TriggerConsumerContext,
  TriggerLogger,
  TriggerManualExecutionResult,
  TriggerMode,
  TriggerNodeConfig,
  TriggerOutputConfig,
  TriggerStatusResult,
  TriggerRuntimeHandle,
  TriggerStore as TriggerStoreContract,
  TriggerStoreRecord,
  WorkflowDefinition,
  WorkflowExecutionService,
} from './types.js';

/**
 * Central coordinator for trigger lifecycle management.
 *
 * The manager owns:
 * - activation and deactivation of live consumers
 * - manual trigger execution from the editor
 * - restoration after server restart
 * - persistence sync between live handles and DB records
 */
export class TriggerManager {
  constructor(
    private readonly store: TriggerStoreContract,
    private readonly workflowExecutor: WorkflowExecutionService,
    private readonly logger: TriggerLogger,
    private readonly registry = new TriggerRegistry(),
  ) {}

  /**
   * Activate a workflow trigger and start the correct consumer for the selected mode.
   */
  async activateTrigger(workflowId: string, nodeConfig: TriggerNodeConfig): Promise<TriggerActivationResult> {
    const normalizedConfig = this.normalizeNodeConfig(workflowId, nodeConfig);
    const existingRuntime = this.registry.get(workflowId, normalizedConfig.nodeId);

    this.logger.info('Activating trigger', {
      workflowId,
      nodeId: normalizedConfig.nodeId,
      triggerMode: normalizedConfig.triggerMode,
    });

    if (existingRuntime) {
      this.logger.warn('Trigger already active; returning existing runtime', {
        workflowId,
        nodeId: normalizedConfig.nodeId,
        triggerMode: normalizedConfig.triggerMode,
      });

      return {
        workflowId,
        nodeId: normalizedConfig.nodeId,
        status: 'active',
        triggerMode: normalizedConfig.triggerMode,
        runtime: existingRuntime,
      };
    }

    const record = await this.store.upsert(this.buildTriggerStoreRecord(normalizedConfig));

    try {
      const runtime = await this.startConsumer(workflowId, normalizedConfig, record);
      this.registry.register(workflowId, normalizedConfig.nodeId, runtime);

      await this.store.upsert({
        ...record,
        status: 'active',
        updatedAt: new Date().toISOString(),
        runtimeMetadata: runtime.metadata,
      });

      const storedRecord = (await this.store.getByWorkflowAndNode(workflowId, normalizedConfig.nodeId)) ?? record;

      return {
        workflowId,
        nodeId: normalizedConfig.nodeId,
        status: 'active',
        triggerMode: normalizedConfig.triggerMode,
        runtime,
        record: storedRecord,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      this.logger.error('Failed to activate trigger', {
        workflowId,
        nodeId: normalizedConfig.nodeId,
        triggerMode: normalizedConfig.triggerMode,
        error: message,
      });

      await this.store.upsert({
        ...record,
        status: 'failed',
        updatedAt: new Date().toISOString(),
      });

      return {
        workflowId,
        nodeId: normalizedConfig.nodeId,
        status: 'failed',
        triggerMode: normalizedConfig.triggerMode,
        error: message,
      };
    }
  }

  /**
   * Deactivate a trigger and tear down the active runtime.
   */
  async deactivateTrigger(workflowId: string, nodeId: string): Promise<TriggerCloseResult> {
    const runtime = this.registry.get(workflowId, nodeId);
    const closedAt = new Date().toISOString();

    this.logger.info('Deactivating trigger', {
      workflowId,
      nodeId,
    });

    if (!runtime) {
      await this.store.markInactive(workflowId, nodeId, closedAt, 'runtime-not-found');

      return {
        workflowId,
        nodeId,
        status: 'closed',
        closedAt,
        reason: 'runtime-not-found',
      };
    }

    return this.closeRuntime(workflowId, nodeId, runtime, 'manual-deactivate');
  }

  /**
   * Execute the trigger once from the editor without registering a live consumer.
   */
  async manualExecuteTrigger(
    workflowId: string,
    nodeId: string,
    manualInput?: unknown,
  ): Promise<TriggerManualExecutionResult> {
    this.logger.info('Manual trigger execution requested', {
      workflowId,
      nodeId,
    });

    const record = await this.store.getByWorkflowAndNode(workflowId, nodeId);
    const runId = randomUUID();
    const fallbackConfig = this.createFallbackNodeConfig(workflowId, nodeId);

    if (!record) {
      const event = this.createNormalizedEvent({
        workflowId,
        nodeConfig: fallbackConfig,
        triggerMode: 'manual',
        sourceName: 'Manual Trigger',
        eventName: 'manual_execute',
        payload: { manualInput },
        runId,
      });

      const workflowDefinition = this.createFallbackWorkflowDefinition(fallbackConfig);

      try {
        this.logger.warn('Trigger record missing; running manual execution with fallback trigger config', {
          workflowId,
          nodeId,
          runId,
        });

        const execution = await this.workflowExecutor.executeWorkflow(workflowDefinition, {
          triggerEvent: event,
          manualInput,
          triggerRecord: null,
        });

        return {
          workflowId,
          nodeId,
          status: execution.status === 'success' ? 'success' : 'failed',
          runId,
          event,
          execution,
          error: execution.status === 'failed' ? execution.errors?.[0]?.message : undefined,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);

        this.logger.error('Manual trigger execution failed', {
          workflowId,
          nodeId,
          error: message,
        });

        return {
          workflowId,
          nodeId,
          status: 'failed',
          runId,
          event,
          error: message,
        };
      }
    }

    const nodeConfig = record.nodeConfigSnapshot;
    const event = this.createNormalizedEvent({
      workflowId,
      nodeConfig,
      triggerMode: 'manual',
      sourceName: nodeConfig.label ?? 'Manual Trigger',
      eventName: 'manual_execute',
      payload: {
        manualInput,
        record,
      },
      runId,
    });

    const workflowDefinition = this.resolveWorkflowDefinition(nodeConfig) ?? this.createFallbackWorkflowDefinition(nodeConfig);

    try {
      this.logger.info('Manual trigger event firing', {
        workflowId,
        nodeId,
        runId,
        triggerMode: nodeConfig.triggerMode,
      });

      const execution = await this.workflowExecutor.executeWorkflow(workflowDefinition, {
        triggerEvent: event,
        manualInput,
        triggerRecord: record,
      });

      this.logger.info('Manual trigger execution completed', {
        workflowId,
        nodeId,
        runId,
        status: execution.status,
      });

      return {
        workflowId,
        nodeId,
        status: execution.status === 'success' ? 'success' : 'failed',
        runId,
        event,
        execution,
        error: execution.status === 'failed' ? execution.errors?.[0]?.message : undefined,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      this.logger.error('Manual trigger execution failed', {
        workflowId,
        nodeId,
        error: message,
      });

      return {
        workflowId,
        nodeId,
        status: 'failed',
        runId,
        event,
        error: message,
      };
    }
  }

  /**
   * Restore active trigger consumers from persistent records.
   */
  async restoreActiveTriggers(): Promise<Array<TriggerActivationResult>> {
    this.logger.info('Restoring active triggers on startup');

    const activeRecords = await this.store.listActive();
    const results: Array<TriggerActivationResult> = [];

    for (const record of activeRecords) {
      try {
        if (this.registry.has(record.workflowId, record.nodeId)) {
          this.logger.info('Trigger already restored in memory', {
            workflowId: record.workflowId,
            nodeId: record.nodeId,
            triggerMode: record.triggerMode,
          });

          results.push({
            workflowId: record.workflowId,
            nodeId: record.nodeId,
            status: 'active',
            triggerMode: record.triggerMode,
            runtime: this.registry.get(record.workflowId, record.nodeId),
            record,
          });
          continue;
        }

        const activation = await this.activateTrigger(record.workflowId, record.nodeConfigSnapshot);
        results.push(activation);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);

        this.logger.error('Failed to restore trigger', {
          workflowId: record.workflowId,
          nodeId: record.nodeId,
          triggerMode: record.triggerMode,
          error: message,
        });

        results.push({
          workflowId: record.workflowId,
          nodeId: record.nodeId,
          status: 'failed',
          triggerMode: record.triggerMode,
          error: message,
        });
      }
    }

    this.logger.info('Trigger restore complete', {
      activeCount: results.filter((result) => result.status === 'active').length,
      failedCount: results.filter((result) => result.status === 'failed').length,
    });

    return results;
  }

  /**
   * List active trigger runtimes for a single workflow.
   *
   * This is used by the status route so the HTTP layer does not need to access the
   * private registry directly.
   */
  listActiveTriggers(workflowId: string): TriggerRuntimeHandle[] {
    return this.registry.listWorkflow(workflowId);
  }

  /**
   * Return a stable status summary for the requested workflow and node.
   */
  getTriggerStatus(workflowId: string, nodeId?: string): TriggerStatusResult {
    try {
      const activeTriggers = this.listActiveTriggers(workflowId);
      const activeTrigger = nodeId ? activeTriggers.find((trigger) => trigger.nodeId === nodeId) ?? null : null;

      return {
        workflowId,
        nodeId,
        status: activeTrigger?.status ?? (activeTriggers.length > 0 ? 'active' : 'inactive'),
        lastFiredAt: activeTrigger?.lastFiredAt ?? null,
        nextRunAt: activeTrigger?.nextRunAt ?? null,
        activeTrigger,
        activeTriggers,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      this.logger.error('Trigger status lookup failed', {
        workflowId,
        nodeId,
        error: message,
      });

      return {
        workflowId,
        nodeId,
        status: 'inactive',
        lastFiredAt: null,
        nextRunAt: null,
        activeTrigger: null,
        activeTriggers: [],
      };
    }
  }

  /**
   * Create the live consumer for the trigger's selected mode.
   */
  private async startConsumer(
    workflowId: string,
    nodeConfig: TriggerNodeConfig,
    record: TriggerStoreRecord,
  ): Promise<TriggerRuntimeHandle> {
    const context: TriggerConsumerContext = {
      workflowId,
      nodeConfig,
      logger: this.logger,
      emitEvent: async (event) => {
        this.logger.info('Trigger event firing', {
          workflowId,
          nodeId: nodeConfig.nodeId,
          triggerMode: nodeConfig.triggerMode,
          runId: event.runId,
        });

        const workflowDefinition = this.resolveWorkflowDefinition(nodeConfig) ?? this.createFallbackWorkflowDefinition(nodeConfig);
        try {
          await this.workflowExecutor.executeWorkflow(workflowDefinition, {
            triggerEvent: event,
            triggerRecord: record,
          });
          this.logger.info('Trigger event processed', {
            workflowId,
            nodeId: nodeConfig.nodeId,
            triggerMode: nodeConfig.triggerMode,
            runId: event.runId,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);

          this.logger.error('Trigger event execution failed', {
            workflowId,
            nodeId: nodeConfig.nodeId,
            triggerMode: nodeConfig.triggerMode,
            runId: event.runId,
            error: message,
          });

          throw error;
        }
      },
      registerCleanup: (cleanup) => {
        // Keep the hook available for consumers that allocate extra resources.
        void cleanup;
      },
      updateRuntime: (patch) => {
        const runtime = this.registry.get(workflowId, nodeConfig.nodeId);
        if (!runtime) {
          return;
        }

        Object.assign(runtime, patch, { updatedAt: new Date().toISOString() });
        this.registry.register(workflowId, nodeConfig.nodeId, runtime);
      },
    };

    switch (nodeConfig.triggerMode) {
      case 'schedule':
        return startScheduleConsumer(context);

      case 'webhook':
        return this.startWebhookConsumer(context);

      case 'polling':
        return this.startPollingConsumer(context);

      default:
        throw new Error(`Unsupported trigger mode: ${nodeConfig.triggerMode}`);
    }
  }

  /**
   * Build a runtime handle object shared by live consumers.
   */
  private buildRuntimeHandle(
    workflowId: string,
    nodeConfig: TriggerNodeConfig,
    mode: TriggerMode,
    stopFn: () => Promise<void> | void,
    metadata: Record<string, unknown> = {},
  ): TriggerRuntimeHandle {
    const now = new Date().toISOString();

    return {
      workflowId,
      nodeId: nodeConfig.nodeId,
      triggerMode: mode,
      status: 'active',
      startedAt: now,
      updatedAt: now,
      metadata,
      stop: stopFn,
    };
  }

  /**
   * Build the normalized trigger event envelope used for manual and live runs.
   */
  private createNormalizedEvent(params: {
    workflowId: string;
    nodeConfig: TriggerNodeConfig;
    triggerMode: TriggerMode;
    sourceName: string;
    eventName: string;
    payload: unknown;
    runId?: string;
  }): NormalizedTriggerEvent {
    const timestamp = new Date().toISOString();
    const payload = this.normalizePayload(params.payload);
    const runId = params.runId ?? randomUUID();

    return {
      runId,
      workflowId: params.workflowId,
      triggerNodeId: params.nodeConfig.nodeId,
      triggerMode: params.triggerMode,
      timestamp,
      source: {
        type: params.triggerMode === 'manual' ? 'system' : params.triggerMode,
        name: params.sourceName,
        eventName: params.eventName,
      },
      event: payload,
      data: payload,
      output: {
        mode: params.nodeConfig.output.simplifyOutput ? 'simplified' : 'raw',
        summary: {
          triggerMode: params.triggerMode,
          label: params.nodeConfig.label ?? params.nodeConfig.nodeId,
        },
        records: [],
        raw: params.nodeConfig.output.includeRawData ? payload : null,
      },
      meta: {
        attempt: 1,
      },
    };
  }

  /**
   * Stop a runtime and persist the inactive state in the store.
   */
  private async closeRuntime(
    workflowId: string,
    nodeId: string,
    runtime: TriggerRuntimeHandle,
    reason: string,
  ): Promise<TriggerCloseResult> {
    const closedAt = new Date().toISOString();

    try {
      runtime.status = 'stopping';
      await runtime.stop();
      this.registry.remove(workflowId, nodeId);
      await this.store.markInactive(workflowId, nodeId, closedAt, reason);

      return {
        workflowId,
        nodeId,
        status: 'closed',
        closedAt,
        reason,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      this.logger.error('Failed to close trigger runtime', {
        workflowId,
        nodeId,
        reason,
        error: message,
      });

      return {
        workflowId,
        nodeId,
        status: 'failed',
        closedAt,
        reason,
        error: message,
      };
    }
  }

  /**
   * Normalize arbitrary payloads into plain JSON-compatible objects.
   */
  private normalizePayload(payload: unknown): Record<string, unknown> {
    if (payload === null || payload === undefined) {
      return {};
    }

    if (typeof payload !== 'object') {
      return { value: payload };
    }

    return JSON.parse(JSON.stringify(payload)) as Record<string, unknown>;
  }

  /**
   * Create a persistent store record for the trigger node.
   */
  private buildTriggerStoreRecord(nodeConfig: TriggerNodeConfig): TriggerStoreRecord {
    const now = new Date().toISOString();

    return {
      id: `${nodeConfig.workflowId}:${nodeConfig.nodeId}`,
      workflowId: nodeConfig.workflowId,
      nodeId: nodeConfig.nodeId,
      triggerMode: nodeConfig.triggerMode,
      status: 'restoring',
      nodeConfigSnapshot: nodeConfig,
      endpointPath: nodeConfig.core.webhookPath,
      cronExpression: nodeConfig.core.schedule,
      pollingInterval: nodeConfig.core.pollingInterval,
      configRef: nodeConfig.core.eventType,
      runtimeMetadata: {
        triggerMode: nodeConfig.triggerMode,
        simplifyOutput: nodeConfig.output.simplifyOutput,
        includeRawData: nodeConfig.output.includeRawData,
      },
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Normalize the trigger node config so the rest of the manager can rely on a stable shape.
   */
  private normalizeNodeConfig(workflowId: string, nodeConfig: TriggerNodeConfig): TriggerNodeConfig {
    return {
      ...nodeConfig,
      workflowId,
      nodeId: nodeConfig.nodeId,
      triggerMode: nodeConfig.triggerMode,
      credentials: {
        authMethod: nodeConfig.credentials?.authMethod ?? 'none',
        apiKey: nodeConfig.credentials?.apiKey ?? '',
        oauthProvider: nodeConfig.credentials?.oauthProvider ?? '',
        username: nodeConfig.credentials?.username ?? '',
        password: nodeConfig.credentials?.password ?? '',
        token: nodeConfig.credentials?.token ?? '',
        secretRef: nodeConfig.credentials?.secretRef,
        signingSecretRef: nodeConfig.credentials?.signingSecretRef,
      },
      core: {
        eventType: nodeConfig.core?.eventType ?? 'trigger_fired',
        schedule: nodeConfig.core?.schedule,
        webhookPath: nodeConfig.core?.webhookPath,
        pollingInterval: nodeConfig.core?.pollingInterval,
        filters: nodeConfig.core?.filters ?? {},
        dedupeKeyFields: nodeConfig.core?.dedupeKeyFields ?? [],
        checkpointKey: nodeConfig.core?.checkpointKey,
      },
      output: this.normalizeOutput(nodeConfig.output),
      advanced: {
        timeout: nodeConfig.advanced?.timeout ?? 30,
        retries: nodeConfig.advanced?.retries ?? 0,
        errorHandling: nodeConfig.advanced?.errorHandling ?? 'stop',
        testMode: nodeConfig.advanced?.testMode ?? false,
        customHeaders: nodeConfig.advanced?.customHeaders ?? {},
        queryParameters: nodeConfig.advanced?.queryParameters ?? {},
        body: nodeConfig.advanced?.body,
        deduplicate: nodeConfig.advanced?.deduplicate ?? true,
        retryBackoffMs: nodeConfig.advanced?.retryBackoffMs ?? 1000,
      },
      enabled: nodeConfig.enabled ?? true,
      configVersion: nodeConfig.configVersion ?? 1,
    };
  }

  /**
   * Fill in any missing output settings.
   */
  private normalizeOutput(output?: Partial<TriggerOutputConfig>): TriggerOutputConfig {
    return {
      simplifyOutput: output?.simplifyOutput ?? true,
      includeRawData: output?.includeRawData ?? false,
      maxItems: output?.maxItems ?? 100,
      outputSchema: output?.outputSchema ?? {
        type: 'object',
        description: 'Trigger output schema',
        properties: {},
        required: [],
        example: {},
      },
    };
  }

  /**
   * Resolve the workflow definition if it is embedded in the trigger config.
   */
  private resolveWorkflowDefinition(nodeConfig: TriggerNodeConfig): WorkflowDefinition | undefined {
    return nodeConfig.workflowDefinition;
  }

  /**
   * Create a fallback workflow definition when only a trigger payload is available.
   */
  private createFallbackWorkflowDefinition(nodeConfig: TriggerNodeConfig): WorkflowDefinition {
    return {
      workflow: {
        name: nodeConfig.label ?? 'Trigger Workflow',
        description: nodeConfig.description ?? 'Fallback workflow definition',
      },
      nodes: [],
      edges: [],
    };
  }

  /**
   * Create a fallback node config for cases where a stored record is missing.
   */
  private createFallbackNodeConfig(workflowId: string, nodeId: string): TriggerNodeConfig {
    return {
      workflowId,
      nodeId,
      triggerMode: 'manual',
      credentials: { authMethod: 'none' },
      core: { eventType: 'manual_execute' },
      output: this.normalizeOutput(),
      advanced: {
        timeout: 30,
        retries: 0,
        errorHandling: 'stop',
        testMode: false,
      },
    };
  }

  /**
   * Skeleton webhook consumer. This shows how the manager branches by trigger mode.
   */
  private async startWebhookConsumer(context: TriggerConsumerContext): Promise<TriggerRuntimeHandle> {
    return startWebhookConsumer(context);
  }

  /**
   * Skeleton polling consumer. This shows how the manager branches by trigger mode.
   */
  private async startPollingConsumer(context: TriggerConsumerContext): Promise<TriggerRuntimeHandle> {
    return startPollingConsumer(context);
  }
}
