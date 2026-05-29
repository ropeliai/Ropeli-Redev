import { Router, type NextFunction, type Request, type Response } from 'express';
import { dispatchWebhookRequest } from '../../triggers/consumers/webhookConsumer.js';
import type { TriggerLogger } from '../../triggers/types.js';

/**
 * Options accepted by the webhook dispatcher router.
 */
export interface WebhookRoutesOptions {
  logger: TriggerLogger;
  authMiddleware?: (req: Request, res: Response, next: NextFunction) => void | Promise<void>;
}

/**
 * Create the webhook dispatcher router.
 *
 * Mount this under `/api/webhooks` so dynamic webhook endpoints resolve as:
 * `/api/webhooks/:workflowId/:nodeId`.
 */
export function createWebhookRoutes(options: WebhookRoutesOptions) {
  const router = Router();
  const { logger, authMiddleware } = options;
  const maybeAuth = authMiddleware ?? ((_req: Request, _res: Response, next: NextFunction) => next());

  router.post('/:workflowId/:nodeId', maybeAuth, async (req: Request, res: Response) => {
    const { workflowId, nodeId } = req.params as { workflowId: string; nodeId: string };

    if (!workflowId || !nodeId) {
      return res.status(400).json({
        success: false,
        error: 'workflowId and nodeId are required.',
      });
    }

    try {
      const result = await dispatchWebhookRequest(workflowId, nodeId, {
        body: req.body,
        headers: normalizeHeaders(req.headers as Record<string, string | string[] | undefined>),
        query: req.query as Record<string, unknown>,
        params: req.params,
        method: req.method,
        path: req.path,
        ip: req.ip,
        raw: req.body,
        requestId: extractRequestId(req.headers as Record<string, string | string[] | undefined>),
      });

      return res.status(result.statusCode).json({
        success: result.ok,
        message: result.message,
        error: result.error,
        meta: {
          workflowId,
          nodeId,
          statusCode: result.statusCode,
          eventId: result.eventId,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      logger.error('Webhook route dispatch failed', {
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
        },
      });
    }
  });

  return router;
}

function normalizeHeaders(headers: Record<string, string | string[] | undefined>): Record<string, string> {
  const normalized: Record<string, string> = {};

  for (const [key, value] of Object.entries(headers)) {
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

function extractRequestId(headers: Record<string, string | string[] | undefined>): string | undefined {
  const requestId = headers['x-request-id'] || headers['x-correlation-id'];

  if (Array.isArray(requestId)) {
    return requestId[0];
  }

  return requestId;
}