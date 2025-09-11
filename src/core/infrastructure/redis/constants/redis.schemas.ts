export const OrderIndexSchema = {
  '$.id': { type: 'TEXT', AS: 'id' },
  '$.customerId': { type: 'TEXT', AS: 'customerId' },
  '$.status': { type: 'TEXT', AS: 'status' },
  '$.totalPrice': { type: 'NUMERIC', AS: 'totalPrice', SORTABLE: true },
  '$.createdAt': { type: 'NUMERIC', AS: 'createdAt', SORTABLE: true },
  '$.updatedAt': { type: 'NUMERIC', AS: 'updatedAt', SORTABLE: true },
};

export const ProductIndexSchema = {
  '$.id': { type: 'TEXT', AS: 'id' }, // lookup by ID
  '$.name': { type: 'TEXT', AS: 'name' }, // search by name
  '$.sku': { type: 'TEXT', AS: 'sku' }, // search by SKU
  '$.price': { type: 'NUMERIC', AS: 'price' }, // filter/range queries
  '$.stockQuantity': { type: 'NUMERIC', AS: 'stockQuantity' }, // check stock
};
