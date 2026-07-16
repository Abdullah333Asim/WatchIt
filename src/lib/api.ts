export async function fetchWithUser(url: string, options: RequestInit = {}) {
  let userId = localStorage.getItem("userId") || "";
  if (userId === "undefined" || userId === "null") userId = "";
  const headers = {
    ...options.headers,
    ...(userId ? { "X-User-Id": userId } : {})
  };
  return fetch(url, { ...options, headers });
}
