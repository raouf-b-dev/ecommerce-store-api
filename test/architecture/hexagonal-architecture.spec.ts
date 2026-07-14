import { projectFiles } from 'archunit';

describe('Hexagonal Architecture & Cross-Module Boundaries', () => {
  // Regex to match core source files, excluding spec files
  const coreSourcePattern = /src\/modules\/[a-z-]+\/core\/(?!.*\.spec\.ts$).*/;

  it('Rule 1: Core must not depend on primary-adapters', async () => {
    const rule = projectFiles('test/architecture/tsconfig.arch.json')
      .inPath(coreSourcePattern)
      .shouldNot()
      .dependOnFiles()
      .inFolder(/src\/modules\/[a-z-]+\/primary-adapters\/.*/);

    await expect(rule).toPassAsync({ allowEmptyTests: true });
  });

  it('Rule 2: Core must not depend on secondary-adapters', async () => {
    const rule = projectFiles('test/architecture/tsconfig.arch.json')
      .inPath(coreSourcePattern)
      .shouldNot()
      .dependOnFiles()
      .inFolder(/src\/modules\/[a-z-]+\/secondary-adapters\/.*/);

    await expect(rule).toPassAsync({ allowEmptyTests: true });
  });

  it('Rule 3: Domain must not depend on application', async () => {
    const domainPattern =
      /src\/modules\/[a-z-]+\/core\/domain\/(?!.*\.spec\.ts$).*/;
    const rule = projectFiles('test/architecture/tsconfig.arch.json')
      .inPath(domainPattern)
      .shouldNot()
      .dependOnFiles()
      .inFolder(/src\/modules\/[a-z-]+\/core\/application\/.*/);

    await expect(rule).toPassAsync({ allowEmptyTests: true });
  });

  it('Rule 4: No circular dependencies in core', async () => {
    const rule = projectFiles('test/architecture/tsconfig.arch.json')
      .inPath(coreSourcePattern)
      .should()
      .haveNoCycles();

    await expect(rule).toPassAsync({ allowEmptyTests: true });
  });

  it('Rule 5: Primary adapters must not depend on secondary adapters', async () => {
    const rule = projectFiles('test/architecture/tsconfig.arch.json')
      .inFolder(/src\/modules\/[a-z-]+\/primary-adapters\/.*/)
      .shouldNot()
      .dependOnFiles()
      .inFolder(/src\/modules\/[a-z-]+\/secondary-adapters\/.*/);

    await expect(rule).toPassAsync({ allowEmptyTests: true });
  });

  describe('Rule 6: Cross-module core isolation', () => {
    const modules = [
      'access',
      'auth',
      'carts',
      'health',
      'inventory',
      'notifications',
      'orders',
      'payments',
      'products',
    ];

    for (const currentModule of modules) {
      it(`should isolate core of ${currentModule} from other modules`, async () => {
        const otherModulesPattern = new RegExp(
          `src/modules/(?!${currentModule})[a-z-]+/.*`,
        );
        const rule = projectFiles('test/architecture/tsconfig.arch.json')
          .inPath(
            new RegExp(
              `src/modules/${currentModule}/core/(?!.*\\.spec\\.ts$).*`,
            ),
          )
          .shouldNot()
          .dependOnFiles()
          .inFolder(otherModulesPattern);

        await expect(rule).toPassAsync({ allowEmptyTests: true });
      });
    }
  });

  it('Rule 7: Core must not contain DTO files', async () => {
    const rule = projectFiles('test/architecture/tsconfig.arch.json')
      .inPath(coreSourcePattern)
      .shouldNot()
      .haveName(/.*\.dto\.ts/);

    await expect(rule).toPassAsync({ allowEmptyTests: true });
  });

  it('Rule 8: Core must not depend on general infrastructure (with whitelist exception for JWT ports)', async () => {
    const rule = projectFiles('test/architecture/tsconfig.arch.json')
      .inPath(coreSourcePattern)
      .shouldNot()
      .dependOnFiles()
      .inFolder(/src\/infrastructure\/(?!jwt\/)[a-z-]+\/.*/);

    await expect(rule).toPassAsync({ allowEmptyTests: true });
  });

  it('Rule 9: Scripts must not depend on domain entities or repositories directly', async () => {
    const rule = projectFiles('test/architecture/tsconfig.arch.json')
      .inFolder(/scripts\/.*/)
      .shouldNot()
      .dependOnFiles()
      .inFolder(/src\/modules\/[a-z-]+\/core\/domain\/.*/);

    await expect(rule).toPassAsync({ allowEmptyTests: true });
  });
});
