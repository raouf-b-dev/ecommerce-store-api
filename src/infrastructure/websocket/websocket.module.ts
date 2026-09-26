// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

import { Module, Global } from '@nestjs/common';
import { WebsocketConnectionGateway } from './websocket.connection.gateway';
import { AuthenticationModule } from 'src/modules/authentication/authentication.module';
import { WsAuthService } from './services/ws-auth.service';

@Global()
@Module({
  imports: [AuthenticationModule],
  providers: [WebsocketConnectionGateway, WsAuthService],
  exports: [WebsocketConnectionGateway, WsAuthService],
})
export class WebsocketModule {}
