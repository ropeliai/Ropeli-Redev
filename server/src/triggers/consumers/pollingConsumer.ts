import { randomUUID } from 'node:crypto';
import { normalizePollingEvent } from '../TriggerEventNormalizer.js';
import type {
  NormalizedTriggerEvent,
  TriggerConsumerContext,
  TriggerRuntimeHandle,
} from '../types.js';

/**
 * Internal registry for active polling timers.
 *
 * The manager can register or stop polling consumers repeatedly without duplicating
 * intervals for the same workflow/node pair.
 */
const activePollingConsumers = new Map<string, {
  timer: NodeJS.Timeout;
  checkpoint?: string;
  stop: () => Promise<void> | void;
}>();

/**
 * Extended consumer context for polling mode.
 */
export interface PollingConsumerContext extends TriggerConsumerContext {
  /**
   * Optional fetcher that retrieves the next batch of source data.
   * If omitted, a generic synthetic poll result is emitted.
   */
  pollSource?: () => Promise<unknown>;
}

/**
 * Start a polling-based trigger consumer.
 *
 * This consumer executes on an interval, uses checkpointing to avoid reprocessing
 * older records, and emits a normalized workflow event on every new batch.
 */
export async function startConsumer(context: PollingConsumerContext): Promise<TriggerRuntimeHandle> {
  const { workflowId, nodeConfig, logger, emitEvent, registerCleanup, updateRuntime, now, pollSource } = context;
  const startedAt = (now?.() ?? new Date()).toISOString();
  const pollingIntervalSeconds = nodeConfig.core.pollingInterval ?? 60;
  const pollingIntervalMs = Math.max(pollingIntervalSeconds, 1) * 1000;
  const registryKey = buildRegistryKey(workflowId, nodeConfig.nodeId);

  if (activePollingConsumers.has(registryKey)) {
    logger.warn('Polling consumer already active; reusing existing interval', {
      workflowId,
      nodeId: nodeConfig.nodeId,
      pollingIntervalMs,
    });

    const existing = activePollingConsumers.get(registryKey);
    if (!existing) {
      throw new Error(`Polling registry inconsistency for ${registryKey}`);
    }

    return buildRuntimeHandle(workflowId, nodeConfig.nodeId, pollingIntervalMs, existing.stop, {
      pollingIntervalMs,
      startedAt,
      reused: true,
      checkpoint: existing.checkpoint,
    });
  }

  let checkpoint = nodeConfig.core.checkpointKey;
  let lastFiredAt: string | undefined;
  let timer: NodeJS.Timeout | null = null;
  let stopped = false;

  const pollAndEmit = async (): Promise<void> => {
    if (stopped) {
      return;
    }

    try {
      const rawData = await executePollSource(pollSource, nodeConfig, checkpoint);
      const nextCheckpoint = buildCheckpoint(rawData, checkpoint, nodeConfig);

      if (shouldSkipBatch(rawData, checkpoint, nextCheckpoint, nodeConfig)) {
        logger.debug?.('Polling batch skipped because checkpoint did not change', {
          workflowId,
          nodeId: nodeConfig.nodeId,
          checkpoint,
        });
        return;
      }

      const event: NormalizedTriggerEvent = normalizePollingEvent({
        workflowId,
        nodeConfig,
        triggerMode: 'polling',
        sourceName: nodeConfig.label ?? 'Polling Trigger',
        eventName: nodeConfig.core.eventType || 'poll_cycle',
        rawData,
        checkpoint: nextCheckpoint,
        dedupeKey: nextCheckpoint,
        timestamp: new Date().toISOString(),
        runId: randomUUID(),
        metadata: {
          pollingIntervalMs,
          nextCheckpoint,
        },
      });

      lastFiredAt = event.timestamp;
      checkpoint = nextCheckpoint;

      updateRuntime?.({
        lastFiredAt,
        lastCheckpoint: checkpoint,
        updatedAt: event.timestamp,
        pollingInterval: pollingIntervalMs,
        status: 'active',
      });

      await emitEvent(event);

      logger.info('Polling trigger emitted event', {
        workflowId,
        nodeId: nodeConfig.nodeId,
        checkpoint,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      logger.error('Polling trigger tick failed', {
        workflowId,
        nodeId: nodeConfig.nodeId,
        error: message,
      });

      if (nodeConfig.advanced.errorHandling === 'retry') {
        // The interval continues to run; the next tick will retry automatically.
        return;
      }

      if (nodeConfig.advanced.errorHandling === 'stop') {
        await stop();
      }
    }
  };

  const stop = async (): Promise<void> => {
    if (stopped) {
      return;
    }

    stopped = true;

    if (timer) {
      clearInterval(timer);
      timer = null;
    }

    activePollingConsumers.delete(registryKey);

    logger.info('Polling trigger consumer stopped', {
      workflowId,
      nodeId: nodeConfig.nodeId,
    });
  };

  timer = setInterval(() => {
    void pollAndEmit();
  }, pollingIntervalMs);

  activePollingConsumers.set(registryKey, {
    timer,
    checkpoint,
    stop,
  });

  registerCleanup(async () => {
    await stop();
  });

  // Emit once immediately in test mode so the editor can verify the source shape.
  if (nodeConfig.advanced.testMode) {
    await pollAndEmit();
  }

  logger.info('Polling trigger consumer started', {
    workflowId,
    nodeId: nodeConfig.nodeId,
    pollingIntervalMs,
    checkpoint,
  });

  return buildRuntimeHandle(workflowId, nodeConfig.nodeId, pollingIntervalMs, stop, {
    pollingIntervalMs,
    startedAt,
    checkpoint,
  });
}

/**
 * Stop and remove a polling consumer by workflow and node.
 */
export async function closeFunction(workflowId: string, nodeId: string): Promise<void> {
  const registryKey = buildRegistryKey(workflowId, nodeId);
  const consumer = activePollingConsumers.get(registryKey);

  if (!consumer) {
    return;
  }

  await consumer.stop();
}

/**
 * Resolve the next polling batch from the source or generate a safe synthetic payload.
 */
async function executePollSource(
  pollSource: (() => Promise<unknown>) | undefined,
  nodeConfig: PollingConsumerContext['nodeConfig'],
  checkpoint?: string,
): Promise<unknown> {
  if (pollSource) {
    return pollSource();
  }

  // Generic synthetic payload used until a real poll source is wired in.
  return {
    checkpoint,
    items: [
      {
        id: randomUUID(),
        createdAt: new Date().toISOString(),
        label: nodeConfig.label ?? 'Polling Item',
        status: 'new',
      },
    ],
    meta: {
      source: nodeConfig.core.eventType,
      pollingInterval: nodeConfig.core.pollingInterval,
      filters: nodeConfig.core.filters ?? {},
    },
  };
}

/**
 * Build the next checkpoint string from a raw batch.
 */
function buildCheckpoint(rawData: unknown, previousCheckpoint: string | undefined, nodeConfig: PollingConsumerContext['nodeConfig']): string {
  const rawObject = normalizePlainObject(rawData);
  const nextCheckpointSource =
    rawObject.checkpoint ??
    rawObject.cursor ??
    rawObject.nextCursor ??
    rawObject.updatedAt ??
    rawObject.id ??
    JSON.stringify(rawObject).slice(0, 128);

  if (!nextCheckpointSource) {
    return previousCheckpoint ?? `${nodeConfig.workflowId}:${nodeConfig.nodeId}:initial`;
  }

  return String(nextCheckpointSource);
}

/**
 * Decide whether the current batch should be skipped because it matches the last checkpoint.
 */
function shouldSkipBatch(
  rawData: unknown,
  previousCheckpoint: string | undefined,
  nextCheckpoint: string,
  nodeConfig: PollingConsumerContext['nodeConfig'],
): boolean {
  if (nodeConfig.advanced.deduplicate === false) {
    return false;
  }

  if (!previousCheckpoint) {
    return false;
  }

  if (previousCheckpoint !== nextCheckpoint) {
    return false;
  }

  const normalized = normalizePlainObject(rawData);
  return JSON.stringify(normalized).length > 0;
}

/**
 * Build a runtime handle for the polling consumer.
 */
function buildRuntimeHandle(
  workflowId: string,
  nodeId: string,
  pollingIntervalMs: number,
  stop: () => Promise<void> | void,
  metadata: Record<string, unknown>,
): TriggerRuntimeHandle {
  const now = new Date().toISOString();

  return {
    workflowId,
    nodeId,
    triggerMode: 'polling',
    status: 'active',
    startedAt: now,
    updatedAt: now,
    pollingInterval: pollingIntervalMs,
    metadata,
    stop,
  };
}

/**
 * Build a stable registry key for the polling consumer.
 */
function buildRegistryKey(workflowId: string, nodeId: string): string {
  return `${workflowId}:${nodeId}`;
}

/**
 * Normalize arbitrary data into a JSON-friendly object.
 */
function normalizePlainObject(value: unknown): Record<string, unknown> {
  if (value === null || value === undefined) {
    return {};
  }

  if (typeof value !== 'object') {
    return { value };
  }

  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}
