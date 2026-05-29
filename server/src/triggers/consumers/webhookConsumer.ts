import { randomUUID } from 'node:crypto';
import type {
  NormalizedTriggerEvent,
  TriggerConsumerContext,
  TriggerLogger,
  TriggerRuntimeHandle,
} from '../types.js';

/**
 * Internal registry for active webhook handlers.
 *
 * The actual Express route can remain a thin dispatcher that calls into this map.
 * This keeps route registration idempotent and makes cleanup deterministic.
 */
type WebhookHandler = {
  workflowId: string;
  nodeId: string;
  webhookPath: string;
  secret?: string;
  handleRequest: (request: WebhookRequestLike) => Promise<WebhookDispatchResult>;
  stop: () => Promise<void> | void;
};

const activeWebhookHandlers = new Map<string, WebhookHandler>();

/**
 * Minimal request shape used by the webhook consumer.
 * The Express route can adapt `req` into this object before dispatching.
 */
export interface WebhookRequestLike {
  body?: unknown;
  headers?: Record<string, string | string[] | undefined>;
  query?: Record<string, unknown>;
  params?: Record<string, string>;
  method?: string;
  path?: string;
  ip?: string;
  raw?: unknown;
  requestId?: string;
}

/**
 * Result returned after a webhook request is accepted or rejected.
 */
export interface WebhookDispatchResult {
  ok: boolean;
  statusCode: number;
  message: string;
  eventId?: string;
  error?: string;
}

/**
 * Optional runtime dependencies for webhook registration.
 *
 * A route layer can provide a registrar/unregistrar pair to bind a live Express
 * endpoint. If not provided, the consumer still works through the internal registry
 * and can be wired by a dedicated route later.
 */
export interface WebhookRuntimeBindings {
  registerRoute?: (params: {
    workflowId: string;
    nodeId: string;
    path: string;
    handler: (request: WebhookRequestLike) => Promise<WebhookDispatchResult>;
  }) => void | Promise<void>;
  unregisterRoute?: (params: {
    workflowId: string;
    nodeId: string;
    path: string;
  }) => void | Promise<void>;
}

/**
 * Trigger consumer context extended with webhook-specific bindings.
 */
export interface WebhookConsumerContext extends TriggerConsumerContext {
  bindings?: WebhookRuntimeBindings;
}

/**
 * Start a webhook-based trigger consumer.
 *
 * This implementation registers a dynamic endpoint path and returns a runtime handle
 * that can unregister the route during cleanup. Incoming requests are normalized into
 * the common trigger event envelope before being passed to the workflow executor.
 */
export async function startConsumer(context: WebhookConsumerContext): Promise<TriggerRuntimeHandle> {
  const {
    workflowId,
    nodeConfig,
    logger,
    emitEvent,
    registerCleanup,
    updateRuntime,
    bindings,
    now,
  } = context;

  const startedAt = (now?.() ?? new Date()).toISOString();
  const webhookPath = nodeConfig.core.webhookPath || `/api/webhooks/${workflowId}/${nodeConfig.nodeId}`;
  const secret = resolveWebhookSecret(nodeConfig.credentials?.signingSecretRef, nodeConfig.credentials?.token, nodeConfig.credentials?.apiKey);
  const registryKey = buildRegistryKey(workflowId, nodeConfig.nodeId);

  if (!webhookPath) {
    throw new Error(`Missing webhook path for trigger ${nodeConfig.nodeId} in workflow ${workflowId}`);
  }

  if (activeWebhookHandlers.has(registryKey)) {
    logger.warn('Webhook consumer already active; reusing existing registration', {
      workflowId,
      nodeId: nodeConfig.nodeId,
      webhookPath,
    });

    const existing = activeWebhookHandlers.get(registryKey);
    if (!existing) {
      throw new Error(`Webhook registry inconsistency for ${registryKey}`);
    }

    return buildRuntimeHandle(workflowId, nodeConfig.nodeId, webhookPath, existing.stop, {
      webhookPath,
      startedAt,
      reused: true,
    });
  }

  const handleRequest = async (request: WebhookRequestLike): Promise<WebhookDispatchResult> => {
    try {
      const timestamp = new Date().toISOString();
      const requestHeaders = normalizeHeaders(request.headers);
      const requestQuery = normalizeObject(request.query);
      const requestParams = normalizeObject(request.params);
      const requestBody = normalizePayload(request.body);
      const requestId = request.requestId ?? requestHeaders['x-request-id'] ?? randomUUID();

      if (secret && !verifyWebhookSecret(requestHeaders, secret)) {
        logger.warn('Rejected webhook request due to invalid secret', {
          workflowId,
          nodeId: nodeConfig.nodeId,
          webhookPath,
          requestId,
        });

        return {
          ok: false,
          statusCode: 401,
          message: 'Unauthorized webhook request',
          error: 'Invalid webhook secret',
        };
      }

      const dedupeKey = buildDedupeKey(requestHeaders, requestBody, workflowId, nodeConfig.nodeId);
      const event: NormalizedTriggerEvent = {
        runId: randomUUID(),
        workflowId,
        triggerNodeId: nodeConfig.nodeId,
        triggerMode: 'webhook',
        timestamp,
        source: {
          type: 'webhook',
          name: nodeConfig.label ?? 'Webhook Trigger',
          eventName: nodeConfig.core.eventType || 'webhook_received',
        },
        event: {
          body: requestBody,
          headers: requestHeaders,
          query: requestQuery,
          params: requestParams,
        },
        data: {
          body: requestBody,
          headers: requestHeaders,
          query: requestQuery,
          params: requestParams,
        },
        output: {
          mode: nodeConfig.output.simplifyOutput ? 'simplified' : 'raw',
          summary: {
            reportName: nodeConfig.label ?? 'Webhook Trigger',
            eventName: nodeConfig.core.eventType || 'webhook_received',
            timestamp,
          },
          records: [],
          raw: nodeConfig.output.includeRawData
            ? {
                body: requestBody,
                headers: requestHeaders,
                query: requestQuery,
                params: requestParams,
              }
            : null,
        },
        meta: {
          requestId,
          attempt: 1,
          dedupeKey,
          raw: request.raw,
        },
      };

      updateRuntime?.({
        lastFiredAt: timestamp,
        updatedAt: timestamp,
        endpoint: webhookPath,
        status: 'active',
      });

      await emitEvent(event);

      logger.info('Webhook trigger request accepted', {
        workflowId,
        nodeId: nodeConfig.nodeId,
        webhookPath,
        requestId,
      });

      return {
        ok: true,
        statusCode: 200,
        message: 'Webhook accepted',
        eventId: event.runId,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      logger.error('Webhook trigger request failed', {
        workflowId,
        nodeId: nodeConfig.nodeId,
        webhookPath,
        error: message,
      });

      return {
        ok: false,
        statusCode: 500,
        message: 'Webhook processing failed',
        error: message,
      };
    }
  };

  const stop = async (): Promise<void> => {
    if (!activeWebhookHandlers.has(registryKey)) {
      return;
    }

    activeWebhookHandlers.delete(registryKey);

    if (bindings?.unregisterRoute) {
      await bindings.unregisterRoute({
        workflowId,
        nodeId: nodeConfig.nodeId,
        path: webhookPath,
      });
    }
  };

  const handler: WebhookHandler = {
    workflowId,
    nodeId: nodeConfig.nodeId,
    webhookPath,
    secret,
    handleRequest,
    stop,
  };

  activeWebhookHandlers.set(registryKey, handler);

  if (bindings?.registerRoute) {
    await bindings.registerRoute({
      workflowId,
      nodeId: nodeConfig.nodeId,
      path: webhookPath,
      handler: handleRequest,
    });
  }

  registerCleanup(async () => {
    await stop();
  });

  logger.info('Webhook trigger consumer started', {
    workflowId,
    nodeId: nodeConfig.nodeId,
    webhookPath,
  });

  return buildRuntimeHandle(workflowId, nodeConfig.nodeId, webhookPath, stop, {
    webhookPath,
    startedAt,
  });
}

/**
 * Dispatch an incoming webhook request to the matching active consumer.
 *
 * This function is meant to be called by the HTTP route layer.
 */
export async function dispatchWebhookRequest(
  workflowId: string,
  nodeId: string,
  request: WebhookRequestLike,
): Promise<WebhookDispatchResult> {
  const registryKey = buildRegistryKey(workflowId, nodeId);
  const handler = activeWebhookHandlers.get(registryKey);

  if (!handler) {
    return {
      ok: false,
      statusCode: 404,
      message: 'Webhook trigger not active',
      error: `No active webhook consumer found for ${registryKey}`,
    };
  }

  return handler.handleRequest(request);
}

/**
 * Stop and unregister a webhook consumer by workflow and node.
 */
export async function closeFunction(workflowId: string, nodeId: string): Promise<void> {
  const registryKey = buildRegistryKey(workflowId, nodeId);
  const handler = activeWebhookHandlers.get(registryKey);

  if (!handler) {
    return;
  }

  await handler.stop();
}

function buildRuntimeHandle(
  workflowId: string,
  nodeId: string,
  webhookPath: string,
  stop: () => Promise<void> | void,
  metadata: Record<string, unknown>,
): TriggerRuntimeHandle {
  const now = new Date().toISOString();

  return {
    workflowId,
    nodeId,
    triggerMode: 'webhook',
    status: 'active',
    startedAt: now,
    updatedAt: now,
    endpoint: webhookPath,
    metadata,
    stop,
  };
}

function buildRegistryKey(workflowId: string, nodeId: string): string {
  return `${workflowId}:${nodeId}`;
}

function resolveWebhookSecret(
  signingSecretRef?: string,
  token?: string,
  apiKey?: string,
): string | undefined {
  return signingSecretRef || token || apiKey || undefined;
}

function verifyWebhookSecret(headers: Record<string, string>, secret: string): boolean {
  const provided = headers['x-webhook-secret'] || headers['x-signature'] || headers.authorization;
  if (!provided) {
    return false;
  }

  return provided === secret || provided === `Bearer ${secret}`;
}

function normalizeHeaders(headers?: Record<string, string | string[] | undefined>): Record<string, string> {
  const normalized: Record<string, string> = {};

  for (const [key, value] of Object.entries(headers ?? {})) {
    if (Array.isArray(value)) {
      normalized[key.toLowerCase()] = value.join(',');
      continue;
    }

    if (typeof value === 'string') {
      normalized[key.toLowerCase()] = value;
    }
  }

  return normalized;
}

function normalizeObject(value: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!value || typeof value !== 'object') {
    return {};
  }

  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}

function normalizePayload(value: unknown): Record<string, unknown> {
  if (value === null || value === undefined) {
    return {};
  }

  if (typeof value !== 'object') {
    return { value };
  }

  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}

function buildDedupeKey(
  headers: Record<string, string>,
  payload: Record<string, unknown>,
  workflowId: string,
  nodeId: string,
): string {
  const requestId = headers['x-request-id'] || headers['idempotency-key'];
  if (requestId) {
    return requestId;
  }

  return `${workflowId}:${nodeId}:${JSON.stringify(payload).slice(0, 128)}`;
}
