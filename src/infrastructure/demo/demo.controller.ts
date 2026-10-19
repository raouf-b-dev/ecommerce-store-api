import {
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../../guards/decorators/public.decorator';
import { DEMO_RESET_THROTTLE } from '../throttler/throttle.constants';
import { ResetDemoUseCase } from './core/application/usecases/reset-demo/reset-demo.usecase';
import { DemoResetAuthGuard } from './primary-adapters/guards/demo-reset-auth.guard';

@ApiTags('admin-demo')
@Controller('admin/demo')
export class DemoController {
  constructor(private readonly resetDemoUseCase: ResetDemoUseCase) {}

  @Post('reset')
  @Public()
  @HttpCode(HttpStatus.OK)
  @UseGuards(DemoResetAuthGuard)
  @Throttle(DEMO_RESET_THROTTLE)
  @ApiOperation({
    summary: 'Reconcile hosted demo data (ops)',
    description:
      'Demo and ops only. Not a shopper API and not accepted with a user JWT. ' +
      'Returns 404 when DEMO_RESET_ENABLED is false. ' +
      'Requires header X-Demo-Reset-Token. ' +
      'On success, re-runs the idempotent demo seed: restores the documented demo account passwords, upserts the catalog, and rebuilds demo SKU stock from fixture orders. ' +
      'Does not delete shopper-created accounts or orders. ' +
      'A second request while one reset is running returns 409.',
  })
  @ApiHeader({
    name: 'X-Demo-Reset-Token',
    required: true,
    description:
      'Shared secret for the hosted-demo reset cron. Generate a high-entropy value on the host. Never commit the real token.',
    example: 'your-demo-reset-token',
  })
  @ApiResponse({
    status: 200,
    description: 'Demo seed reconciled.',
    schema: {
      type: 'object',
      properties: {
        categories: { type: 'number', example: 7 },
        products: { type: 'number', example: 29 },
        inventorySkus: { type: 'number', example: 29 },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 404,
    description: 'Not found (reset disabled).',
  })
  @ApiResponse({ status: 409, description: 'A reset is already running.' })
  @ApiResponse({ status: 429, description: 'Too many reset attempts.' })
  reset() {
    return this.resetDemoUseCase.execute();
  }
}
