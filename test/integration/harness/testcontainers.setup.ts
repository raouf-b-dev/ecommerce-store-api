import { DataSource } from 'typeorm';
import { UserEntity } from 'src/modules/identity/secondary-adapters/orm/user.schema';
import { AddressEntity } from 'src/modules/identity/secondary-adapters/orm/address.schema';
import { RoleEntity } from 'src/modules/authorization/secondary-adapter/orm/role.schema';
import { PermissionEntity } from 'src/modules/authorization/secondary-adapter/orm/permission.schema';
import { RolePermissionEntity } from 'src/modules/authorization/secondary-adapter/orm/role-permission.schema';
import { UserRoleAssignmentEntity } from 'src/modules/authorization/secondary-adapter/orm/user-role-assignment.schema';
import { ProductEntity } from 'src/modules/products/secondary-adapters/orm/product.schema';
import { CategoryEntity } from 'src/modules/products/secondary-adapters/orm/category.schema';
import { InventoryEntity } from 'src/modules/inventory/secondary-adapters/orm/inventory.schema';
import { ReservationEntity } from 'src/modules/inventory/secondary-adapters/orm/reservation.schema';
import { ReservationItemEntity } from 'src/modules/inventory/secondary-adapters/orm/reservation-item.schema';
import { OrderEntity } from 'src/modules/orders/secondary-adapters/orm/order.schema';
import { OrderItemEntity } from 'src/modules/orders/secondary-adapters/orm/order-item.schema';
import { ShippingAddressEntity } from 'src/modules/orders/secondary-adapters/orm/shipping-address.schema';
import { PaymentEntity } from 'src/modules/payments/secondary-adapters/orm/payment.schema';
import { RefundEntity } from 'src/modules/payments/secondary-adapters/orm/refund.schema';
import { CartEntity } from 'src/modules/carts/secondary-adapters/orm/cart.schema';
import { CartItemEntity } from 'src/modules/carts/secondary-adapters/orm/cart-item.schema';
import { NotificationEntity } from 'src/modules/notifications/secondary-adapters/orm/notification.schema';
import { SessionTokenEntity } from 'src/modules/authentication/secondary-adapters/orm/session-token.schema';
import { CredentialEntity } from 'src/modules/authentication/secondary-adapters/orm/credential.schema';

declare global {
  var __INTEGRATION_DATA_SOURCE__: DataSource | undefined;
}

beforeAll(async () => {
  if (!globalThis.__INTEGRATION_DATA_SOURCE__) {
    const dataSource = new DataSource({
      type: 'postgres',
      host: process.env.INTEGRATION_DB_HOST || 'localhost',
      port: parseInt(process.env.INTEGRATION_DB_PORT || '5432', 10),
      username: process.env.INTEGRATION_DB_USER || 'test_user',
      password: process.env.INTEGRATION_DB_PASS || 'test_pass',
      database:
        process.env.INTEGRATION_DB_NAME || 'ecommerce_store_test_integration',
      synchronize: true,
      logging: false,
      entities: [
        UserEntity,
        AddressEntity,
        RoleEntity,
        PermissionEntity,
        RolePermissionEntity,
        UserRoleAssignmentEntity,
        ProductEntity,
        CategoryEntity,
        InventoryEntity,
        ReservationEntity,
        ReservationItemEntity,
        OrderEntity,
        OrderItemEntity,
        ShippingAddressEntity,
        PaymentEntity,
        RefundEntity,
        CartEntity,
        CartItemEntity,
        NotificationEntity,
        SessionTokenEntity,
        CredentialEntity,
      ],
    });

    await dataSource.initialize();
    globalThis.__INTEGRATION_DATA_SOURCE__ = dataSource;
  }
});

afterAll(async () => {
  if (globalThis.__INTEGRATION_DATA_SOURCE__?.isInitialized) {
    await globalThis.__INTEGRATION_DATA_SOURCE__.destroy();
    globalThis.__INTEGRATION_DATA_SOURCE__ = undefined;
  }
});
