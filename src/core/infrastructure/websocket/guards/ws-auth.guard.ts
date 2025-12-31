import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { WsAuthService } from '../services/ws-auth.service';

@Injectable()
export class WsAuthGuard implements CanActivate {
  private readonly logger = new Logger(WsAuthGuard.name);

  constructor(private readonly wsAuthService: WsAuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client: Socket = context.switchToWs().getClient();

    try {
      const payload = await this.wsAuthService.authenticate(client);
      // Attach user to socket object for later use
      client['user'] = payload;
      return true;
    } catch (err) {
      throw new WsException('Unauthorized');
    }
  }
}
