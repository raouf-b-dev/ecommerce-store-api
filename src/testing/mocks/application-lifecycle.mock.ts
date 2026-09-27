import { ApplicationLifecyclePort } from '../../shared-kernel/domain/interfaces/application-lifecycle.port';

export class MockApplicationLifecycle implements ApplicationLifecyclePort {
  isShuttingDown = false;
}
