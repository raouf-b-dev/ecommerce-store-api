import { projectFiles } from 'archunit';

describe('Hexagonal Architecture & Cross-Module Boundaries', () => {
  // Regex to match core source files, excluding spec files
  const coreSourcePattern = /src\/modules\/[a-z-]+\/core\/(?!.*\.spec\.ts$).*/;

  it('Rule 1: Core must not depend on primary-adapters', async () => {
    const rule = projectFiles('test/architecture/tsconfig.arch.json')
      .inPath(coreSourcePattern)
      .shouldNot()
      .dependOnFiles()
      .inFolder('src/modules/*/primary-adapters/**');

    await expect(rule).toPassAsync({ allowEmptyTests: true });
  });

  it('Rule 2: Core must not depend on secondary-adapters', async () => {
    const rule = projectFiles('test/architecture/tsconfig.arch.json')
      .inPath(coreSourcePattern)
      .shouldNot()
      .dependOnFiles()
      .inFolder('src/modules/*/secondary-adapters/**');

    await expect(rule).toPassAsync({ allowEmptyTests: true });
  });

  it('Rule 3: Domain must not depend on application', async () => {
    const domainPattern =
      /src\/modules\/[a-z-]+\/core\/domain\/(?!.*\.spec\.ts$).*/;
    const rule = projectFiles('test/architecture/tsconfig.arch.json')
      .inPath(domainPattern)
      .shouldNot()
      .dependOnFiles()
      .inFolder('src/modules/*/core/application/**');

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
      .inFolder('src/modules/*/primary-adapters/**')
      .shouldNot()
      .dependOnFiles()
      .inFolder('src/modules/*/secondary-adapters/**');

    await expect(rule).toPassAsync({ allowEmptyTests: true });
  });

  it('Rule 6: Cross-module core isolation', async () => {
    const modules = [
      'auth',
      'carts',
      'customers',
      'health',
      'inventory',
      'notifications',
      'orders',
      'payments',
      'products',
    ];

    for (const currentModule of modules) {
      const otherModulesPattern = `src/modules/!(${currentModule})/**`;
      const rule = projectFiles('test/architecture/tsconfig.arch.json')
        .inPath(
          new RegExp(`src/modules/${currentModule}/core/(?!.*\\.spec\\.ts$).*`),
        )
        .shouldNot()
        .dependOnFiles()
        .inFolder(otherModulesPattern);

      await expect(rule).toPassAsync({ allowEmptyTests: true });
    }
  });

  it('Rule 7: Core must not depend on general infrastructure (with whitelist exception for JWT ports)', async () => {
    const rule = projectFiles('test/architecture/tsconfig.arch.json')
      .inPath(coreSourcePattern)
      .shouldNot()
      .dependOnFiles()
      .inFolder('src/infrastructure/!(jwt)/**');

    await expect(rule).toPassAsync({ allowEmptyTests: true });
  });

  it('Rule 8: Scripts must not depend on domain entities or repositories directly', async () => {
    const rule = projectFiles('test/architecture/tsconfig.arch.json')
      .inFolder('scripts/**')
      .shouldNot()
      .dependOnFiles()
      .inFolder('src/modules/*/core/domain/**');

    await expect(rule).toPassAsync({ allowEmptyTests: true });
  });
});
