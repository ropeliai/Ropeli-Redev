import { Router, type NextFunction, type Request, type Response } from 'express';
import type { TriggerLogger, TriggerNodeConfig, TriggerRuntimeHandle, TriggerActivationResult, TriggerCloseResult, TriggerManualExecutionResult } from '../../triggers/types.js';
import { TriggerManager } from '../../triggers/TriggerManager.js';

/**
 * Request type used by the trigger route handlers.
 */
type TriggerRouteParams = {
  workflowId: string;
  nodeId: string;
};

/**
 * Options accepted by the trigger route factory.
 *
 * The routes are intentionally dependency-injected so the server can wire the
 * manager, logger, and auth middleware from the application bootstrap layer.
 */
export interface TriggerRoutesOptions {
  triggerManager: TriggerManager;
  logger: TriggerLogger;
  /**
   * Optional auth middleware. If not provided, the routes remain publicly callable
   * at the framework level and should be protected by outer middleware in the app.
   */
  authMiddleware?: (req: Request, res: Response, next: NextFunction) => void | Promise<void>;
  /**
   * Optional request validator. This can be replaced by zod, joi, express-validator,
   * or any other validation layer.
   */
  validateTriggerConfig?: (payload: unknown) => payload is Partial<TriggerNodeConfig>;
}

/**
 * Create the trigger lifecycle router.
 *
 * Endpoints:
 * - POST /api/workflows/:workflowId/triggers/:nodeId/activate
 * - POST /api/workflows/:workflowId/triggers/:nodeId/deactivate
 * - POST /api/workflows/:workflowId/triggers/:nodeId/manual-execute
 * - GET  /api/workflows/:workflowId/triggers/status
 */
export function createTriggerRoutes(options: TriggerRoutesOptions) {
  const router = Router();
  const { triggerManager, logger, authMiddleware, validateTriggerConfig } = options;
  const maybeAuth = authMiddleware ?? ((_req: Request, _res: Response, next: NextFunction) => next());

  router.post('/:workflowId/triggers/:nodeId/activate', maybeAuth, async (req: Request, res: Response) => {
    const { workflowId, nodeId } = req.params as TriggerRouteParams;
    const payload = req.body as Partial<TriggerNodeConfig> | undefined;

    if (!workflowId || !nodeId) {
      return res.status(400).json({
        success: false,
        error: 'workflowId and nodeId are required.',
      });
    }

    if (!payload) {
      return res.status(400).json({
        success: false,
        error: 'Trigger configuration payload is required.',
      });
    }

    if (validateTriggerConfig && !validateTriggerConfig(payload)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid trigger configuration payload.',
      });
    }

    try {
      const triggerConfig = normalizeTriggerNodeConfig(workflowId, nodeId, payload);
      const result = await triggerManager.activateTrigger(workflowId, triggerConfig);

      return respondWithActivation(res, result);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('Trigger activation route failed', {
        workflowId,
        nodeId,
        error: message,
      });

      return res.status(500).json({
        success: false,
        error: message,
        meta: {
          workflowId,
          nodeId,
          operation: 'activate',
        },
      });
    }
  });

  router.post('/:workflowId/triggers/:nodeId/deactivate', maybeAuth, async (req: Request, res: Response) => {
    const { workflowId, nodeId } = req.params as TriggerRouteParams;

    if (!workflowId || !nodeId) {
      return res.status(400).json({
        success: false,
        error: 'workflowId and nodeId are required.',
      });
    }

    try {
      const result = await triggerManager.deactivateTrigger(workflowId, nodeId);
      return respondWithClose(res, result);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('Trigger deactivation route failed', {
        workflowId,
        nodeId,
        error: message,
      });

      return res.status(500).json({
        success: false,
        error: message,
        meta: {
          workflowId,
          nodeId,
          operation: 'deactivate',
        },
      });
    }
  });

  router.post('/:workflowId/triggers/:nodeId/manual-execute', maybeAuth, async (req: Request, res: Response) => {
    const { workflowId, nodeId } = req.params as TriggerRouteParams;
    const manualInput = req.body?.manualInput ?? req.body;

    if (!workflowId || !nodeId) {
      return res.status(400).json({
        success: false,
        error: 'workflowId and nodeId are required.',
      });
    }

    try {
      const result = await triggerManager.manualExecuteTrigger(workflowId, nodeId, manualInput);
      return respondWithManualExecution(res, result);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('Trigger manual execution route failed', {
        workflowId,
        nodeId,
        error: message,
      });

      return res.status(500).json({
        success: false,
        error: message,
        meta: {
          workflowId,
          nodeId,
          operation: 'manual-execute',
        },
      });
    }
  });

  router.get('/:workflowId/triggers/status', maybeAuth, async (req: Request, res: Response) => {
    const { workflowId } = req.params as { workflowId: string };
    const nodeId = typeof req.query.nodeId === 'string' ? req.query.nodeId : undefined;

    console.log('[Status Request] Received workflowId:', req.params.workflowId, 'nodeId:', nodeId);

    logger.info('Trigger status request received', {
      workflowId,
      nodeId,
      originalUrl: req.originalUrl,
      method: req.method,
    });

    if (!workflowId) {
      return res.status(200).json({
        success: true,
        data: {
          workflowId,
          nodeId,
          status: 'inactive',
          lastFiredAt: null,
          nextRunAt: null,
          activeTrigger: null,
          activeTriggers: [],
        },
      });
    }

    try {
      const status = triggerManager.getTriggerStatus(workflowId, nodeId);

      return res.status(200).json({
        success: true,
        data: {
          workflowId: status.workflowId,
          nodeId: status.nodeId,
          status: status.status,
          lastFiredAt: status.lastFiredAt,
          nextRunAt: status.nextRunAt,
          activeTrigger: serializeRuntimeHandle(status.activeTrigger),
          activeTriggers: status.activeTriggers.map((trigger) => ({
            workflowId: trigger.workflowId,
            nodeId: trigger.nodeId,
            triggerMode: trigger.triggerMode,
            status: trigger.status,
            startedAt: trigger.startedAt,
            updatedAt: trigger.updatedAt,
            lastFiredAt: trigger.lastFiredAt,
            nextRunAt: trigger.nextRunAt,
            endpoint: trigger.endpoint,
            cronExpression: trigger.cronExpression,
            pollingInterval: trigger.pollingInterval,
            lastCheckpoint: trigger.lastCheckpoint,
            metadata: trigger.metadata,
          })),
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('Trigger status route failed', {
        workflowId,
        nodeId,
        error: message,
      });

      return res.status(200).json({
        success: false,
        error: message,
        data: {
          workflowId,
          nodeId,
          status: 'inactive',
          lastFiredAt: null,
          nextRunAt: null,
          activeTrigger: null,
          activeTriggers: [],
        },
      });
    }
  });

  return router;
}

/**
 * Normalize a partial trigger config into the full shape expected by the manager.
 */
function normalizeTriggerNodeConfig(
  workflowId: string,
  nodeId: string,
  payload: Partial<TriggerNodeConfig>,
): TriggerNodeConfig {
  return {
    workflowId,
    nodeId,
    label: payload.label,
    description: payload.description,
    triggerMode: payload.triggerMode ?? 'schedule',
    credentials: {
      authMethod: payload.credentials?.authMethod ?? 'none',
      apiKey: payload.credentials?.apiKey ?? '',
      oauthProvider: payload.credentials?.oauthProvider ?? '',
      username: payload.credentials?.username ?? '',
      password: payload.credentials?.password ?? '',
      token: payload.credentials?.token ?? '',
      secretRef: payload.credentials?.secretRef,
      signingSecretRef: payload.credentials?.signingSecretRef,
    },
    core: {
      eventType: payload.core?.eventType ?? 'trigger_fired',
      schedule: payload.core?.schedule,
      webhookPath: payload.core?.webhookPath,
      pollingInterval: payload.core?.pollingInterval,
      filters: payload.core?.filters ?? {},
      dedupeKeyFields: payload.core?.dedupeKeyFields ?? [],
      checkpointKey: payload.core?.checkpointKey,
    },
    output: {
      simplifyOutput: payload.output?.simplifyOutput ?? true,
      includeRawData: payload.output?.includeRawData ?? false,
      maxItems: payload.output?.maxItems ?? 100,
      outputSchema: payload.output?.outputSchema ?? {
        type: 'object',
        description: 'Trigger output schema',
        properties: {},
        required: [],
        example: {},
      },
    },
    advanced: {
      timeout: payload.advanced?.timeout ?? 30,
      retries: payload.advanced?.retries ?? 0,
      errorHandling: payload.advanced?.errorHandling ?? 'stop',
      testMode: payload.advanced?.testMode ?? false,
      customHeaders: payload.advanced?.customHeaders ?? {},
      queryParameters: payload.advanced?.queryParameters ?? {},
      body: payload.advanced?.body,
      deduplicate: payload.advanced?.deduplicate ?? true,
      retryBackoffMs: payload.advanced?.retryBackoffMs ?? 1000,
    },
    workflowDefinition: payload.workflowDefinition,
    enabled: payload.enabled ?? true,
    configVersion: payload.configVersion ?? 1,
  };
}

/**
 * Format activation responses consistently.
 */
function respondWithActivation(res: Response, result: TriggerActivationResult) {
  if (result.status === 'failed') {
    return res.status(500).json({
      success: false,
      error: result.error ?? 'Trigger activation failed.',
      meta: {
        workflowId: result.workflowId,
        nodeId: result.nodeId,
        triggerMode: result.triggerMode,
      },
    });
  }

  return res.status(200).json({
    success: true,
    message: 'Trigger activated successfully.',
    data: {
      workflowId: result.workflowId,
      nodeId: result.nodeId,
      triggerMode: result.triggerMode,
      runtime: serializeRuntimeHandle(result.runtime),
      record: result.record,
    },
  });
}

/**
 * Format deactivation responses consistently.
 */
function respondWithClose(res: Response, result: TriggerCloseResult) {
  if (result.status === 'failed') {
    return res.status(500).json({
      success: false,
      error: result.error ?? 'Trigger deactivation failed.',
      meta: {
        workflowId: result.workflowId,
        nodeId: result.nodeId,
        reason: result.reason,
      },
    });
  }

  return res.status(200).json({
    success: true,
    message: 'Trigger deactivated successfully.',
    data: result,
  });
}

/**
 * Format manual execution responses consistently.
 */
function respondWithManualExecution(res: Response, result: TriggerManualExecutionResult) {
  if (result.status === 'failed') {
    return res.status(500).json({
      success: false,
      error: result.error ?? 'Manual trigger execution failed.',
      meta: {
        workflowId: result.workflowId,
        nodeId: result.nodeId,
        runId: result.runId,
      },
    });
  }

  return res.status(200).json({
    success: true,
    message: 'Trigger executed successfully.',
    data: result,
  });
}

/**
 * Keep the runtime handle response small and serializable.
 */
function serializeRuntimeHandle(runtime?: TriggerRuntimeHandle) {
  if (!runtime) {
    return null;
  }

  return {
    workflowId: runtime.workflowId,
    nodeId: runtime.nodeId,
    triggerMode: runtime.triggerMode,
    status: runtime.status,
    startedAt: runtime.startedAt,
    updatedAt: runtime.updatedAt,
    lastFiredAt: runtime.lastFiredAt,
    nextRunAt: runtime.nextRunAt,
    endpoint: runtime.endpoint,
    cronExpression: runtime.cronExpression,
    pollingInterval: runtime.pollingInterval,
    lastCheckpoint: runtime.lastCheckpoint,
    metadata: runtime.metadata,
  };
}
