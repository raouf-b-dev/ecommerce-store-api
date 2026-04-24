import { Injectable } from '@nestjs/common';
import { HealthIndicatorService } from '@nestjs/terminus';
import { WebsocketConnectionGateway } from '../../../infrastructure/websocket/websocket.connection.gateway';

@Injectable()
export class WebSocketHealthIndicator {
  constructor(
    private readonly healthIndicatorService: HealthIndicatorService,
    private readonly gateway: WebsocketConnectionGateway,
  ) {}

  async isHealthy(key: string) {
    const indicator = this.healthIndicatorService.check(key);

    try {
      const server = this.gateway.server;

      if (!server) {
        return indicator.down({ message: 'Socket.io server not initialized' });
      }

      const fetchPromise = server.fetchSockets();
      const timeoutPromise = new Promise<any[]>((_, reject) => {
        setTimeout(
          () => reject(new Error('WebSocket fetchSockets timeout (3000ms)')),
          3000,
        );
      });

      const sockets = await Promise.race([fetchPromise, timeoutPromise]);
      return indicator.up({ connectedClients: sockets.length });
    } catch (error) {
      return indicator.down({ message: error.message });
    }
  }
}
