import { Controller, Get, Header, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../../guards/decorators/public.decorator';
import { EnvConfigService } from '../../config/env-config.service';
import { Currency } from '../../shared-kernel/domain/value-objects/currency';
import { PlatformConfigResponseDto } from './dto/platform-config-response.dto';

@ApiTags('platform')
@Controller('platform')
export class PlatformController {
  constructor(private readonly envConfig: EnvConfigService) {}

  @Get('config')
  @Public()
  @Header('Cache-Control', 'public, max-age=300, stale-while-revalidate=600')
  @ApiOperation({
    summary: 'Get public platform configuration',
    description:
      'Returns public platform configuration including the active default currency, exponent, and supported currencies.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Platform configuration retrieved successfully.',
    type: PlatformConfigResponseDto,
  })
  getConfig(): PlatformConfigResponseDto {
    const defaultCurrency = this.envConfig.store.defaultCurrency;
    return {
      defaultCurrency,
      defaultCurrencyExponent: Currency.getExponent(defaultCurrency),
      supportedCurrencies: this.envConfig.store.supportedCurrencies,
    };
  }
}
