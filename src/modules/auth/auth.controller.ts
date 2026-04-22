import {
  Controller,
  Post,
  Body,
  Get,
  HttpCode,
  HttpStatus,
  Req,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Request, Response } from 'express';
import * as ms from 'ms';
import { LoginDto } from './primary-adapters/dto/login.dto';
import { RegisterDto } from './primary-adapters/dto/register.dto';
import { RefreshTokenDto } from './primary-adapters/dto/refresh-token.dto';
import { LoginUserUseCase } from './core/application/usecases/login-user/login-user.usecase';
import { RegisterUserUseCase } from './core/application/usecases/register-user/register-user.usecase';
import { RefreshTokenUseCase } from './core/application/usecases/refresh-token/refresh-token.usecase';
import { LogoutUseCase } from './core/application/usecases/logout/logout.usecase';
import { LogoutAllUseCase } from './core/application/usecases/logout-all/logout-all.usecase';
import { JwksService } from '../../infrastructure/jwt/jwks.service';
import { EnvConfigService } from '../../config/env-config.service';

const REFRESH_COOKIE_NAME = 'refresh_token';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  private readonly cookieMaxAge: number;

  constructor(
    private readonly registerUseCase: RegisterUserUseCase,
    private readonly loginUseCase: LoginUserUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    private readonly logoutUseCase: LogoutUseCase,
    private readonly logoutAllUseCase: LogoutAllUseCase,
    private readonly jwksService: JwksService,
    private readonly configService: EnvConfigService,
  ) {
    this.cookieMaxAge = ms(
      this.configService.jwt.refreshTokenTtl as ms.StringValue,
    );
  }

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User successfully registered' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  async register(@Body() dto: RegisterDto) {
    return this.registerUseCase.execute(dto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({ status: 200, description: 'User successfully logged in' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.loginUseCase.execute(dto);

    if (result.isSuccess && result.value) {
      this.setRefreshCookie(res, result.value.refreshToken);
    }

    return result;
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Token successfully refreshed' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refresh(
    @Body() dto: RefreshTokenDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = this.extractRefreshToken(dto, req);
    const result = await this.refreshTokenUseCase.execute({ refreshToken });

    if (result.isSuccess && result.value) {
      this.setRefreshCookie(res, result.value.refreshToken);
    }

    return result;
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Logout current session' })
  @ApiResponse({ status: 204, description: 'Successfully logged out' })
  async logout(
    @Body() dto: RefreshTokenDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = this.extractRefreshToken(dto, req);
    await this.logoutUseCase.execute({ refreshToken });
    this.clearRefreshCookie(res);
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Logout all sessions for user' })
  @ApiResponse({
    status: 204,
    description: 'Successfully logged out all sessions',
  })
  async logoutAll(
    @Body() dto: RefreshTokenDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = this.extractRefreshToken(dto, req);
    await this.logoutAllUseCase.execute({ refreshToken });
    this.clearRefreshCookie(res);
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

  /**
   * Sets the refresh token as an HttpOnly, Secure, SameSite=Strict cookie
   * scoped to auth endpoints.
   */
  private setRefreshCookie(res: Response, token: string): void {
    res.cookie(REFRESH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/auth',
      maxAge: this.cookieMaxAge,
    });
  }

  /**
   * Clears the refresh token cookie on logout.
   */
  private clearRefreshCookie(res: Response): void {
    res.clearCookie(REFRESH_COOKIE_NAME, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/auth',
    });
  }
}
