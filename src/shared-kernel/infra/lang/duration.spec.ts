import { parseDuration } from './duration';

describe('parseDuration', () => {
  it('returns the trimmed duration when the text is a unit duration', () => {
    expect(parseDuration('7d')).toBe('7d');
    expect(parseDuration(' 15m ')).toBe('15m');
  });

  it('returns undefined when the text is not a duration', () => {
    expect(parseDuration('banana')).toBeUndefined();
    expect(parseDuration('')).toBeUndefined();
  });
});
