import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { FlowProducer, FlowJob, FlowOpts } from 'bullmq';
import { EnvConfigService } from '../../../config/env-config.service';

@Injectable()
export class FlowProducerService implements OnModuleDestroy {
  private readonly flowProducer: FlowProducer;

  constructor(private readonly envConfigService: EnvConfigService) {
    this.flowProducer = new FlowProducer({
      connection: {
        host: envConfigService.redis.host,
        port: envConfigService.redis.port,
        password: envConfigService.redis.password,
        db: envConfigService.redis.db,
      },
      prefix: envConfigService.redis.key_prefix,
    });
  }

  async add(flow: FlowJob, opts?: FlowOpts) {
    return this.flowProducer.add(flow, opts);
  }

  async addBulk(flows: FlowJob[]) {
    return this.flowProducer.addBulk(flows);
  }

  async onModuleDestroy() {
    await this.flowProducer.close();
  }
}
