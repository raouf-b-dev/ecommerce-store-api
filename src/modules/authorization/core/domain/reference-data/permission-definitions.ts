export interface PermissionDefinition {
  code: string;
  description: string;
}

export const SYSTEM_PERMISSIONS: PermissionDefinition[] = [
  {
    code: 'access_admin',
    description: 'Access the operator admin dashboard SPA',
  },
  {
    code: 'manage_products',
    description: 'Create, update, and delete products',
  },
  { code: 'view_all_products', description: 'View all products' },
  { code: 'manage_orders', description: 'Create, update, and delete orders' },
  { code: 'view_all_orders', description: 'View all orders' },
  { code: 'view_own_profile', description: 'View own customer profile' },
  {
    code: 'manage_own_addresses',
    description: 'Manage own customer addresses',
  },
  { code: 'manage_inventory', description: 'Manage inventory stock' },
  { code: 'view_all_inventory', description: 'View all inventory levels' },
  { code: 'manage_payments', description: 'Manage payments and refunds' },
  { code: 'view_all_payments', description: 'View all payments' },
  { code: 'manage_users', description: 'Create, update, and delete users' },
  { code: 'view_all_users', description: 'View all users' },
  {
    code: 'view_customer_pii',
    description:
      "View other customers' personal data (name, email, phone, addresses) on orders and payments: unmasked order and payment results and the contact filters on the lists (orders: userEmail, userName, firstName, lastName; payments: userEmail, userName)",
  },
  {
    code: 'change_own_credentials',
    description:
      'Change own password and revoke all own sessions (logout everywhere)',
  },
  { code: 'manage_roles', description: 'Manage custom roles' },
  { code: 'manage_carts', description: 'Manage customer carts' },
  { code: 'view_own_orders', description: 'View own orders' },
  { code: 'cancel_own_orders', description: 'Cancel own orders' },
  { code: 'view_own_payments', description: 'View own payment history' },
  { code: 'manage_own_cart', description: 'Read and modify own cart' },
];
