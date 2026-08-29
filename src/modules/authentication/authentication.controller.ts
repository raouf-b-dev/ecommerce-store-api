import {
  Controller,
  Post,
  Body,
  Get,
  HttpCode,
  HttpStatus,
  UseInterceptors,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiOkResponse,
} from '@nestjs/swagger';
import { LoginDto } from './primary-adapters/dto/login.dto';
import { RegisterDto } from './primary-adapters/dto/register.dto';
import { RefreshTokenDto } from './primary-adapters/dto/refresh-token.dto';
import { ChangePasswordDto } from './primary-adapters/dto/change-password.dto';
import { AuthTokensResponseDto } from './primary-adapters/dto/auth-tokens-response.dto';
import { LoginUserUseCase } from './core/application/usecases/login-user/login-user.usecase';
import { RegisterUserUseCase } from './core/application/usecases/register-user/register-user.usecase';
import { RefreshTokenUseCase } from './core/application/usecases/refresh-token/refresh-token.usecase';
import { LogoutUseCase } from './core/application/usecases/logout/logout.usecase';
import { LogoutAllUseCase } from './core/application/usecases/logout-all/logout-all.usecase';
import { ChangePasswordUseCase } from './core/application/usecases/change-password/change-password.usecase';
import { JwksPort } from '../../infrastructure/jwt/ports/jwks.port';
import { RefreshTokenCookieInterceptor } from './primary-adapters/interceptors/refresh-token-cookie.interceptor';
import { RefreshToken } from './primary-adapters/decorators/refresh-token.decorator';
import { Public } from '../../guards/decorators/public.decorator';
import { AllowDuringPasswordChange } from '../../guards/decorators/allow-during-password-change.decorator';
import { CurrentUser } from '../identity/primary-adapters/decorators/current-user.decorator';
import {
  AUTH_REFRESH_THROTTLE,
  AUTH_STRICT_THROTTLE,
} from '../../infrastructure/throttler/throttle.constants';

@ApiTags('Authentication')
@Controller('authentication')
@UseInterceptors(RefreshTokenCookieInterceptor)
export class AuthenticationController {
  constructor(
    private readonly registerUseCase: RegisterUserUseCase,
    private readonly loginUseCase: LoginUserUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    private readonly logoutUseCase: LogoutUseCase,
    private readonly logoutAllUseCase: LogoutAllUseCase,
    private readonly changePasswordUseCase: ChangePasswordUseCase,
    private readonly jwksService: JwksPort,
  ) {}

  @Post('register')
  @Public()
  @Throttle(AUTH_STRICT_THROTTLE)
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User successfully registered' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  async register(@Body() dto: RegisterDto) {
    return this.registerUseCase.execute(dto);
  }

  @Post('login')
  @Public()
  @Throttle(AUTH_STRICT_THROTTLE)
  @ApiOperation({ summary: 'Login user' })
  @ApiOkResponse({
    type: AuthTokensResponseDto,
    description: 'User successfully logged in',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    return this.loginUseCase.execute(dto);
  }

  @Post('refresh')
  @Public()
  @AllowDuringPasswordChange()
  @HttpCode(HttpStatus.OK)
  @Throttle(AUTH_REFRESH_THROTTLE)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiOkResponse({
    type: AuthTokensResponseDto,
    description: 'Token successfully refreshed',
  })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refresh(
    @RefreshToken() refreshToken: string,
    @Body() _dto: RefreshTokenDto,
  ) {
    return this.refreshTokenUseCase.execute(refreshToken);
  }

  @Post('logout')
  @AllowDuringPasswordChange()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Logout current session' })
  @ApiResponse({ status: 204, description: 'Successfully logged out' })
  async logout(
    @RefreshToken() refreshToken: string,
    @Body() _dto: RefreshTokenDto,
  ) {
    return this.logoutUseCase.execute(refreshToken);
  }

  @Post('logout-all')
  @AllowDuringPasswordChange()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Logout all sessions for user' })
  @ApiResponse({
    status: 204,
    description: 'Successfully logged out all sessions',
  })
  async logoutAll(
    @RefreshToken() refreshToken: string,
    @Body() _dto: RefreshTokenDto,
  ) {
    return this.logoutAllUseCase.execute(refreshToken);
  }

  @Post('change-password')
  @AllowDuringPasswordChange()
  @Throttle(AUTH_STRICT_THROTTLE)
  @ApiOperation({ summary: 'Change password for the authenticated user' })
  @ApiOkResponse({
    type: AuthTokensResponseDto,
    description: 'Password changed; new tokens issued',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed or same password',
  })
  @ApiResponse({ status: 401, description: 'Current password incorrect' })
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @CurrentUser('userId') userId: number,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.changePasswordUseCase.execute({
      userId,
      currentPassword: dto.currentPassword,
      newPassword: dto.newPassword,
    });
  }

  @Get('.well-known/jwks.json')
  @Public()
  @ApiOperation({ summary: 'Get JWKS (JSON Web Key Set)' })
  @ApiResponse({
    status: 200,
    description: 'Returns public keys for JWT verification',
  })
  getJwks() {
    return this.jwksService.getJwks();
  }
}
