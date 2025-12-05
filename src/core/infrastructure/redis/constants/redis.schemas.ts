export const OrderIndexSchema = {
  '$.id': { type: 'TEXT', AS: 'id' },
  '$.customerId': { type: 'TEXT', AS: 'customerId' },
  '$.status': { type: 'TEXT', AS: 'status' },
  '$.totalPrice': { type: 'NUMERIC', AS: 'totalPrice', SORTABLE: true },
  '$.createdAt': { type: 'NUMERIC', AS: 'createdAt', SORTABLE: true },
  '$.updatedAt': { type: 'NUMERIC', AS: 'updatedAt', SORTABLE: true },
};

export const ProductIndexSchema = {
  '$.id': { type: 'TEXT', AS: 'id' },
  '$.name': { type: 'TEXT', AS: 'name' },
  '$.sku': { type: 'TEXT', AS: 'sku' },
  '$.price': { type: 'NUMERIC', AS: 'price' },
  '$.stockQuantity': { type: 'NUMERIC', AS: 'stockQuantity' },
};

export const InventoryIndexSchema = {
  '$.id': { type: 'TEXT', AS: 'id' },
  '$.productId': { type: 'TEXT', AS: 'productId' },
  '$.availableQuantity': { type: 'NUMERIC', AS: 'availableQuantity' },
  '$.lowStockThreshold': { type: 'NUMERIC', AS: 'lowStockThreshold' },
  '$.updatedAt': { type: 'NUMERIC', AS: 'updatedAt', SORTABLE: true },
};

export const CartIndexSchema = {
  '$.id': { type: 'TEXT', AS: 'id' },
  '$.customerId': { type: 'TEXT', AS: 'customerId' },
  '$.sessionId': { type: 'TEXT', AS: 'sessionId' },
  '$.createdAt': { type: 'NUMERIC', AS: 'createdAt', SORTABLE: true },
  '$.updatedAt': { type: 'NUMERIC', AS: 'updatedAt', SORTABLE: true },
};

export const PaymentIndexSchema = {
  '$.id': { type: 'TEXT', AS: 'id' },
  '$.orderId': { type: 'TEXT', AS: 'orderId' },
  '$.customerId': { type: 'TEXT', AS: 'customerId' },
  '$.status': { type: 'TEXT', AS: 'status' },
  '$.transactionId': { type: 'TEXT', AS: 'transactionId' },
  '$.createdAt': { type: 'NUMERIC', AS: 'createdAt', SORTABLE: true },
  '$.updatedAt': { type: 'NUMERIC', AS: 'updatedAt', SORTABLE: true },
};

export const CustomerIndexSchema = {
  '$.id': { type: 'TEXT', AS: 'id' },
  '$.firstName': { type: 'TEXT', AS: 'firstName' },
  '$.lastName': { type: 'TEXT', AS: 'lastName' },
  '$.email': { type: 'TEXT', AS: 'email' },
  '$.phone': { type: 'TEXT', AS: 'phone' },
  '$.createdAt': { type: 'NUMERIC', AS: 'createdAt', SORTABLE: true },
  '$.updatedAt': { type: 'NUMERIC', AS: 'updatedAt', SORTABLE: true },
};

export const UserIndexSchema = {
  '$.id': { type: 'TEXT', AS: 'id' },
  '$.email': { type: 'TEXT', AS: 'email' },
  '$.role': { type: 'TEXT', AS: 'role' },
  '$.customerId': { type: 'TEXT', AS: 'customerId' },
  '$.createdAt': { type: 'NUMERIC', AS: 'createdAt', SORTABLE: true },
  '$.updatedAt': { type: 'NUMERIC', AS: 'updatedAt', SORTABLE: true },
};
