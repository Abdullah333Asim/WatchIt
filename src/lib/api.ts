import { auth } from './firebase.ts';

export async function fetchWithUser(url: string, options: RequestInit = {}) {
  let token = "";
  if (auth.currentUser) {
    token = await auth.currentUser.getIdToken();
  }
  const headers = {
    ...options.headers,
    ...(token ? { "Authorization": `Bearer ${token}` } : {})
  };
  return fetch(url, { ...options, headers });
}
