import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { SeedSuperAdminUseCase } from '../src/modules/access/core/application/seed/seed-super-admin.usecase';
import * as readline from 'readline';
import { maskEmail } from './utils/log-helpers';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (query: string): Promise<string> =>
  new Promise((resolve) => rl.question(query, resolve));

const hiddenQuestion = (query: string): Promise<string> =>
  new Promise((resolve, reject) => {
    const stdin = process.stdin;
    const stdout = process.stdout;

    stdout.write(query);

    stdin.resume();
    stdin.setRawMode(true);

    let input = '';
    const listener = (chunk: Buffer) => {
      const char = chunk.toString();

      switch (char) {
        case '\n':
        case '\r':
        case '\u0004':
          stdin.setRawMode(false);
          stdin.pause();
          stdin.removeListener('data', listener);
          stdout.write('\n');
          resolve(input);
          break;
        case '\u0003':
          stdin.setRawMode(false);
          stdin.pause();
          stdin.removeListener('data', listener);
          reject(new Error('User cancelled the operation'));
          break;
        case '\u0008':
        case '\u007f':
          if (input.length > 0) {
            input = input.slice(0, -1);
            stdout.write('\b \b');
          }
          break;
        default:
          input += char;
          stdout.write('*');
          break;
      }
    };

    stdin.on('data', listener);
  });

async function bootstrap() {
  let app:
    | Awaited<ReturnType<typeof NestFactory.createApplicationContext>>
    | undefined;

  try {
    app = await NestFactory.createApplicationContext(AppModule);
    const seedSuperAdminUseCase = app.get(SeedSuperAdminUseCase);

    console.log('\n--- E-Commerce Admin Bootstrap ---');

    const email = await question('Enter admin email: ');
    const password = await hiddenQuestion(
      'Enter admin password (min 6 chars): ',
    );

    const result = await seedSuperAdminUseCase.execute({ email, password });
    if (result.isFailure) {
      console.error(result.error.message);
      process.exitCode = 1;
      return;
    }

    if (result.value.status === 'existing') {
      console.log(
        `User with email ${maskEmail(result.value.email)} already exists.`,
      );
      return;
    }

    console.log(
      `\nSuper admin seeded successfully: ${maskEmail(result.value.email)}`,
    );
    console.log('Note: You must change your password on first login.\n');
  } catch (error) {
    console.error('\nUnexpected error during admin seeding:', error);
    process.exitCode = 1;
  } finally {
    rl.close();
    if (app) await app.close();
  }
}

bootstrap();
