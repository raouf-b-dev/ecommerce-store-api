export interface IAddress {
  id: string;
  street: string;
  street2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  type: 'HOME' | 'WORK' | 'OTHER';
  isDefault: boolean;
  deliveryInstructions: string | null;
  createdAt: Date;
  updatedAt: Date;
}
