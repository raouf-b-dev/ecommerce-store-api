import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';
import { WsAuthService } from './services/ws-auth.service';

@WebSocketGateway({ cors: { origin: '*' } })
@Injectable()
export class WebsocketConnectionGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(WebsocketConnectionGateway.name);

  constructor(private readonly wsAuthService: WsAuthService) {}

  async handleConnection(@ConnectedSocket() client: Socket) {
    try {
      const payload = await this.wsAuthService.authenticate(client);

      const userId = payload.sub; // Assuming 'sub' holds the userId
      const roomName = `user_${userId}`;

      await client.join(roomName);
      client['user'] = payload;

      this.logger.log(`User ${userId} connected and joined room ${roomName}`);
    } catch (err) {
      client.disconnect();
    }
  }

  handleDisconnect(@ConnectedSocket() client: Socket) {
    const user = client['user'];
    if (user) {
      this.logger.log(`User ${user.sub} disconnected`);
    }
  }
}
