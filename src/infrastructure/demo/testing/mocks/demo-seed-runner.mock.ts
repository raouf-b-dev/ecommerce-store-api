import {
  DemoSeedReport,
  DemoSeedRunner,
} from '../../core/application/ports/demo-seed-runner.port';
import { UseCaseError } from '../../../../shared-kernel/domain/exceptions/usecase.error';
import { Result } from '../../../../shared-kernel/domain/result';

export class MockDemoSeedRunner extends DemoSeedRunner {
  run = jest.fn<
    Promise<Result<DemoSeedReport, UseCaseError>>,
    [Parameters<DemoSeedRunner['run']>[0]]
  >();
}
