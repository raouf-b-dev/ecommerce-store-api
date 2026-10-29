import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Change-password and logout-all now require change_own_credentials. The
 * boot-time role sync grants it to the system roles (all but ADMIN_READONLY);
 * this migration keeps existing custom roles working by granting it to every
 * non-system role. The permission row is created here when the boot-time
 * permission sync has not run yet.
 */
export class GrantChangeOwnCredentialsToCustomRoles1787400000012 implements MigrationInterface {
  name = 'GrantChangeOwnCredentialsToCustomRoles1787400000012';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "permissions" ("code", "description")
      VALUES ('change_own_credentials', 'Change own password and revoke all own sessions (logout everywhere)')
      ON CONFLICT ("code") DO NOTHING
    `);
    await queryRunner.query(`
      INSERT INTO "role_permissions" ("role_id", "permission_id")
      SELECT r."id", p."id"
      FROM "roles" r
      CROSS JOIN "permissions" p
      WHERE r."is_system" = false
        AND p."code" = 'change_own_credentials'
      ON CONFLICT ("role_id", "permission_id") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "role_permissions" rp
      USING "roles" r, "permissions" p
      WHERE rp."role_id" = r."id"
        AND rp."permission_id" = p."id"
        AND r."is_system" = false
        AND p."code" = 'change_own_credentials'
    `);
  }
}
