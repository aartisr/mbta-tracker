export function getSiteOrigin(url: URL): string {
  const configured = import.meta.env.PUBLIC_SITE_URL as string | undefined;

  if (configured) {
    return configured.replace(/\/$/, '');
  }

  return url.origin;
}

export function buildAbsoluteUrl(url: URL, path: string): string {
  const origin = getSiteOrigin(url);
  return new URL(path, `${origin}/`).toString();
}