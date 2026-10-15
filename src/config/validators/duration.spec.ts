import { EnvError } from 'envalid';
import { parseEnvDuration } from './duration';

describe('parseEnvDuration', () => {
  it('returns the trimmed duration when the text is a unit duration', () => {
    expect(parseEnvDuration('7d')).toBe('7d');
    expect(parseEnvDuration(' 15m ')).toBe('15m');
  });

  it('throws EnvError when the text is not a duration', () => {
    expect(() => parseEnvDuration('banana')).toThrow(EnvError);
    expect(() => parseEnvDuration('')).toThrow(EnvError);
  });
});
