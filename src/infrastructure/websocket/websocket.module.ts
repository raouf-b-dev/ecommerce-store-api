import { Module, Global } from '@nestjs/common';
import { WebsocketConnectionGateway } from './websocket.connection.gateway';
import { AuthModule } from 'src/modules/auth/auth.module';
import { WsAuthService } from './services/ws-auth.service';

@Global()
@Module({
  imports: [AuthModule],
  providers: [WebsocketConnectionGateway, WsAuthService],
  exports: [WebsocketConnectionGateway, WsAuthService],
})
export class WebsocketModule {}
