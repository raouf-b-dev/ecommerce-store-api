import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { LoginDto } from './presentation/dto/login.dto';
import { RegisterDto } from './presentation/dto/register.dto';
import { LoginUserController } from './presentation/controllers/login-user/login-user.controller';
import { RegisterUserController } from './presentation/controllers/register-user/register-user.controller';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly registerController: RegisterUserController,
    private readonly loginController: LoginUserController,
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User successfully registered' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  async register(@Body() dto: RegisterDto) {
    return this.registerController.handle(dto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async login(@Body() dto: LoginDto) {
    return this.loginController.handle(dto);
  }
}
