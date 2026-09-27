export interface IUserRoleAssignment {
  id: number | null;
  userId: number;
  roleId: number;
  createdAt: Date;
  updatedAt: Date;
}
