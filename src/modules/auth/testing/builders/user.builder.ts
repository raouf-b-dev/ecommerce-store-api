// src/modules/auth/testing/builders/user.builder.ts

import { IUser } from '../../core/domain/interfaces/user.interface';
import { UserRoleType } from '../../core/domain/value-objects/user-role';
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

  withCustomerId(customerId: number): this {
    this.user.customerId = customerId;
    return this;
  }

  withEmail(email: string): this {
    this.user.email = email;
    return this;
  }

  withPassword(password: string): this {
    this.user.passwordHash = password;
    return this;
  }

  withRole(role: UserRoleType): this {
    this.user.role = role;
    return this;
  }

  build(): IUser {
    return { ...this.user };
  }
}
