import { CallerContext } from '../../../../../shared-kernel/domain/interfaces/caller-context.interface';

export interface UpdateUserCommand {
  id: number;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string | null;
  callerContext?: CallerContext | null;
}
