import {
  Controller,
  Get,
  Res,
  UseGuards,
  Version,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { ApiOperation, ApiProduces, ApiOkResponse } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { Response } from 'express';
import { MetricsService } from './metrics.service';
import { MetricsAuthGuard } from './guards/metrics-auth.guard';

import { Public } from '../../guards/decorators/public.decorator';

@Controller('metrics')
@Public()
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @SkipThrottle()
  @UseGuards(MetricsAuthGuard)
  @Get()
  @Version(VERSION_NEUTRAL)
  @ApiOperation({
    summary: 'Prometheus metrics',
    description:
      'Returns Prometheus exposition format. Requires metrics API key when configured.',
  })
  @ApiProduces('text/plain')
  @ApiOkResponse({
    description: 'Prometheus metrics payload',
    schema: { type: 'string' },
  })
  async getMetrics(@Res() res: Response): Promise<void> {
    res.set('Content-Type', this.metricsService.getContentType());
    res.end(await this.metricsService.getMetrics());
  }
}
