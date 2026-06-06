export interface CurrentUserPayload {
  userId: number;
  email: string;
  role: string;
  customerId: number | null;
}
