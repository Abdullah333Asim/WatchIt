export async function fetchWithUser(url: string, options: RequestInit = {}) {
  const userId = localStorage.getItem("userId") || "";
  const headers = {
    ...options.headers,
    ...(userId ? { "X-User-Id": userId } : {})
  };
  return fetch(url, { ...options, headers });
}
