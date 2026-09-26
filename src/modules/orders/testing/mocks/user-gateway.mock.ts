// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

import { InfrastructureError } from 'src/shared-kernel/domain/exceptions/infrastructure-error';
import { Result } from 'src/shared-kernel/domain/result';
import {
  CheckoutUserInfoResult,
  UserGateway,
} from '../../core/application/ports/user.gateway';

export class MockUserGateway implements UserGateway {
  getUserInfo = jest.fn<
    Promise<Result<CheckoutUserInfoResult, InfrastructureError>>,
    [number]
  >();

  mockSuccessfulUserInfo(userInfo: CheckoutUserInfoResult): void {
    this.getUserInfo.mockResolvedValue(Result.success(userInfo));
  }

  mockUserInfoError(error: InfrastructureError): void {
    this.getUserInfo.mockResolvedValue(Result.failure(error));
  }

  // Reset all mocks
  reset(): void {
    jest.clearAllMocks();
  }

  // Verify no unexpected calls were made
  verifyNoUnexpectedCalls(): void {
    expect(this.getUserInfo).not.toHaveBeenCalled();
  }
}
