export interface IRole {
  id: number;
  code: string;
  name: string;
  isSystem: boolean;
  permissions: { codes: string[] };
  createdAt: Date;
  updatedAt: Date;
}
