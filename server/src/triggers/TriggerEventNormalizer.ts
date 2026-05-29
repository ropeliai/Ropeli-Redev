import { randomUUID } from 'node:crypto';
import type {
  NormalizedTriggerEvent,
  TriggerMode,
  TriggerNodeConfig,
} from './types.js';

/**
 * Input shape used by the trigger normalizer.
 *
 * Consumers can provide source-specific raw data and let the normalizer convert it
 * into the stable event structure expected by the workflow runner.
 */
export interface TriggerNormalizationInput {
  workflowId: string;
  nodeConfig: TriggerNodeConfig;
  triggerMode: TriggerMode;
  sourceName?: string;
  eventName?: string;
  runId?: string;
  timestamp?: string;
  rawData?: unknown;
  body?: unknown;
  headers?: Record<string, string>;
  query?: Record<string, unknown>;
  params?: Record<string, string>;
  metadata?: Record<string, unknown>;
  checkpoint?: string;
  requestId?: string;
  jobId?: string;
  dedupeKey?: string;
}

/**
 * Convert a raw schedule tick into the normalized trigger event shape.
 */
export function normalizeScheduleEvent(input: TriggerNormalizationInput): NormalizedTriggerEvent {
  return normalizeTriggerEvent({
    ...input,
    sourceName: input.sourceName ?? input.nodeConfig.label ?? 'Scheduled Trigger',
    eventName: input.eventName ?? input.nodeConfig.core.eventType ?? 'scheduled_tick',
    rawData: input.rawData ?? {
      triggerMode: 'schedule',
      schedule: input.nodeConfig.core.schedule,
    },
  });
}

/**
 * Convert a raw webhook request into the normalized trigger event shape.
 */
export function normalizeWebhookEvent(input: TriggerNormalizationInput): NormalizedTriggerEvent {
  return normalizeTriggerEvent({
    ...input,
    sourceName: input.sourceName ?? input.nodeConfig.label ?? 'Webhook Trigger',
    eventName: input.eventName ?? input.nodeConfig.core.eventType ?? 'webhook_received',
    rawData: input.rawData ?? {
      body: input.body ?? {},
      headers: input.headers ?? {},
      query: input.query ?? {},
      params: input.params ?? {},
    },
  });
}

/**
 * Convert a raw polling batch into the normalized trigger event shape.
 */
export function normalizePollingEvent(input: TriggerNormalizationInput): NormalizedTriggerEvent {
  return normalizeTriggerEvent({
    ...input,
    sourceName: input.sourceName ?? input.nodeConfig.label ?? 'Polling Trigger',
    eventName: input.eventName ?? input.nodeConfig.core.eventType ?? 'poll_cycle',
    rawData: input.rawData ?? {
      triggerMode: 'polling',
      checkpoint: input.checkpoint,
    },
  });
}

/**
 * Shared trigger normalizer that produces the final workflow-safe payload.
 */
export function normalizeTriggerEvent(input: TriggerNormalizationInput): NormalizedTriggerEvent {
  const timestamp = input.timestamp ?? new Date().toISOString();
  const runId = input.runId ?? randomUUID();
  const rawPayload = normalizePlainObject(input.rawData ?? input.body ?? {});
  const shouldIncludeRawData = input.nodeConfig.output.includeRawData;
  const shouldSimplifyOutput = input.nodeConfig.output.simplifyOutput;
  const modeLabel = buildModeLabel(input.triggerMode);

  return {
    runId,
    workflowId: input.workflowId,
    triggerNodeId: input.nodeConfig.nodeId,
    triggerMode: input.triggerMode,
    timestamp,
    source: {
      type: input.triggerMode === 'manual' ? 'system' : input.triggerMode,
      name: input.sourceName ?? input.nodeConfig.label ?? `${modeLabel} Trigger`,
      eventName: input.eventName ?? input.nodeConfig.core.eventType ?? `${input.triggerMode}_fired`,
      id: input.metadata?.sourceId as string | undefined,
    },
    event: buildEventPayload(input, rawPayload),
    data: buildEventPayload(input, rawPayload),
    output: buildOutputPayload(input, rawPayload, timestamp),
    meta: {
      requestId: input.requestId,
      jobId: input.jobId,
      attempt: 1,
      dedupeKey: input.dedupeKey ?? input.metadata?.dedupeKey as string | undefined,
      checkpoint: input.checkpoint,
      raw: shouldIncludeRawData ? rawPayload : undefined,
      triggerMode: input.triggerMode,
      simplifyOutput: shouldSimplifyOutput,
      outputMode: shouldSimplifyOutput ? 'simplified' : 'raw',
      ...normalizePlainObject(input.metadata),
    },
  };
}

/**
 * Shape the workflow event payload so it stays predictable across all trigger modes.
 */
function buildEventPayload(input: TriggerNormalizationInput, rawPayload: Record<string, unknown>): Record<string, unknown> {
  switch (input.triggerMode) {
    case 'schedule':
      return {
        triggerMode: 'schedule',
        schedule: input.nodeConfig.core.schedule,
        eventType: input.nodeConfig.core.eventType,
        source: 'schedule',
        payload: rawPayload,
      };

    case 'webhook':
      return {
        triggerMode: 'webhook',
        body: normalizePlainObject(input.body ?? rawPayload.body ?? rawPayload),
        headers: normalizePlainObject(input.headers ?? rawPayload.headers ?? {}),
        query: normalizePlainObject(input.query ?? rawPayload.query ?? {}),
        params: normalizePlainObject(input.params ?? rawPayload.params ?? {}),
        eventType: input.nodeConfig.core.eventType,
        source: 'webhook',
      };

    case 'polling':
      return {
        triggerMode: 'polling',
        checkpoint: input.checkpoint,
        eventType: input.nodeConfig.core.eventType,
        source: 'polling',
        payload: rawPayload,
      };

    case 'manual':
    default:
      return {
        triggerMode: 'manual',
        eventType: input.nodeConfig.core.eventType,
        source: 'manual',
        payload: rawPayload,
      };
  }
}

/**
 * Shape the final output block that downstream nodes will consume.
 */
function buildOutputPayload(
  input: TriggerNormalizationInput,
  rawPayload: Record<string, unknown>,
  timestamp: string,
): Record<string, unknown> {
  const records = extractRecords(rawPayload, input.nodeConfig.output.maxItems);
  const summary = {
    triggerMode: input.triggerMode,
    label: input.nodeConfig.label ?? input.nodeConfig.nodeId,
    eventName: input.eventName ?? input.nodeConfig.core.eventType,
    timestamp,
  };

  const output: Record<string, unknown> = {
    mode: input.nodeConfig.output.simplifyOutput ? 'simplified' : 'raw',
    summary,
    records,
    totals: summarizeRecords(records),
    topProducts: extractTopProducts(records),
  };

  if (input.nodeConfig.output.includeRawData) {
    output.raw = rawPayload;
  }

  if (!input.nodeConfig.output.simplifyOutput) {
    output.raw = rawPayload;
  }

  return output;
}

/**
 * Convert arrays or single objects into a bounded list of record items.
 */
function extractRecords(rawPayload: Record<string, unknown>, maxItems: number): Array<Record<string, unknown>> {
  const items = rawPayload.items;
  const records = Array.isArray(items)
    ? items
    : Array.isArray(rawPayload.records)
      ? rawPayload.records
      : Array.isArray(rawPayload.data)
        ? rawPayload.data
        : rawPayload ? [rawPayload] : [];

  return records.slice(0, Math.max(maxItems, 1)).map((record) => normalizePlainObject(record));
}

/**
 * Generate simple totals from the record list.
 */
function summarizeRecords(records: Array<Record<string, unknown>>): Record<string, unknown> {
  const totals = {
    recordCount: records.length,
    numericFieldCount: 0,
  };

  for (const record of records) {
    for (const value of Object.values(record)) {
      if (typeof value === 'number') {
        totals.numericFieldCount += 1;
      }
    }
  }

  return totals;
}

/**
 * Extract a small set of top product summaries when the record list contains sales-like items.
 */
function extractTopProducts(records: Array<Record<string, unknown>>): Array<Record<string, unknown>> {
  const products: Array<Record<string, unknown>> = [];

  for (const record of records) {
    const items = Array.isArray(record.items) ? record.items : [];
    for (const item of items) {
      if (typeof item === 'object' && item !== null) {
        products.push(normalizePlainObject(item));
      }
    }
  }

  return products.slice(0, 5);
}

/**
 * Deep clone plain objects to remove non-serializable values before execution.
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

/**
 * Build a human-readable label for the trigger mode.
 */
function buildModeLabel(mode: TriggerMode): string {
  switch (mode) {
    case 'schedule':
      return 'Scheduled';
    case 'webhook':
      return 'Webhook';
    case 'polling':
      return 'Polling';
    case 'manual':
    default:
      return 'Manual';
  }
}
