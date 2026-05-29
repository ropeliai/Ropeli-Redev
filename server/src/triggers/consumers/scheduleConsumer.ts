import cron from 'node-cron';
import type {
  NormalizedTriggerEvent,
  TriggerConsumerContext,
  TriggerRuntimeHandle,
} from '../types.js';

/**
 * Start a schedule-based trigger consumer.
 *
 * This is the concrete example consumer for the runtime. It validates the cron
 * expression, registers a cron task, and emits a normalized event on each tick.
 */
export async function startConsumer(context: TriggerConsumerContext): Promise<TriggerRuntimeHandle> {
  const { workflowId, nodeConfig, logger, emitEvent, registerCleanup, updateRuntime, now } = context;
  const startedAt = (now?.() ?? new Date()).toISOString();
  const cronExpression = nodeConfig.core.schedule;

  if (!cronExpression) {
    throw new Error(`Missing cron schedule for trigger ${nodeConfig.nodeId} in workflow ${workflowId}`);
  }

  if (!cron.validate(cronExpression)) {
    throw new Error(`Invalid cron expression "${cronExpression}" for trigger ${nodeConfig.nodeId}`);
  }

  let lastFiredAt: string | undefined;
  let task: cron.ScheduledTask | null = null;

  const handle: TriggerRuntimeHandle = {
    workflowId,
    nodeId: nodeConfig.nodeId,
    triggerMode: 'schedule',
    status: 'starting',
    startedAt,
    updatedAt: startedAt,
    cronExpression,
    stop: async () => {
      if (!task) {
        return;
      }

      logger.info('Stopping schedule trigger consumer', {
        workflowId,
        nodeId: nodeConfig.nodeId,
      });

      task.stop();
      task.destroy();
      task = null;
    },
  };

  const emitScheduledEvent = async (): Promise<void> => {
    const timestamp = new Date().toISOString();
    lastFiredAt = timestamp;

    const event: NormalizedTriggerEvent = {
      runId: `run_${workflowId}_${nodeConfig.nodeId}_${Date.now()}`,
      workflowId,
      triggerNodeId: nodeConfig.nodeId,
      triggerMode: 'schedule',
      timestamp,
      source: {
        type: 'schedule',
        name: nodeConfig.label ?? 'Scheduled Trigger',
        eventName: nodeConfig.core.eventType || 'scheduled_tick',
      },
      event: {
        triggerMode: 'schedule',
        cronExpression,
        schedule: nodeConfig.core.schedule,
        nodeId: nodeConfig.nodeId,
      },
      data: {
        triggerMode: 'schedule',
        cronExpression,
        schedule: nodeConfig.core.schedule,
        nodeId: nodeConfig.nodeId,
      },
      output: {
        mode: nodeConfig.output.simplifyOutput ? 'simplified' : 'raw',
        summary: {
          reportName: nodeConfig.label ?? 'Scheduled Trigger',
          eventName: nodeConfig.core.eventType,
          timestamp,
        },
        records: [],
        raw: nodeConfig.output.includeRawData
          ? {
              cronExpression,
              schedule: nodeConfig.core.schedule,
            }
          : null,
      },
      meta: {
        attempt: 1,
      },
    };

    updateRuntime?.({
      lastFiredAt: timestamp,
      updatedAt: timestamp,
      status: 'active',
    });

    try {
      await emitEvent(event);
    } catch (error) {
      logger.error('Failed to emit scheduled trigger event', {
        workflowId,
        nodeId: nodeConfig.nodeId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  };

  task = cron.schedule(cronExpression, () => {
    void emitScheduledEvent();
  });

  registerCleanup(async () => {
    await handle.stop();
  });

  handle.status = 'active';
  handle.updatedAt = startedAt;
  handle.lastFiredAt = lastFiredAt;

  logger.info('Schedule trigger consumer started', {
    workflowId,
    nodeId: nodeConfig.nodeId,
    cronExpression,
  });

  return handle;
}
