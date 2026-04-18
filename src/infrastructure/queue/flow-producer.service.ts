import { Injectable, OnApplicationShutdown, Logger } from '@nestjs/common';
import { FlowProducer, FlowJob, FlowOpts } from 'bullmq';
import { EnvConfigService } from 'src/config/env-config.service';

@Injectable()
export class FlowProducerService implements OnApplicationShutdown {
  private readonly flowProducer: FlowProducer;
  private readonly logger = new Logger(FlowProducerService.name);

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

  async onApplicationShutdown() {
    this.logger.log('Closing FlowProducer...');
    await this.flowProducer.close();
  }
}
