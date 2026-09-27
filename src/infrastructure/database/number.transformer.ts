export const numericToNumber = {
  to: (value: number | null): number | null =>
    value === undefined ? null : value,
  from: (value: string | number | null): number | null => {
    if (value === null || value === undefined) return null;
    const n = typeof value === 'string' ? parseFloat(value) : value;
    return Number.isNaN(n) ? null : +n;
  },
};
