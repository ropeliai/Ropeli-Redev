export function activateTrigger(workflowId: string, nodeId: string, config: unknown): Promise<any>;
export function deactivateTrigger(workflowId: string, nodeId: string): Promise<any>;
export function manualExecuteTrigger(workflowId: string, nodeId: string, manualInput?: unknown): Promise<any>;
export function getTriggerStatus(workflowId: string, nodeId: string): Promise<any>;
