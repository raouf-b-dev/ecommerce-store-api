export interface CreateUserCommand {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
}
