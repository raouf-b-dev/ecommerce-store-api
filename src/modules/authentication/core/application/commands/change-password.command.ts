export interface ChangePasswordCommand {
  userId: number;
  currentPassword: string;
  newPassword: string;
}
