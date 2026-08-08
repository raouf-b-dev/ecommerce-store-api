import { Result } from 'src/shared-kernel/domain/result';
import { InfrastructureError } from 'src/shared-kernel/domain/exceptions/infrastructure-error';

export abstract class InventoryScheduler {
  abstract scheduleReconciliationJob(): Promise<
    Result<{ jobId: string }, InfrastructureError>
  >;
}
