import { db } from "../src/db/index";
import { movies } from "../src/db/schema";
import { sql } from "drizzle-orm";
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

const GENRES: Record<number, string> = {
  28: "Action",
  12: "Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  14: "Fantasy",
  36: "History",
  27: "Horror",
  10402: "Music",
  9648: "Mystery",
  10749: "Romance",
  878: "Science Fiction",
  10770: "TV Movie",
  53: "Thriller",
  10752: "War",
  37: "Western",
};

export async function loadPopularMovies(page: number = 1) {
  if (!TMDB_API_KEY) {
    console.warn("TMDB_API_KEY not set, falling back to local DB only.");
    return false;
  }
  try {
    const res = await fetch(`${TMDB_BASE_URL}/movie/popular?api_key=${TMDB_API_KEY}&language=en-US&page=${page}`);
    if (!res.ok) {
       console.error("TMDB error", await res.text());
       return false;
    }
    const data = await res.json();
    
    if (data.results && Array.isArray(data.results)) {
       await Promise.all(
         data.results.map(async (m: any) => {
           if (!m.poster_path) return;

           // Skip the expensive per-movie detail call if this movie is already in the DB and has imdb_id.
           const existing = (await db.execute(sql`SELECT id, imdb_id, trailer_key FROM movies WHERE id = ${m.id.toString()}`)).rows?.[0] as any;
           if (existing && existing.imdb_id && existing.trailer_key) return;

           const year = m.release_date ? parseInt(m.release_date.split('-')[0]) : 0;
           const genres = (m.genre_ids || []).map((id: number) => GENRES[id]).filter(Boolean).join(', ');
           
           let duration = '120m';
           let imdbId: string | null = null;
           try {
             const detailRes = await fetch(`${TMDB_BASE_URL}/movie/${m.id}?api_key=${TMDB_API_KEY}&language=en-US`);
             if (detailRes.ok) {
               const detailData = await detailRes.json();
               if (detailData.runtime) {
                 duration = `${detailData.runtime}m`;
               }
               if (detailData.imdb_id) {
                 imdbId = detailData.imdb_id;
               }
             }
           } catch(e) {
             console.error("Failed to fetch movie detail", e);
           }
           
           try {
             await db.insert(movies).values({
               id: m.id.toString(),
               title: m.title,
               year,
               genre: genres || 'Unknown',
               duration: duration,
               synopsis: m.overview || 'No synopsis available.',
               posterUrl: `https://image.tmdb.org/t/p/w500${m.poster_path}`,
               rating: m.vote_average ? parseFloat(m.vote_average.toFixed(1)) : 0,
               imdbId: imdbId
             }).onConflictDoUpdate({
               target: movies.id,
               set: {
                 imdbId: imdbId || sql`movies.imdb_id`,
                 duration: duration,
                 rating: m.vote_average ? parseFloat(m.vote_average.toFixed(1)) : 0
               }
             });
           } catch (e) {
           }
         })
       );
       return true;
    }
  } catch (e) {
    console.error("Failed to load TMDB movies", e);
  }
  return false;
}


export async function searchMovieAndSave(title: string, yearStr?: string) {
  if (!TMDB_API_KEY) return null;
  try {
    const cleanTitle = title.replace(/\s*[\(\[\{]\d{4}[\)\]\}]\s*$/, '').trim();
    const cleanYear = (yearStr && !isNaN(parseInt(yearStr))) ? parseInt(yearStr).toString() : '';
    const yearQuery = cleanYear ? `&primary_release_year=${cleanYear}` : '';
    
    let res = await fetch(`${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(cleanTitle)}${yearQuery}&language=en-US`);
    if (!res.ok) return null;
    let data = await res.json();

    // Fallback: If no results with year filter, retry search without year query
    if ((!data.results || data.results.length === 0) && yearQuery) {
      res = await fetch(`${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(cleanTitle)}&language=en-US`);
      if (res.ok) {
        data = await res.json();
      }
    }

    if (data.results && data.results.length > 0) {
      // Prioritize TMDB result that has a poster_path available
      const m = data.results.find((item: any) => item.poster_path) || data.results[0];
      const year = m.release_date ? parseInt(m.release_date.split('-')[0]) : (cleanYear ? parseInt(cleanYear) : 0);
      const genres = (m.genre_ids || []).map((id: number) => GENRES[id]).filter(Boolean).join(', ');
      
      let duration = '120m';
      let imdbId: string | null = null;
      let trailerKey: string | null = null;
      try {
        const detailRes = await fetch(`${TMDB_BASE_URL}/movie/${m.id}?api_key=${TMDB_API_KEY}&language=en-US&append_to_response=videos`);
        if (detailRes.ok) {
          const detailData = await detailRes.json();
          if (detailData.runtime) {
            duration = `${detailData.runtime}m`;
          }
          if (detailData.imdb_id) {
            imdbId = detailData.imdb_id;
          }
          if (detailData.videos && Array.isArray(detailData.videos.results)) {
            const trailer = detailData.videos.results.find((v: any) => v.site === 'YouTube' && v.type === 'Trailer' && v.official)
              || detailData.videos.results.find((v: any) => v.site === 'YouTube' && v.type === 'Trailer')
              || detailData.videos.results.find((v: any) => v.site === 'YouTube' && (v.type === 'Teaser' || v.type === 'Clip'));
            if (trailer && trailer.key) {
              trailerKey = trailer.key;
            }
          }
        }
      } catch(e) {}
      
      const poster_url = m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : null;
      
      try {
        await db.insert(movies).values({
          id: m.id.toString(),
          title: m.title,
          year,
          genre: genres || 'Unknown',
          duration,
          synopsis: m.overview || 'No synopsis available.',
          posterUrl: poster_url,
          rating: m.vote_average ? parseFloat(m.vote_average.toFixed(1)) : 0,
          imdbId: imdbId,
          trailerKey: trailerKey
        }).onConflictDoUpdate({
          target: movies.id,
          set: {
            posterUrl: poster_url,
            title: m.title,
            year,
            rating: m.vote_average ? parseFloat(m.vote_average.toFixed(1)) : 0,
            imdbId: imdbId || sql`movies.imdb_id`,
            trailerKey: trailerKey || sql`movies.trailer_key`
          }
        });
      } catch (e) {}
      
      return { 
        id: m.id.toString(), 
        title: m.title,
        year,
        poster_url,
        rating: m.vote_average ? parseFloat(m.vote_average.toFixed(1)) : 0,
        imdb_id: imdbId,
        trailer_key: trailerKey
      };
    }
  } catch (e) {
    console.error("Failed to search movie", e);
  }
  return null;
}

export async function fetchMovieTrailer(id: string): Promise<string | null> {
  if (!TMDB_API_KEY) return null;
  try {
    const res = await fetch(`${TMDB_BASE_URL}/movie/${encodeURIComponent(id)}/videos?api_key=${TMDB_API_KEY}&language=en-US`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.results && Array.isArray(data.results)) {
      const trailer = data.results.find((v: any) => v.site === 'YouTube' && v.type === 'Trailer' && v.official)
        || data.results.find((v: any) => v.site === 'YouTube' && v.type === 'Trailer')
        || data.results.find((v: any) => v.site === 'YouTube' && (v.type === 'Teaser' || v.type === 'Clip'));
      if (trailer && trailer.key) {
        return trailer.key;
      }
    }
  } catch (e) {
    console.error("Failed to fetch trailer from TMDB", e);
  }
  return null;
}

const creditsCache = new Map<string, { cast: string[]; duration?: string; synopsis?: string }>();

export async function fetchMovieCredits(id: string): Promise<{ cast: string[]; duration?: string; synopsis?: string }> {
  if (creditsCache.has(id)) {
    return creditsCache.get(id)!;
  }

  let dbDuration: string | undefined;
  let dbSynopsis: string | undefined;
  try {
    const movieRow = (await db.execute(sql`SELECT duration, synopsis FROM movies WHERE id = ${id}`)).rows?.[0] as any;
    if (movieRow) {
      if (movieRow.duration) dbDuration = movieRow.duration;
      if (movieRow.synopsis && movieRow.synopsis !== 'No synopsis available.') dbSynopsis = movieRow.synopsis;
    }
  } catch (_) {}

  if (!TMDB_API_KEY) {
    return { cast: [], duration: dbDuration, synopsis: dbSynopsis };
  }
  try {
    const res = await fetch(`${TMDB_BASE_URL}/movie/${encodeURIComponent(id)}?api_key=${TMDB_API_KEY}&language=en-US&append_to_response=credits`);
    if (!res.ok) {
      return { cast: [], duration: dbDuration, synopsis: dbSynopsis };
    }
    const data = await res.json();
    const cast = (data.credits?.cast || [])
      .slice(0, 5)
      .map((c: any) => c.name)
      .filter(Boolean);

    const duration = data.runtime ? `${data.runtime}m` : dbDuration;
    const synopsis = data.overview || dbSynopsis;

    const result = { cast, duration, synopsis };
    creditsCache.set(id, result);

    if (duration || synopsis) {
      try {
        await db.execute(sql`
          UPDATE movies 
          SET 
            duration = COALESCE(NULLIF(duration, ''), ${duration || null}),
            synopsis = CASE WHEN synopsis = 'No synopsis available.' OR synopsis IS NULL THEN ${synopsis || 'No synopsis available.'} ELSE synopsis END
          WHERE id = ${id}
        `);
      } catch (_) {}
    }

    return result;
  } catch (e) {
    console.error("Failed to fetch credits from TMDB", e);
    return { cast: [], duration: dbDuration, synopsis: dbSynopsis };
  }
}

