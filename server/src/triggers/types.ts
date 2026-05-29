/**
 * Supported trigger modes for the runtime.
 */
export type TriggerMode = 'schedule' | 'webhook' | 'polling' | 'manual';

/**
 * Lifecycle status for a trigger runtime.
 */
export type TriggerRuntimeStatus = 'inactive' | 'starting' | 'active' | 'stopping' | 'failed';

/**
 * Supported error handling strategies for trigger execution.
 */
export type TriggerErrorHandling = 'stop' | 'continue' | 'retry';

/**
 * Standard logger contract used by the trigger subsystem.
 */
export interface TriggerLogger {
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
  debug?(message: string, meta?: Record<string, unknown>): void;
}

/**
 * Small workflow node representation used by trigger activation and manual execution.
 */
export interface WorkflowNodeDefinition {
  id: string;
  type: string;
  label?: string;
  description?: string;
  position?: { x: number; y: number };
  config?: Record<string, unknown>;
  inputs?: string[];
  outputs?: string[];
}

/**
 * Full workflow definition used by the trigger manager and workflow runner.
 */
export interface WorkflowDefinition {
  workflow?: {
    name?: string;
    description?: string;
  };
  nodes: WorkflowNodeDefinition[];
  edges: WorkflowEdgeDefinition[];
}

/**
 * Connection definition between workflow nodes.
 */
export interface WorkflowEdgeDefinition {
  id?: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  type?: string;
}

/**
 * Trigger credential settings stored in node configuration.
 * Secrets should be represented as references whenever possible.
 */
export interface TriggerCredentialsConfig {
  authMethod: 'none' | 'apiKey' | 'oauth' | 'basic' | 'token';
  apiKey?: string;
  oauthProvider?: string;
  username?: string;
  password?: string;
  token?: string;
  secretRef?: string;
  signingSecretRef?: string;
}

/**
 * Core trigger settings that define how the trigger source behaves.
 */
export interface TriggerCoreConfig {
  eventType: string;
  schedule?: string;
  webhookPath?: string;
  pollingInterval?: number;
  filters?: {
    folder?: string;
    keyword?: string;
    status?: string;
  };
  /**
   * Optional fields used for deduplication or checkpointing.
   */
  dedupeKeyFields?: string[];
  checkpointKey?: string;
}

/**
 * JSON schema that describes the trigger output shape.
 */
export interface TriggerOutputSchema {
  type: 'object';
  description?: string;
  properties?: Record<string, unknown>;
  required?: string[];
  example?: Record<string, unknown>;
}

/**
 * Settings that control output shaping for the trigger runtime.
 */
export interface TriggerOutputConfig {
  simplifyOutput: boolean;
  includeRawData: boolean;
  maxItems: number;
  outputSchema: TriggerOutputSchema;
}

/**
 * Advanced trigger settings for runtime behavior and diagnostics.
 */
export interface TriggerAdvancedConfig {
  timeout: number;
  retries: number;
  errorHandling: TriggerErrorHandling;
  testMode: boolean;
  customHeaders?: Record<string, string> | string;
  queryParameters?: Record<string, string> | string;
  body?: unknown;
  deduplicate?: boolean;
  retryBackoffMs?: number;
}

/**
 * Complete trigger node configuration persisted with the workflow.
 */
export interface TriggerNodeConfig {
  workflowId: string;
  nodeId: string;
  label?: string;
  description?: string;
  triggerMode: TriggerMode;
  credentials: TriggerCredentialsConfig;
  core: TriggerCoreConfig;
  output: TriggerOutputConfig;
  advanced: TriggerAdvancedConfig;
  workflowDefinition?: WorkflowDefinition;
  enabled?: boolean;
  configVersion?: number;
}

/**
 * Base envelope emitted by the trigger runtime before workflow execution.
 */
export interface NormalizedTriggerEvent<TData = Record<string, unknown>, TOutput = Record<string, unknown>> {
  runId: string;
  workflowId: string;
  triggerNodeId: string;
  triggerMode: TriggerMode;
  timestamp: string;
  source: {
    type: TriggerMode | 'system';
    name: string;
    eventName: string;
    id?: string;
  };
  event: TData;
  data: TData;
  output: TOutput;
  meta: {
    requestId?: string;
    jobId?: string;
    attempt: number;
    dedupeKey?: string;
    checkpoint?: string;
    raw?: unknown;
    [key: string]: unknown;
  };
}

/**
 * Runtime handle returned by a live trigger consumer.
 */
export interface TriggerRuntimeHandle {
  workflowId: string;
  nodeId: string;
  triggerMode: TriggerMode;
  status: TriggerRuntimeStatus;
  startedAt: string;
  updatedAt: string;
  lastFiredAt?: string;
  nextRunAt?: string;
  endpoint?: string;
  cronExpression?: string;
  pollingInterval?: number;
  lastCheckpoint?: string;
  metadata?: Record<string, unknown>;
  /**
   * Stop the runtime and release all owned resources.
   */
  stop: () => Promise<void> | void;
}

/**
 * Persistent trigger record stored in the database.
 */
export interface TriggerStoreRecord {
  id: string;
  workflowId: string;
  nodeId: string;
  triggerMode: TriggerMode;
  status: 'active' | 'inactive' | 'failed' | 'restoring';
  nodeConfigSnapshot: TriggerNodeConfig;
  endpointPath?: string;
  cronExpression?: string;
  pollingInterval?: number;
  configRef?: string;
  lastFiredAt?: string;
  lastCheckpoint?: string;
  runtimeMetadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  disabledAt?: string;
}

/**
 * Database contract used by the trigger store.
 */
export interface TriggerDatabaseService {
  upsertTriggerRecord(record: TriggerStoreRecord): Promise<TriggerStoreRecord>;
  getTriggerRecord(workflowId: string, nodeId: string): Promise<TriggerStoreRecord | null>;
  listActiveTriggerRecords(): Promise<TriggerStoreRecord[]>;
  listActiveTriggerRecordsByWorkflow?(workflowId: string): Promise<TriggerStoreRecord[]>;
  markTriggerInactive(workflowId: string, nodeId: string, disabledAt: string, reason?: string): Promise<void>;
}

/**
 * Storage abstraction used by the trigger manager.
 */
export interface TriggerStore {
  upsert(record: TriggerStoreRecord): Promise<TriggerStoreRecord>;
  getByWorkflowAndNode(workflowId: string, nodeId: string): Promise<TriggerStoreRecord | null>;
  listActive(): Promise<TriggerStoreRecord[]>;
  listActiveByWorkflow?(workflowId: string): Promise<TriggerStoreRecord[]>;
  markInactive(workflowId: string, nodeId: string, disabledAt: string, reason?: string): Promise<void>;
}

/**
 * Contract used by the trigger manager to execute a workflow.
 */
export interface WorkflowExecutionService {
  executeWorkflow(workflow: WorkflowDefinition, context?: Record<string, unknown>): Promise<WorkflowExecutionResult>;
}

/**
 * Minimal execution result returned from a workflow run.
 */
export interface WorkflowExecutionResult {
  runId: string;
  workflowId: string;
  status: 'success' | 'failed';
  context: Record<string, unknown>;
  nodeResults?: Record<string, unknown>;
  errors?: Array<{ message: string; stack?: string; nodeId?: string }>;
  startedAt: string;
  finishedAt: string;
}

/**
 * Result returned when a trigger is activated.
 */
export interface TriggerActivationResult {
  workflowId: string;
  nodeId: string;
  status: 'active' | 'failed';
  triggerMode: TriggerMode;
  runtime?: TriggerRuntimeHandle;
  record?: TriggerStoreRecord;
  error?: string;
}

/**
 * Result returned when a trigger is deactivated.
 */
export interface TriggerCloseResult {
  workflowId: string;
  nodeId: string;
  status: 'closed' | 'failed';
  closedAt: string;
  reason?: string;
  error?: string;
}

/**
 * Result returned when a trigger is manually executed from the editor.
 */
export interface TriggerManualExecutionResult {
  workflowId: string;
  nodeId: string;
  status: 'success' | 'failed';
  runId: string;
  event: NormalizedTriggerEvent;
  execution?: WorkflowExecutionResult;
  error?: string;
}

/**
 * Summary returned by the trigger status endpoint.
 */
export interface TriggerStatusResult {
  workflowId: string;
  nodeId?: string;
  status: TriggerRuntimeStatus;
  lastFiredAt: string | null;
  nextRunAt: string | null;
  activeTrigger: TriggerRuntimeHandle | null;
  activeTriggers: TriggerRuntimeHandle[];
}

/**
 * Options passed into a trigger consumer implementation.
 */
export interface TriggerConsumerContext {
  workflowId: string;
  nodeConfig: TriggerNodeConfig;
  logger: TriggerLogger;
  emitEvent: (event: NormalizedTriggerEvent) => Promise<void> | void;
  registerCleanup: (cleanup: () => Promise<void> | void) => void;
  updateRuntime?: (patch: Partial<TriggerRuntimeHandle>) => void;
  now?: () => Date;
}
