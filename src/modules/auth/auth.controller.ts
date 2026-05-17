import {
  Controller,
  Post,
  Body,
  Get,
  HttpCode,
  HttpStatus,
  Req,
  UseInterceptors,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Request } from 'express';
import { LoginDto } from './primary-adapters/dto/login.dto';
import { RegisterDto } from './primary-adapters/dto/register.dto';
import { RefreshTokenDto } from './primary-adapters/dto/refresh-token.dto';
import { LoginUserUseCase } from './core/application/usecases/login-user/login-user.usecase';
import { RegisterUserUseCase } from './core/application/usecases/register-user/register-user.usecase';
import { RefreshTokenUseCase } from './core/application/usecases/refresh-token/refresh-token.usecase';
import { LogoutUseCase } from './core/application/usecases/logout/logout.usecase';
import { LogoutAllUseCase } from './core/application/usecases/logout-all/logout-all.usecase';
import { JwksPort } from '../../infrastructure/jwt/ports/jwks.port';
import {
  RefreshTokenCookieInterceptor,
  REFRESH_COOKIE_NAME,
} from './primary-adapters/interceptors/refresh-token-cookie.interceptor';

@ApiTags('Auth')
@Controller('auth')
@UseInterceptors(RefreshTokenCookieInterceptor)
export class AuthController {
  constructor(
    private readonly registerUseCase: RegisterUserUseCase,
    private readonly loginUseCase: LoginUserUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    private readonly logoutUseCase: LogoutUseCase,
    private readonly logoutAllUseCase: LogoutAllUseCase,
    private readonly jwksService: JwksPort,
  ) {}

  @Post('register')
  @Throttle({
    default: { limit: 10, ttl: 60000 },
    strict: { limit: 10, ttl: 60000 },
  })
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User successfully registered' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  async register(@Body() dto: RegisterDto) {
    return this.registerUseCase.execute(dto);
  }

  @Post('login')
  @Throttle({
    default: { limit: 10, ttl: 60000 },
    strict: { limit: 10, ttl: 60000 },
  })
  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({ status: 200, description: 'User successfully logged in' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async login(@Body() dto: LoginDto) {
    return this.loginUseCase.execute(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({
    default: { limit: 20, ttl: 60000 },
    strict: { limit: 20, ttl: 60000 },
  })
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Token successfully refreshed' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refresh(@Body() dto: RefreshTokenDto, @Req() req: Request) {
    const refreshToken = this.extractRefreshToken(dto, req);
    return this.refreshTokenUseCase.execute({ refreshToken });
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Logout current session' })
  @ApiResponse({ status: 204, description: 'Successfully logged out' })
  async logout(@Body() dto: RefreshTokenDto, @Req() req: Request) {
    const refreshToken = this.extractRefreshToken(dto, req);
    return this.logoutUseCase.execute({ refreshToken });
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Logout all sessions for user' })
  @ApiResponse({
    status: 204,
    description: 'Successfully logged out all sessions',
  })
  async logoutAll(@Body() dto: RefreshTokenDto, @Req() req: Request) {
    const refreshToken = this.extractRefreshToken(dto, req);
    return this.logoutAllUseCase.execute({ refreshToken });
  }

  @Get('.well-known/jwks.json')
  @ApiOperation({ summary: 'Get JWKS (JSON Web Key Set)' })
  @ApiResponse({
    status: 200,
    description: 'Returns public keys for JWT verification',
  })
  getJwks() {
    return this.jwksService.getJwks();
  }

  // ─── Private Helpers ──────────────────────────────────────────────

  /**
   * Extracts the refresh token from the request body (API/mobile clients)
   * or from the HttpOnly cookie (browser clients).
   */
  private extractRefreshToken(dto: RefreshTokenDto, req: Request): string {
    return dto.refreshToken || req.cookies?.[REFRESH_COOKIE_NAME] || '';
  }
}
