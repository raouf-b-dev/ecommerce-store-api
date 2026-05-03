export interface PermissionDefinition {
  code: string;
  description: string;
}

export const SYSTEM_PERMISSIONS: PermissionDefinition[] = [
  {
    code: 'manage_products',
    description: 'Create, update, and delete products',
  },
  { code: 'view_all_products', description: 'View all products' },
  { code: 'manage_orders', description: 'Create, update, and delete orders' },
  { code: 'view_all_orders', description: 'View all orders' },
  {
    code: 'manage_customers',
    description: 'Create, update, and delete customers',
  },
  { code: 'view_all_customers', description: 'View all customers' },
  { code: 'manage_inventory', description: 'Manage inventory stock' },
  { code: 'view_all_inventory', description: 'View all inventory levels' },
  { code: 'manage_payments', description: 'Manage payments and refunds' },
  { code: 'view_all_payments', description: 'View all payments' },
  { code: 'manage_users', description: 'Create, update, and delete users' },
  { code: 'view_all_users', description: 'View all users' },
  { code: 'manage_roles', description: 'Manage custom roles' },
  { code: 'manage_carts', description: 'Manage customer carts' },
];
