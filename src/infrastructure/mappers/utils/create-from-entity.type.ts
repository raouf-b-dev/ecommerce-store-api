export type CreateFromEntity<T, ExcludeKeys extends keyof T = never> = Required<
  Omit<T, ExcludeKeys>
>;
