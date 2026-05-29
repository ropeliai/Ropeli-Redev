import assert from 'node:assert/strict';
import { TriggerManager } from '../src/triggers/TriggerManager.ts';
import { dispatchWebhookRequest } from '../src/triggers/consumers/webhookConsumer.ts';

function createLogger() {
  return {
    info() {},
    warn() {},
    error() {},
    debug() {},
  };
}

function createMemoryStore() {
  const records = new Map();

  return {
    async upsert(record) {
      records.set(`${record.workflowId}:${record.nodeId}`, record);
      return record;
    },
    async getByWorkflowAndNode(workflowId, nodeId) {
      return records.get(`${workflowId}:${nodeId}`) || null;
    },
    async listActive() {
      return Array.from(records.values()).filter((record) => record.status === 'active');
    },
    async markInactive(workflowId, nodeId, disabledAt, reason) {
      const key = `${workflowId}:${nodeId}`;
      const record = records.get(key);
      if (!record) {
        return;
      }

      records.set(key, {
        ...record,
        status: 'inactive',
        disabledAt,
        updatedAt: new Date().toISOString(),
        runtimeMetadata: {
          ...(record.runtimeMetadata || {}),
          reason,
        },
      });
    },
  };
}

function createWorkflowExecutor() {
  const calls = [];

  return {
    calls,
    async executeWorkflow(workflow, context = {}) {
      calls.push({ workflow, context });
      return {
        runId: context.triggerEvent?.runId || 'run_test',
        workflowId: context.triggerEvent?.workflowId || 'workflow_test',
        status: 'success',
        context,
        nodeResults: {},
        startedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
      };
    },
  };
}

function buildWorkflowDefinition(name = 'Smoke Workflow') {
  return {
    workflow: {
      name,
      description: 'Smoke test workflow definition',
    },
    nodes: [
      {
        id: 'trigger_1',
        type: 'trigger',
        label: 'Start',
        position: { x: 0, y: 0 },
        config: {},
        inputs: [],
        outputs: ['data'],
      },
      {
        id: 'output_1',
        type: 'output',
        label: 'End',
        position: { x: 200, y: 0 },
        config: {},
        inputs: ['data'],
        outputs: [],
      },
    ],
    edges: [
      {
        id: 'e1',
        source: 'trigger_1',
        target: 'output_1',
      },
    ],
  };
}

function buildTriggerConfig(overrides = {}) {
  return {
    workflowId: 'workflow_smoke',
    nodeId: 'trigger_1',
    label: 'Smoke Trigger',
    description: 'Smoke test trigger config',
    triggerMode: 'schedule',
    credentials: {
      authMethod: 'none',
      apiKey: '',
      oauthProvider: '',
      username: '',
      password: '',
      token: '',
    },
    core: {
      eventType: 'weekly_report',
      schedule: '0 9 * * 1',
      webhookPath: '/api/webhooks/workflow_smoke/trigger_1',
      pollingInterval: 15,
      filters: {},
    },
    output: {
      simplifyOutput: true,
      includeRawData: false,
      maxItems: 100,
      outputSchema: {
        type: 'object',
        description: 'Smoke output schema',
        properties: {},
        required: [],
        example: {},
      },
    },
    advanced: {
      timeout: 30,
      retries: 0,
      errorHandling: 'stop',
      testMode: true,
    },
    workflowDefinition: buildWorkflowDefinition(),
    enabled: true,
    configVersion: 1,
    ...overrides,
  };
}

async function run() {
  const store = createMemoryStore();
  const executor = createWorkflowExecutor();
  const logger = createLogger();
  const manager = new TriggerManager(store, executor, logger);

  console.log('[smoke] manual execute');
  const manualActivate = await manager.activateTrigger('workflow_smoke', buildTriggerConfig());
  assert.equal(manualActivate.status, 'active');

  const manualResult = await manager.manualExecuteTrigger('workflow_smoke', 'trigger_1', {
    hello: 'world',
  });
  assert.equal(manualResult.status, 'success');
  assert.equal(manualResult.event.triggerMode, 'manual');
  assert.equal(executor.calls.length >= 1, true);

  console.log('[smoke] schedule activate');
  const scheduleActivate = await manager.activateTrigger(
    'workflow_schedule',
    buildTriggerConfig({
      workflowId: 'workflow_schedule',
      nodeId: 'trigger_schedule',
      triggerMode: 'schedule',
      core: {
        eventType: 'weekly_report',
        schedule: '0 9 * * 1',
        webhookPath: '/api/webhooks/workflow_schedule/trigger_schedule',
        pollingInterval: 15,
        filters: {},
      },
      workflowDefinition: buildWorkflowDefinition('Schedule Smoke Workflow'),
    }),
  );
  assert.equal(scheduleActivate.status, 'active');
  assert.equal(scheduleActivate.runtime?.triggerMode, 'schedule');

  console.log('[smoke] webhook dispatch');
  const webhookActivate = await manager.activateTrigger(
    'workflow_webhook',
    buildTriggerConfig({
      workflowId: 'workflow_webhook',
      nodeId: 'trigger_webhook',
      triggerMode: 'webhook',
      credentials: {
        authMethod: 'token',
        token: 'secret-123',
      },
      core: {
        eventType: 'webhook_received',
        schedule: '0 9 * * 1',
        webhookPath: '/api/webhooks/workflow_webhook/trigger_webhook',
        pollingInterval: 15,
        filters: {},
      },
      workflowDefinition: buildWorkflowDefinition('Webhook Smoke Workflow'),
    }),
  );
  assert.equal(webhookActivate.status, 'active');

  const webhookResult = await dispatchWebhookRequest('workflow_webhook', 'trigger_webhook', {
    body: { message: 'hello' },
    headers: {
      'x-webhook-secret': 'secret-123',
      'x-request-id': 'req-smoke-1',
    },
    query: { source: 'smoke' },
    params: { workflowId: 'workflow_webhook', nodeId: 'trigger_webhook' },
    requestId: 'req-smoke-1',
  });

  assert.equal(webhookResult.ok, true);
  assert.equal(webhookResult.statusCode, 200);
  assert.ok(webhookResult.eventId);

  await manager.deactivateTrigger('workflow_smoke', 'trigger_1');
  await manager.deactivateTrigger('workflow_schedule', 'trigger_schedule');
  await manager.deactivateTrigger('workflow_webhook', 'trigger_webhook');

  console.log('[smoke] all checks passed');
}

run().catch((error) => {
  console.error('[smoke] failed:', error);
  process.exitCode = 1;
});
