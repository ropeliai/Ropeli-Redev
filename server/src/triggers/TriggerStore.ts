import type {
  TriggerDatabaseService,
  TriggerStore as TriggerStoreContract,
  TriggerStoreRecord,
} from './types.js';

/**
 * Database-backed trigger store.
 *
 * This class assumes a DB service is injected from the application layer. The DB
 * service can be backed by Supabase, Prisma, raw SQL, or any other adapter.
 */
export class DbTriggerStore implements TriggerStoreContract {
  constructor(private readonly db: TriggerDatabaseService) {}

  async upsert(record: TriggerStoreRecord): Promise<TriggerStoreRecord> {
    return this.db.upsertTriggerRecord(record);
  }

  async getByWorkflowAndNode(workflowId: string, nodeId: string): Promise<TriggerStoreRecord | null> {
    return this.db.getTriggerRecord(workflowId, nodeId);
  }

  async listActive(): Promise<TriggerStoreRecord[]> {
    return this.db.listActiveTriggerRecords();
  }

  async listActiveByWorkflow(workflowId: string): Promise<TriggerStoreRecord[]> {
    if (this.db.listActiveTriggerRecordsByWorkflow) {
      return this.db.listActiveTriggerRecordsByWorkflow(workflowId);
    }

    const records = await this.db.listActiveTriggerRecords();
    return records.filter((record) => record.workflowId === workflowId);
  }

  async markInactive(workflowId: string, nodeId: string, disabledAt: string, reason?: string): Promise<void> {
    await this.db.markTriggerInactive(workflowId, nodeId, disabledAt, reason);
  }
}
