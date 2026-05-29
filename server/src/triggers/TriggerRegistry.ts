import type { TriggerRuntimeHandle } from './types.js';

/**
 * In-memory registry of active trigger runtimes.
 *
 * The registry is process-local and intentionally lightweight. Persistence belongs
 * in the trigger store; this class only manages live handles for fast lifecycle operations.
 */
export class TriggerRegistry {
  private readonly activeTriggers = new Map<string, Map<string, TriggerRuntimeHandle>>();

  register(workflowId: string, nodeId: string, handle: TriggerRuntimeHandle): void {
    const workflowBucket = this.activeTriggers.get(workflowId) ?? new Map<string, TriggerRuntimeHandle>();
    workflowBucket.set(nodeId, handle);
    this.activeTriggers.set(workflowId, workflowBucket);
  }

  get(workflowId: string, nodeId: string): TriggerRuntimeHandle | undefined {
    return this.activeTriggers.get(workflowId)?.get(nodeId);
  }

  has(workflowId: string, nodeId: string): boolean {
    return this.get(workflowId, nodeId) !== undefined;
  }

  remove(workflowId: string, nodeId: string): void {
    const workflowBucket = this.activeTriggers.get(workflowId);
    if (!workflowBucket) {
      return;
    }

    workflowBucket.delete(nodeId);

    if (workflowBucket.size === 0) {
      this.activeTriggers.delete(workflowId);
    }
  }

  listWorkflow(workflowId: string): TriggerRuntimeHandle[] {
    return Array.from(this.activeTriggers.get(workflowId)?.values() ?? []);
  }

  listAll(): Array<TriggerRuntimeHandle & { workflowId: string }> {
    const items: Array<TriggerRuntimeHandle & { workflowId: string }> = [];

    for (const [workflowId, workflowBucket] of this.activeTriggers.entries()) {
      for (const handle of workflowBucket.values()) {
        items.push({ ...handle, workflowId });
      }
    }

    return items;
  }

  clearWorkflow(workflowId: string): void {
    this.activeTriggers.delete(workflowId);
  }

  clear(): void {
    this.activeTriggers.clear();
  }
}
