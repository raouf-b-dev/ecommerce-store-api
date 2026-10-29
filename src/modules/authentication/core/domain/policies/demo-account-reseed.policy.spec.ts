import { ResultAssertionHelper } from '../../../../../testing/helpers/result-assertion.helper';
import { SystemRoleCode } from '../../../../../shared-kernel/domain/value-objects/system-roles';
import { ensureDemoAccountRoleMatches } from './demo-account-reseed.policy';

describe('ensureDemoAccountRoleMatches', () => {
  it('accepts an account that already has the expected role', () => {
    const result = ensureDemoAccountRoleMatches(
      'viewer@store.local',
      SystemRoleCode.ADMIN_READONLY,
      SystemRoleCode.ADMIN_READONLY,
    );

    ResultAssertionHelper.assertResultSuccess(result);
  });

  it('refuses an account with a different role', () => {
    const result = ensureDemoAccountRoleMatches(
      'viewer@store.local',
      SystemRoleCode.ADMIN_READONLY,
      SystemRoleCode.SUPER_ADMIN,
    );

    ResultAssertionHelper.assertResultFailure(
      result,
      'Refusing to reseed viewer@store.local: existing account has role SUPER_ADMIN, expected ADMIN_READONLY',
    );
  });

  it('refuses an account with no role', () => {
    const result = ensureDemoAccountRoleMatches(
      'customer@store.local',
      SystemRoleCode.CUSTOMER,
      null,
    );

    ResultAssertionHelper.assertResultFailure(
      result,
      'Refusing to reseed customer@store.local: existing account has role none, expected CUSTOMER',
    );
  });
});
