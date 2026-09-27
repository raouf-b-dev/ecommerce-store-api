export interface ICredential {
  id: number | null;
  userId: number;
  passwordHash: string;
  mustChangePassword: boolean;
}
