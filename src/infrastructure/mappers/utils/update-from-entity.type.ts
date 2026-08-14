/**
 * Application-controlled persistence shape of an ORM entity for atomic
 * optimistic-lock updates.
 *
 * Keying off `Exclude<keyof T, ExcludeKeys>` drops the optional modifier, so every
 * application-owned column must be written explicitly — adding a column to the
 * entity breaks compilation until the update payload accounts for it — while
 * nullable columns keep `undefined` in their value type and stay clearable.
 *
 * `ExcludeKeys` is the ownership list, not a "fields we currently skip" list:
 * identity (`id`), OCC (`version`), persistence-owned timestamps
 * (`@CreateDateColumn` / `@UpdateDateColumn`), and relations persisted in a
 * separate step. QueryBuilder `UPDATE` does not run TypeORM date hooks, so the
 * repository must stamp `version` and `updatedAt` in `.set()` itself.
 */
export type UpdateFromEntity<T, ExcludeKeys extends keyof T = never> = {
  [K in Exclude<keyof T, ExcludeKeys>]: T[K];
};
