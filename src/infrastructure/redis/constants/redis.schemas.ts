export const OrderIndexSchema = {
  '$.id': { type: 'TEXT', AS: 'id' },
  '$.userId': { type: 'TEXT', AS: 'userId' },
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
  '$.userId': { type: 'TEXT', AS: 'userId' },
  '$.sessionId': { type: 'TEXT', AS: 'sessionId' },
  '$.createdAt': { type: 'NUMERIC', AS: 'createdAt', SORTABLE: true },
  '$.updatedAt': { type: 'NUMERIC', AS: 'updatedAt', SORTABLE: true },
};

export const PaymentIndexSchema = {
  '$.id': { type: 'TEXT', AS: 'id' },
  '$.orderId': { type: 'TEXT', AS: 'orderId' },
  '$.userId': { type: 'TEXT', AS: 'userId' },
  '$.status': { type: 'TEXT', AS: 'status' },
  '$.transactionId': { type: 'TEXT', AS: 'transactionId' },
  '$.createdAt': { type: 'NUMERIC', AS: 'createdAt', SORTABLE: true },
  '$.updatedAt': { type: 'NUMERIC', AS: 'updatedAt', SORTABLE: true },
};

export const UserIndexSchema = {
  '$.id': { type: 'TEXT', AS: 'id' },
  '$.email': { type: 'TAG', AS: 'email' },
  '$.role': { type: 'TEXT', AS: 'role' },
  '$.createdAt': { type: 'NUMERIC', AS: 'createdAt', SORTABLE: true },
  '$.updatedAt': { type: 'NUMERIC', AS: 'updatedAt', SORTABLE: true },
};
