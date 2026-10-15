import { Controller, Get, Header, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../../guards/decorators/public.decorator';
import { PlatformConfigResponseDto } from './dto/platform-config-response.dto';
import { GetPlatformConfigQuery } from './get-platform-config.query';
import { Result } from '../../shared-kernel/domain/result';
import { DomainError } from '../../shared-kernel/domain/exceptions/domain.error';

@ApiTags('platform')
@Controller('platform')
export class PlatformController {
  constructor(private readonly getPlatformConfig: GetPlatformConfigQuery) {}

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
  getConfig(): Result<PlatformConfigResponseDto, DomainError> {
    return this.getPlatformConfig.execute();
  }
}
