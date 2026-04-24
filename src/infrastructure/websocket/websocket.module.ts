import { Module, Global } from '@nestjs/common';
import { WebsocketConnectionGateway } from './websocket.connection.gateway';
import { AuthModule } from 'src/modules/auth/auth.module';
import { WsAuthService } from './services/ws-auth.service';
import { RedisIoAdapterHost } from './redis-io-adapter.host';

@Global()
@Module({
  imports: [AuthModule],
  providers: [WebsocketConnectionGateway, WsAuthService, RedisIoAdapterHost],
  exports: [WebsocketConnectionGateway, WsAuthService, RedisIoAdapterHost],
})
export class WebsocketModule {}
