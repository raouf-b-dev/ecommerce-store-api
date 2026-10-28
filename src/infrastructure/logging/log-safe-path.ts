/**
 * Path to put in a log line. The query string is dropped because it can carry
 * customer contact data (for example ?userEmail=...) and tokens.
 */
export function logSafePath(url: string | undefined): string {
  if (!url) return '';
  const queryStart = url.indexOf('?');
  return queryStart === -1 ? url : url.slice(0, queryStart);
}
