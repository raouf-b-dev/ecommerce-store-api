import { ResultAssertionHelper } from '../../../../../testing/helpers/result-assertion.helper';
import {
  CHANGE_OWN_CREDENTIALS_PERMISSION,
  ensureCredentialsChangeable,
} from './credential-change.policy';

describe('ensureCredentialsChangeable', () => {
  it('accepts a role holding change_own_credentials', () => {
    ResultAssertionHelper.assertResultSuccess(
      ensureCredentialsChangeable([
        'view_own_orders',
        CHANGE_OWN_CREDENTIALS_PERMISSION,
      ]),
    );
  });

  it('refuses a role without change_own_credentials with a forbidden error', () => {
    const result = ensureCredentialsChangeable([
      'access_admin',
      'view_all_orders',
    ]);

    ResultAssertionHelper.assertResultFailure(
      result,
      'Changing credentials requires the change_own_credentials permission',
    );
    expect(result.error.statusCode).toBe(403);
  });
});
