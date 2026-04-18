import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import { WsAuthService } from './services/ws-auth.service';

@WebSocketGateway({ cors: { origin: '*' } })
@Injectable()
export class WebsocketConnectionGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnApplicationShutdown
{
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(WebsocketConnectionGateway.name);

  constructor(private readonly wsAuthService: WsAuthService) {}

  onApplicationShutdown(signal?: string) {
    this.logger.log(`Received ${signal}. Shutting down WebSocket gateway...`);

    if (this.server) {
      const socketCount = this.server.sockets.sockets.size;
      this.logger.log(
        `Disconnecting ${socketCount} connected WebSocket clients...`,
      );

      this.server.disconnectSockets(true);

      this.logger.log('WebSocket clients disconnected.');
    }
  }

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
