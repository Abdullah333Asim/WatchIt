import { fetchWithUser } from './api';

export interface ProfileMovie {
  id: string;
  movie_id?: string;
  title: string;
  year?: number;
  genre?: string;
  duration?: string;
  synopsis?: string;
  poster_url?: string;
  rating?: number;
  imdb_id?: string | null;
  trailer_key?: string | null;
  action: string;
  timestamp?: string | Date;
}

export interface ProfileData {
  id: string;
  name: string;
  email: string;
  bio?: string;
  avatar_url?: string;
  taste_dna?: any;
  history: ProfileMovie[];
}

let cachedProfile: ProfileData | null = null;
let inFlightFetch: Promise<ProfileData> | null = null;
const listeners = new Set<(profile: ProfileData | null) => void>();

export function subscribeToProfile(listener: (profile: ProfileData | null) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function notifyListeners(): void {
  listeners.forEach(fn => fn(cachedProfile));
}

export function getCachedProfile(): ProfileData | null {
  return cachedProfile;
}

export function setCachedProfile(data: ProfileData | null): void {
  cachedProfile = data;
  notifyListeners();
}

// Canonicalize action names: 'Not Watched' is treated synonymously with 'Pass'
export function canonicalizeAction(action: string): string {
  if (action === 'Not Watched') return 'Pass';
  return action;
}

export function isPassAction(action: string | undefined | null): boolean {
  return action === 'Pass' || action === 'Not Watched';
}

export function matchesListType(action: string | undefined | null, listType: 'Watched' | 'Watchlist' | 'Pass'): boolean {
  if (listType === 'Pass') {
    return isPassAction(action);
  }
  return action === listType;
}

// Optimistically update the in-memory cache when user swipes
export function recordSwipeInCache(movie: any, action: string): void {
  const canonical = canonicalizeAction(action);
  if (!cachedProfile) return;

  const currentHistory = Array.isArray(cachedProfile.history) ? [...cachedProfile.history] : [];
  
  // Remove existing entry for this movie if any
  const filtered = currentHistory.filter((h: any) => h.id !== movie.id && h.movie_id !== movie.id);

  // If action is not 'Not Interested', prepend to history
  if (canonical !== 'Not Interested') {
    const newEntry: ProfileMovie = {
      id: movie.id,
      movie_id: movie.id,
      title: movie.title || "",
      year: movie.year,
      genre: movie.genre,
      duration: movie.duration,
      synopsis: movie.synopsis,
      poster_url: movie.poster_url || movie.posterUrl,
      rating: movie.rating,
      imdb_id: movie.imdb_id || movie.imdbId,
      trailer_key: movie.trailer_key || movie.trailerKey,
      action: canonical,
      timestamp: new Date().toISOString()
    };
    filtered.unshift(newEntry);
  }

  cachedProfile = {
    ...cachedProfile,
    history: filtered
  };
  notifyListeners();
}

// Optimistically update action of an existing movie in cache
export function updateMovieActionInCache(movieId: string, action: string): void {
  const canonical = canonicalizeAction(action);
  if (!cachedProfile || !Array.isArray(cachedProfile.history)) return;

  cachedProfile = {
    ...cachedProfile,
    history: cachedProfile.history.map((h: any) => 
      (h.id === movieId || h.movie_id === movieId) ? { ...h, action: canonical } : h
    )
  };
  notifyListeners();
}

// Optimistically remove movie from cache
export function removeMovieFromCache(movieId: string): void {
  if (!cachedProfile || !Array.isArray(cachedProfile.history)) return;

  cachedProfile = {
    ...cachedProfile,
    history: cachedProfile.history.filter((h: any) => h.id !== movieId && h.movie_id !== movieId)
  };
  notifyListeners();
}

// Fetch fresh profile from server with cache-busting and no-store
export async function fetchProfile(forceFresh = true): Promise<ProfileData> {
  if (!forceFresh && cachedProfile) {
    return cachedProfile;
  }

  if (inFlightFetch) {
    return inFlightFetch;
  }

  const timestamp = Date.now();
  inFlightFetch = (async () => {
    try {
      const res = await fetchWithUser(`/api/profile?t=${timestamp}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      if (!res.ok) {
        throw new Error(`Profile fetch failed: ${res.status}`);
      }
      const data: ProfileData = await res.json();
      
      // Merge any optimistic items added in the last 5 seconds that the server may not have committed yet
      if (cachedProfile && Array.isArray(cachedProfile.history)) {
        const serverIds = new Set(data.history.map((h: any) => h.id || h.movie_id));
        const recentOptimistic = cachedProfile.history.filter((h: any) => {
          if (serverIds.has(h.id) || serverIds.has(h.movie_id)) return false;
          const age = Date.now() - new Date(h.timestamp || 0).getTime();
          return age < 5000;
        });
        if (recentOptimistic.length > 0) {
          data.history = [...recentOptimistic, ...data.history];
        }
      }

      cachedProfile = data;
      notifyListeners();
      return data;
    } finally {
      inFlightFetch = null;
    }
  })();

  return inFlightFetch;
}
