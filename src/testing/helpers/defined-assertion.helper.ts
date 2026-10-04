export function assertDefined<T>(
  val: T | null | undefined,
  message = 'Expected value to be defined',
): asserts val is NonNullable<T> {
  expect(val).not.toBeNull();
  expect(val).toBeDefined();
  if (val === null || val === undefined) {
    throw new Error(message);
  }
}
