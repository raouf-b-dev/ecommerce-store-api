import {
  Injectable,
  LoggerService,
  LogLevel,
  OnApplicationShutdown,
} from '@nestjs/common';
import * as winston from 'winston';
import 'winston-daily-rotate-file';
import { CorrelationService } from './correlation/correlation.service';
import { EnvConfigService } from '../../config/env-config.service';

@Injectable()
export class WinstonLoggerService
  implements LoggerService, OnApplicationShutdown
{
  private readonly logger: winston.Logger;

  constructor(
    private readonly config: EnvConfigService,
    private readonly correlation: CorrelationService,
  ) {
    const logDir = this.config.logDir;
    const logLevel = this.config.logLevel;
    const isProduction = this.config.node.env === 'production';

    const jsonFormat = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
      winston.format.errors({ stack: true }),
      winston.format.json(),
    );

    const consoleFormat = winston.format.combine(
      winston.format.timestamp({ format: 'HH:mm:ss.SSS' }),
      winston.format.errors({ stack: true }),
      winston.format.colorize({ all: true }),
      winston.format.printf((info) => {
        const { timestamp, level, message, context, correlationId, stack } =
          info;

        // Ensure all fields are strings or stringified
        const ts =
          typeof timestamp === 'string' ? timestamp : String(timestamp);
        const lvl = typeof level === 'string' ? level : String(level);
        const msg = typeof message === 'string' ? message : String(message);

        let ctx = '';
        if (context) {
          ctx =
            typeof context === 'string'
              ? `[${context}]`
              : `[${JSON.stringify(context)}]`;
        }

        // Show correlation ID in dev console for easy visual tracing
        const cid =
          typeof correlationId === 'string'
            ? ` (cid:${correlationId.slice(0, 8)})`
            : '';

        let stackTrace = '';
        if (stack) {
          stackTrace =
            typeof stack === 'string'
              ? `\n${stack}`
              : `\n${JSON.stringify(stack)}`;
        }

        return `${ts} ${lvl} ${ctx}${cid} ${msg}${stackTrace}`;
      }),
    );

    // --- Transports ---

    const errorRotate = new winston.transports.DailyRotateFile({
      dirname: logDir,
      filename: 'error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '90d',
      zippedArchive: true,
      format: jsonFormat,
    });

    const combinedRotate = new winston.transports.DailyRotateFile({
      dirname: logDir,
      filename: 'combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '50m',
      maxFiles: '90d',
      zippedArchive: true,
      format: jsonFormat,
    });

    const httpRotate = new winston.transports.DailyRotateFile({
      dirname: logDir,
      filename: 'http-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'http',
      maxSize: '50m',
      maxFiles: '90d',
      zippedArchive: true,
      format: jsonFormat,
    });

    const consoleTransport = new winston.transports.Console({
      format: isProduction ? jsonFormat : consoleFormat,
    });

    // Build transports based on LOG_TRANSPORT env var:
    // 'file'    — file transports only (VM/bare-metal deployments)
    // 'console' — console only (Docker/K8s — platform log driver collects stdout)
    // 'both'    — both file and console (default)
    const logTransport = this.config.logTransport;
    const fileTransports = [errorRotate, combinedRotate, httpRotate];
    const transports: winston.transport[] = [];

    if (logTransport === 'file' || logTransport === 'both') {
      transports.push(...fileTransports);
    }
    if (logTransport === 'console' || logTransport === 'both') {
      transports.push(consoleTransport);
    }

    this.logger = winston.createLogger({
      // Winston levels: error=0, warn=1, info=2, http=3, verbose=4, debug=5, silly=6
      level: logLevel,
      levels: winston.config.npm.levels,
      transports,
      // Catch unhandled exceptions/rejections
      exceptionHandlers: [
        new winston.transports.DailyRotateFile({
          dirname: logDir,
          filename: 'exceptions-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          maxSize: '20m',
          maxFiles: '90d',
          zippedArchive: true,
          format: jsonFormat,
        }),
      ],
      rejectionHandlers: [
        new winston.transports.DailyRotateFile({
          dirname: logDir,
          filename: 'rejections-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          maxSize: '20m',
          maxFiles: '90d',
          zippedArchive: true,
          format: jsonFormat,
        }),
      ],
    });
  }

  // --- Private: inject correlationId into every log call ---

  private withCorrelation(
    meta?: Record<string, unknown>,
  ): Record<string, unknown> {
    const correlationId = this.correlation.getId();
    return { ...meta, ...(correlationId ? { correlationId } : {}) };
  }

  // --- NestJS LoggerService interface ---

  log(message: string, context?: string): void {
    this.logger.info(message, this.withCorrelation({ context }));
  }

  error(message: string, stackOrContext?: string, context?: string): void {
    // NestJS calls error(message, stack, context) or error(message, context)
    if (context) {
      this.logger.error(
        message,
        this.withCorrelation({ context, stack: stackOrContext }),
      );
    } else {
      this.logger.error(
        message,
        this.withCorrelation({ context: stackOrContext }),
      );
    }
  }

  warn(message: string, context?: string): void {
    this.logger.warn(message, this.withCorrelation({ context }));
  }

  debug(message: string, context?: string): void {
    this.logger.debug(message, this.withCorrelation({ context }));
  }

  verbose(message: string, context?: string): void {
    this.logger.verbose(message, this.withCorrelation({ context }));
  }

  /**
   * Log HTTP request/response details.
   * Written to http-%DATE%.log via the 'http' level.
   */
  http(message: string, meta?: Record<string, unknown>): void {
    this.logger.http(message, this.withCorrelation(meta));
  }

  setLogLevels?(_levels: LogLevel[]): void {
    // Not used — Winston manages its own levels.
  }

  async onApplicationShutdown(signal?: string) {
    this.logger.info(
      `Flushing log transports before shutdown (signal: ${signal})`,
      {
        context: 'WinstonLoggerService',
      },
    );

    // Close all transports to flush pending writes to disk.
    await new Promise<void>((resolve) => {
      this.logger.on('finish', resolve);
      this.logger.end();
    });
  }
}
