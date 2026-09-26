// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

import {
  Inject,
  Injectable,
  OnApplicationShutdown,
  Logger,
} from '@nestjs/common';
import { FlowProducer, FlowJob, FlowOpts } from 'bullmq';
import { EnvConfigService } from 'src/config/env-config.service';
import {
  BULLMQ_CONNECTION_OPTIONS,
  BullMqConnectionOptions,
} from './bullmq-connection.token';

@Injectable()
export class FlowProducerService implements OnApplicationShutdown {
  private readonly flowProducer: FlowProducer;
  private readonly logger = new Logger(FlowProducerService.name);

  constructor(
    @Inject(BULLMQ_CONNECTION_OPTIONS)
    connection: BullMqConnectionOptions,
    envConfigService: EnvConfigService,
  ) {
    this.flowProducer = new FlowProducer({
      connection,
      prefix: envConfigService.redis.key_prefix,
    });
  }

  async add(flow: FlowJob, opts?: FlowOpts) {
    return this.flowProducer.add(flow, opts);
  }

  async addBulk(flows: FlowJob[]) {
    return this.flowProducer.addBulk(flows);
  }

  async onApplicationShutdown() {
    this.logger.log('Closing FlowProducer...');
    await this.flowProducer.close();
  }
}
