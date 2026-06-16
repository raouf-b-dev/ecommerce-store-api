import { HttpStatus } from '@nestjs/common';
import { Result } from '../../../../../shared-kernel/domain/result';
import { ErrorFactory } from '../../../../../shared-kernel/domain/exceptions/error.factory';
import { UseCaseError } from '../../../../../shared-kernel/domain/exceptions/usecase.error';
import { SystemRoleCode } from '../../domain/reference-data/system-roles';

export function validateCustomerAccessTokenBinding(
  roleCode: string,
  customerId: number | null,
): Result<never, UseCaseError> | null {
  if (roleCode === (SystemRoleCode.CUSTOMER as string) && customerId === null) {
    return ErrorFactory.UseCaseError(
      'Customer account is not fully configured',
      null,
      HttpStatus.FORBIDDEN,
    );
  }

  return null;
}
