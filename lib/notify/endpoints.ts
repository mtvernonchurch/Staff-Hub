/**
 * Only the big browser push services. The hub sends a request to whatever
 * address a browser hands it, so a made-up address must never get through.
 */
const PUSH_HOSTS = [
  /^fcm\.googleapis\.com$/,
  /^android\.googleapis\.com$/,
  /^(.+\.)?push\.apple\.com$/,
  /^(.+\.)?push\.services\.mozilla\.com$/,
  /^(.+\.)?notify\.windows\.com$/,
];

export function isPushEndpoint(value: string): boolean {
  if (value.length > 1000) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.port && PUSH_HOSTS.some((pattern) => pattern.test(url.hostname));
  } catch {
    return false;
  }
}
