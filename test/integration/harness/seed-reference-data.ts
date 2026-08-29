import { DataSource } from 'typeorm';
import { UserEntity } from 'src/modules/identity/secondary-adapters/orm/user.schema';
import { ProductEntity } from 'src/modules/products/secondary-adapters/orm/product.schema';
import { InventoryEntity } from 'src/modules/inventory/secondary-adapters/orm/inventory.schema';
import { RoleEntity } from 'src/modules/authorization/secondary-adapter/orm/role.schema';
import { UserRoleAssignmentEntity } from 'src/modules/authorization/secondary-adapter/orm/user-role-assignment.schema';
import { SystemRoleCode } from 'src/shared-kernel/domain/value-objects/system-roles';

export interface SeededData {
  customerUser: UserEntity;
  adminUser: UserEntity;
  product: ProductEntity;
  inventory: InventoryEntity;
  customerRole: RoleEntity;
  adminRole: RoleEntity;
}

export async function seedReferenceData(
  dataSource: DataSource,
): Promise<SeededData> {
  const userRepo = dataSource.getRepository(UserEntity);
  const productRepo = dataSource.getRepository(ProductEntity);
  const inventoryRepo = dataSource.getRepository(InventoryEntity);
  const roleRepo = dataSource.getRepository(RoleEntity);
  const assignmentRepo = dataSource.getRepository(UserRoleAssignmentEntity);

  const customerRole = await roleRepo.save({
    code: SystemRoleCode.CUSTOMER,
    name: 'Customer',
    isSystem: true,
  });

  const adminRole = await roleRepo.save({
    code: SystemRoleCode.ADMIN,
    name: 'Administrator',
    isSystem: true,
  });

  const customerUser = await userRepo.save({
    firstName: 'Customer',
    lastName: 'One',
    email: 'customer.integration@example.com',
    phone: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const adminUser = await userRepo.save({
    firstName: 'Admin',
    lastName: 'User',
    email: 'admin.integration@example.com',
    phone: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  await assignmentRepo.save({
    userId: customerUser.id,
    roleId: customerRole.id,
  });

  await assignmentRepo.save({
    userId: adminUser.id,
    roleId: adminRole.id,
  });

  const product = await productRepo.save({
    sku: 'INT-LAPTOP-01',
    name: 'Integration Laptop Pro',
    description: 'High performance integration laptop',
    price: 1200.0,
    currency: 'USD',
    categoryId: 1,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const inventory = await inventoryRepo.save({
    productId: product.id,
    availableQuantity: 50,
    reservedQuantity: 5,
    lowStockThreshold: 10,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastRestockDate: null,
  });

  return {
    customerUser,
    adminUser,
    product,
    inventory,
    customerRole,
    adminRole,
  };
}
