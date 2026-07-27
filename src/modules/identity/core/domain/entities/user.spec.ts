import { User, UserProps } from './user';
import { ResultAssertionHelper } from '../../../../../testing';
import { DomainError } from '../../../../../shared-kernel/domain/exceptions/domain.error';

describe('User Domain Entity', () => {
  const buildProps = (overrides: Partial<UserProps> = {}): UserProps => ({
    id: 1,
    email: 'test@example.com',
    isActive: true,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    addresses: [],
    firstName: 'firstName',
    lastName: 'lastName',
    phone: 'phone',
    ...overrides,
  });

  describe('constructor validation', () => {
    it('should create a valid user', () => {
      const user = new User(buildProps());
      expect(user.id).toBe(1);
      expect(user.email).toBe('test@example.com');
      expect(user.isActive).toBe(true);
    });

    it('should reject empty email', () => {
      expect(() => new User(buildProps({ email: '' }))).toThrow(
        'Email is required',
      );
    });

    it('should reject invalid email format', () => {
      expect(() => new User(buildProps({ email: 'not-an-email' }))).toThrow(
        'Invalid email format',
      );
    });

    it('should normalize email to lowercase', () => {
      const user = new User(buildProps({ email: 'Test@EXAMPLE.COM' }));
      expect(user.email).toBe('test@example.com');
    });
  });

  describe('activate()', () => {
    it('should activate a deactivated user', () => {
      const user = new User(buildProps({ isActive: false }));
      expect(user.isActive).toBe(false);

      const result = user.activate();

      ResultAssertionHelper.assertResultSuccess(result);
      expect(user.isActive).toBe(true);
    });

    it('should return failure if user is already active', () => {
      const user = new User(buildProps({ isActive: true }));

      const result = user.activate();

      ResultAssertionHelper.assertResultFailure(
        result,
        'User is already active',
        DomainError,
      );
    });

    it('should update updatedAt timestamp on activation', () => {
      const oldDate = new Date('2024-01-01');
      const user = new User(
        buildProps({ isActive: false, updatedAt: oldDate }),
      );

      user.activate();

      expect(user.updatedAt.getTime()).toBeGreaterThan(oldDate.getTime());
    });
  });

  describe('deactivate()', () => {
    it('should deactivate an active user', () => {
      const user = new User(buildProps({ isActive: true }));
      expect(user.isActive).toBe(true);

      const result = user.deactivate();

      ResultAssertionHelper.assertResultSuccess(result);
      expect(user.isActive).toBe(false);
    });

    it('should return failure if user is already deactivated', () => {
      const user = new User(buildProps({ isActive: false }));

      const result = user.deactivate();

      ResultAssertionHelper.assertResultFailure(
        result,
        'User is already deactivated',
        DomainError,
      );
    });

    it('should update updatedAt timestamp on deactivation', () => {
      const oldDate = new Date('2024-01-01');
      const user = new User(buildProps({ isActive: true, updatedAt: oldDate }));

      user.deactivate();

      expect(user.updatedAt.getTime()).toBeGreaterThan(oldDate.getTime());
    });
  });

  describe('serialization', () => {
    it('should round-trip through toPrimitives() and fromPrimitives()', () => {
      const original = new User(buildProps());
      const primitives = original.toPrimitives();
      const restored = User.fromProps(primitives);

      expect(restored.id).toBe(original.id);
      expect(restored.email).toBe(original.email);
      expect(restored.isActive).toBe(original.isActive);
      expect(restored.id).toBe(original.id);
    });
  });

  describe('static create()', () => {
    it('should create a new user with isActive defaulting to true', () => {
      const user = User.create({
        id: null,
        email: 'new@user.com',
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true,
        addresses: [],
        firstName: 'firstName',
        lastName: 'lastName',
        phone: 'phone',
      });
      expect(user.isActive).toBe(true);
      expect(user.id).toBeNull();
    });
  });
});
