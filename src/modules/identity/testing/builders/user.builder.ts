import { IUser } from '../../core/domain/interfaces/user.interface';
import { UserTestFactory } from '../factories/user.factory';

export class UserBuilder {
  private user: IUser;

  constructor() {
    this.user = UserTestFactory.createMockUser();
  }

  withId(id: number): this {
    this.user.id = id;
    return this;
  }

  withuserId(userId: number): this {
    this.user.id = userId;
    return this;
  }

  withEmail(email: string): this {
    this.user.email = email;
    return this;
  }

  withIsActive(isActive: boolean): this {
    this.user.isActive = isActive;
    return this;
  }

  build(): IUser {
    return { ...this.user };
  }
}
