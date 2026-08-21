import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialBaseline1787339318490 implements MigrationInterface {
  name = 'InitialBaseline1787339318490';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "products" ("id" SERIAL NOT NULL, "version" integer NOT NULL DEFAULT '1', "name" character varying NOT NULL, "slug" character varying NOT NULL DEFAULT '', "description" character varying, "sku" character varying, "price" numeric(12,2) NOT NULL, "currency" character varying NOT NULL DEFAULT 'USD', "image_url" character varying, "category_id" integer, "is_active" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_0806c755e0aca124e67c0cf6d7d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_products_category_active" ON "products" ("category_id", "is_active") WHERE "is_active" = true`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_products_active" ON "products" ("is_active") WHERE "is_active" = true`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_products_category_id" ON "products" ("category_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_products_slug" ON "products" ("slug") `,
    );
    await queryRunner.query(
      `CREATE TABLE "payments" ("id" SERIAL NOT NULL, "order_id" integer NOT NULL, "user_id" integer, "amount" numeric(10,2) NOT NULL, "currency" character varying(3) NOT NULL, "payment_method" character varying NOT NULL, "status" character varying NOT NULL, "transaction_id" character varying, "gateway_payment_intent_id" character varying, "gateway_client_secret" character varying, "payment_method_info" text, "refunded_amount" numeric(10,2) NOT NULL DEFAULT '0', "failure_reason" text, "completed_at" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_197ab7af18c93fbb0c9b28b4a59" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_payments_user_status" ON "payments" ("user_id", "status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_payments_gateway_intent_id" ON "payments" ("gateway_payment_intent_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_payments_transaction_id" ON "payments" ("transaction_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_payments_user_id" ON "payments" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_payments_order_id" ON "payments" ("order_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "refunds" ("id" SERIAL NOT NULL, "payment_id" integer NOT NULL, "amount" numeric(10,2) NOT NULL, "currency" character varying(3) NOT NULL, "reason" text NOT NULL, "status" character varying NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_5106efb01eeda7e49a78b869738" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_refunds_payment_id" ON "refunds" ("payment_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "shipping_addresses" ("id" SERIAL NOT NULL, "firstName" character varying NOT NULL, "lastName" character varying NOT NULL, "street" character varying NOT NULL, "street2" character varying, "city" character varying NOT NULL, "state" character varying NOT NULL, "postalCode" character varying NOT NULL, "country" character varying NOT NULL, "phone" character varying, "deliveryInstructions" character varying, CONSTRAINT "PK_cced78984eddbbe24470f226692" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "order_items" ("id" SERIAL NOT NULL, "product_id" integer NOT NULL, "product_name" character varying NOT NULL DEFAULT '', "sku" character varying, "image_url" character varying, "unitPrice" numeric(12,2) NOT NULL, "quantity" integer NOT NULL, "lineTotal" numeric(12,2) NOT NULL, "order_id" integer, CONSTRAINT "PK_005269d8574e6fac0493715c308" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "orders" ("id" SERIAL NOT NULL, "version" integer NOT NULL DEFAULT '1', "user_id" integer NOT NULL, "payment_id" integer, "payment_method" character varying NOT NULL, "shipping_address_id" integer NOT NULL, "userNotes" text, "subtotal" numeric(12,2) NOT NULL, "shippingCost" numeric(12,2) NOT NULL, "totalPrice" numeric(12,2) NOT NULL, "status" character varying NOT NULL DEFAULT 'pending_payment', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "REL_67b8be57fc38bda573d2a8513e" UNIQUE ("shipping_address_id"), CONSTRAINT "PK_710e2d4957aa5878dfe94e4ac2f" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_orders_user_status" ON "orders" ("user_id", "status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_orders_payment_id" ON "orders" ("payment_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_orders_user_id" ON "orders" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_orders_status" ON "orders" ("status") `,
    );
    await queryRunner.query(
      `CREATE TABLE "notifications" ("id" uuid NOT NULL, "userId" character varying, "targetRole" character varying, "type" character varying NOT NULL, "title" character varying NOT NULL, "message" character varying NOT NULL, "payload" jsonb, "status" character varying NOT NULL DEFAULT 'pending', "failedReason" character varying, "deliveredAt" TIMESTAMP, "expiresAt" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_6a72c3c0f683f6462415e653c3a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_notification_expiresAt" ON "notifications" ("expiresAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_notification_createdAt" ON "notifications" ("createdAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_notification_status" ON "notifications" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_notification_userId" ON "notifications" ("userId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "reservation_items" ("id" SERIAL NOT NULL, "product_id" integer NOT NULL, "quantity" integer NOT NULL, "reservation_id" integer, CONSTRAINT "PK_bfc06fb7312bf99dd93bbe73844" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_reservation_items_product_id" ON "reservation_items" ("product_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "reservations" ("id" SERIAL NOT NULL, "order_id" integer NOT NULL, "status" character varying NOT NULL DEFAULT 'PENDING', "expires_at" TIMESTAMP NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_da95cef71b617ac35dc5bcda243" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_reservations_pending_status" ON "reservations" ("status") WHERE "status" = 'PENDING'`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_reservations_status_expires_at" ON "reservations" ("status", "expires_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_reservations_order_id" ON "reservations" ("order_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "inventory" ("id" SERIAL NOT NULL, "version" integer NOT NULL DEFAULT '1', "product_id" integer NOT NULL, "availableQuantity" integer NOT NULL, "reservedQuantity" integer NOT NULL, "lowStockThreshold" integer NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "lastRestockDate" TIMESTAMP, CONSTRAINT "PK_82aa5da437c5bbfb80703b08309" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_inventory_available_quantity" ON "inventory" ("availableQuantity") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_inventory_product_id" ON "inventory" ("product_id") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."user_addresses_type_enum" AS ENUM('HOME', 'WORK', 'OTHER', 'BILLING', 'SHIPPING')`,
    );
    await queryRunner.query(
      `CREATE TABLE "user_addresses" ("id" SERIAL NOT NULL, "street" character varying NOT NULL, "street2" character varying, "city" character varying NOT NULL, "state" character varying NOT NULL, "postal_code" character varying NOT NULL, "country" character varying NOT NULL, "type" "public"."user_addresses_type_enum" NOT NULL, "is_default" boolean NOT NULL DEFAULT false, "delivery_instructions" text, "user_id" integer NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_8abbeb5e3239ff7877088ffc25b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "users" ("id" SERIAL NOT NULL, "version" integer NOT NULL DEFAULT '1', "firstName" character varying NOT NULL, "lastName" character varying NOT NULL, "phone" character varying, "email" character varying NOT NULL, "is_active" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "cart_items" ("id" SERIAL NOT NULL, "product_id" integer NOT NULL, "product_name" character varying NOT NULL, "price" numeric(12,2) NOT NULL, "quantity" integer NOT NULL, "image_url" character varying, "cart_id" integer, CONSTRAINT "PK_6fccf5ec03c172d27a28a82928b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "carts" ("id" SERIAL NOT NULL, "version" integer NOT NULL DEFAULT '1', "user_id" integer NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_2ec1c94a977b940d85a4f498aea" UNIQUE ("user_id"), CONSTRAINT "PK_b5f695a59f5ebb50af3c8160816" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_carts_user_id" ON "carts" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "permissions" ("id" SERIAL NOT NULL, "code" character varying NOT NULL, "description" character varying, CONSTRAINT "UQ_8dad765629e83229da6feda1c1d" UNIQUE ("code"), CONSTRAINT "PK_920331560282b8bd21bb02290df" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "role_permissions" ("id" SERIAL NOT NULL, "role_id" integer NOT NULL, "permission_id" integer NOT NULL, CONSTRAINT "UQ_25d24010f53bb80b78e412c9656" UNIQUE ("role_id", "permission_id"), CONSTRAINT "PK_84059017c90bfcb701b8fa42297" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "roles" ("id" SERIAL NOT NULL, "code" character varying NOT NULL, "name" character varying NOT NULL, "is_system" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_f6d54f95c31b73fb1bdd8e91d0c" UNIQUE ("code"), CONSTRAINT "PK_c1433d71a4838793a49dcad46ab" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "user_role_assignments" ("id" SERIAL NOT NULL, "user_id" integer NOT NULL, "role_id" integer NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_03eb0e6d5ebfdb266edecb67c7a" UNIQUE ("user_id"), CONSTRAINT "PK_ac634a3aa59d70bf0fb7b423b47" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "session_tokens" ("id" uuid NOT NULL, "userId" integer NOT NULL, "tokenHash" character varying NOT NULL, "expiresAt" TIMESTAMP NOT NULL, "isRevoked" boolean NOT NULL DEFAULT false, "revokedAt" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_e1ed1e084316ea54dc239428e49" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9bd851ebaa7cccf9d2877b4476" ON "session_tokens" ("userId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "credentials" ("id" SERIAL NOT NULL, "user_id" integer NOT NULL, "password_hash" character varying NOT NULL, "must_change_password" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_c68a6c53e95a7dc357f4ebce8f0" UNIQUE ("user_id"), CONSTRAINT "PK_1e38bc43be6697cdda548ad27a6" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "refunds" ADD CONSTRAINT "FK_7f48aa5d56c42aeb495db016683" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_items" ADD CONSTRAINT "FK_145532db85752b29c57d2b7b1f1" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD CONSTRAINT "FK_67b8be57fc38bda573d2a8513ec" FOREIGN KEY ("shipping_address_id") REFERENCES "shipping_addresses"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "reservation_items" ADD CONSTRAINT "FK_77fd31f8972b8cd9165c47443e7" FOREIGN KEY ("reservation_id") REFERENCES "reservations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_addresses" ADD CONSTRAINT "FK_7a5100ce0548ef27a6f1533a5ce" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "cart_items" ADD CONSTRAINT "FK_6385a745d9e12a89b859bb25623" FOREIGN KEY ("cart_id") REFERENCES "carts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_permissions" ADD CONSTRAINT "FK_178199805b901ccd220ab7740ec" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_permissions" ADD CONSTRAINT "FK_17022daf3f885f7d35423e9971e" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_role_assignments" ADD CONSTRAINT "FK_daf3517bf1fd13552a06b78dc91" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_role_assignments" DROP CONSTRAINT "FK_daf3517bf1fd13552a06b78dc91"`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_permissions" DROP CONSTRAINT "FK_17022daf3f885f7d35423e9971e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_permissions" DROP CONSTRAINT "FK_178199805b901ccd220ab7740ec"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cart_items" DROP CONSTRAINT "FK_6385a745d9e12a89b859bb25623"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_addresses" DROP CONSTRAINT "FK_7a5100ce0548ef27a6f1533a5ce"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reservation_items" DROP CONSTRAINT "FK_77fd31f8972b8cd9165c47443e7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" DROP CONSTRAINT "FK_67b8be57fc38bda573d2a8513ec"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_items" DROP CONSTRAINT "FK_145532db85752b29c57d2b7b1f1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "refunds" DROP CONSTRAINT "FK_7f48aa5d56c42aeb495db016683"`,
    );
    await queryRunner.query(`DROP TABLE "credentials"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_9bd851ebaa7cccf9d2877b4476"`,
    );
    await queryRunner.query(`DROP TABLE "session_tokens"`);
    await queryRunner.query(`DROP TABLE "user_role_assignments"`);
    await queryRunner.query(`DROP TABLE "roles"`);
    await queryRunner.query(`DROP TABLE "role_permissions"`);
    await queryRunner.query(`DROP TABLE "permissions"`);
    await queryRunner.query(`DROP INDEX "public"."idx_carts_user_id"`);
    await queryRunner.query(`DROP TABLE "carts"`);
    await queryRunner.query(`DROP TABLE "cart_items"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TABLE "user_addresses"`);
    await queryRunner.query(`DROP TYPE "public"."user_addresses_type_enum"`);
    await queryRunner.query(`DROP INDEX "public"."idx_inventory_product_id"`);
    await queryRunner.query(
      `DROP INDEX "public"."idx_inventory_available_quantity"`,
    );
    await queryRunner.query(`DROP TABLE "inventory"`);
    await queryRunner.query(`DROP INDEX "public"."idx_reservations_order_id"`);
    await queryRunner.query(
      `DROP INDEX "public"."idx_reservations_status_expires_at"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_reservations_pending_status"`,
    );
    await queryRunner.query(`DROP TABLE "reservations"`);
    await queryRunner.query(
      `DROP INDEX "public"."idx_reservation_items_product_id"`,
    );
    await queryRunner.query(`DROP TABLE "reservation_items"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_notification_userId"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_notification_status"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_notification_createdAt"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_notification_expiresAt"`);
    await queryRunner.query(`DROP TABLE "notifications"`);
    await queryRunner.query(`DROP INDEX "public"."idx_orders_status"`);
    await queryRunner.query(`DROP INDEX "public"."idx_orders_user_id"`);
    await queryRunner.query(`DROP INDEX "public"."idx_orders_payment_id"`);
    await queryRunner.query(`DROP INDEX "public"."idx_orders_user_status"`);
    await queryRunner.query(`DROP TABLE "orders"`);
    await queryRunner.query(`DROP TABLE "order_items"`);
    await queryRunner.query(`DROP TABLE "shipping_addresses"`);
    await queryRunner.query(`DROP INDEX "public"."idx_refunds_payment_id"`);
    await queryRunner.query(`DROP TABLE "refunds"`);
    await queryRunner.query(`DROP INDEX "public"."idx_payments_order_id"`);
    await queryRunner.query(`DROP INDEX "public"."idx_payments_user_id"`);
    await queryRunner.query(
      `DROP INDEX "public"."idx_payments_transaction_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_payments_gateway_intent_id"`,
    );
    await queryRunner.query(`DROP INDEX "public"."idx_payments_user_status"`);
    await queryRunner.query(`DROP TABLE "payments"`);
    await queryRunner.query(`DROP INDEX "public"."idx_products_slug"`);
    await queryRunner.query(`DROP INDEX "public"."idx_products_category_id"`);
    await queryRunner.query(`DROP INDEX "public"."idx_products_active"`);
    await queryRunner.query(
      `DROP INDEX "public"."idx_products_category_active"`,
    );
    await queryRunner.query(`DROP TABLE "products"`);
  }
}
