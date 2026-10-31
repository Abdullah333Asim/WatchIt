import { auth } from './firebase.ts';

export async function fetchWithUser(url: string, options: RequestInit = {}) {
  let token = localStorage.getItem("guest_token") || "";
  if (auth.currentUser) {
    try {
      token = await auth.currentUser.getIdToken();
    } catch (e) {
      console.error("Failed to get Firebase token", e);
    }
  }

  const headers = {
    ...options.headers,
    ...(token ? { "Authorization": `Bearer ${token}` } : {})
  };

  const response = await fetch(url, { ...options, headers });

  // Global Auth Interceptor: Handle expired or invalid tokens (401 Unauthorized / 403 Forbidden)
  if (response.status === 401 || response.status === 403) {
    console.warn(`[fetchWithUser] Authentication rejected (${response.status}) for ${url}. Clearing stale session.`);
    
    // Clear stale guest token
    localStorage.removeItem("guest_token");
    
    // If Firebase user exists, sign out to clear cached credentials
    if (auth.currentUser) {
      try {
        await auth.signOut();
      } catch (err) {
        console.error("Error signing out Firebase user:", err);
      }
    }

    // Force reload so App.tsx redirects to LoginView cleanly
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  }

  return response;
}
