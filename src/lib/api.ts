import { auth } from './firebase.ts';

export async function fetchWithUser(url: string, options: RequestInit = {}) {
  let token = localStorage.getItem("guest_token") || "";
  if (auth.currentUser) {
    token = await auth.currentUser.getIdToken();
  }
  const headers = {
    ...options.headers,
    ...(token ? { "Authorization": `Bearer ${token}` } : {})
  };
  return fetch(url, { ...options, headers });
}
