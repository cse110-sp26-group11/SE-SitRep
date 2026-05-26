export function getQueryParam(url, name, fallback) {
  const value = url.searchParams.get(name);
  return value && value.trim() ? value.trim() : fallback;
}

export function getPathParts(url) {
  return url.pathname.split('/').filter(Boolean);
}

export async function readJson(request) {
  try {
    return await request.json();
  } catch {
    throw new Error('Request body must be valid JSON');
  }
}
