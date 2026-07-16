import db from "./db.ts";
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
       const insert = db.prepare(`
        INSERT INTO movies (id, title, year, genre, duration, synopsis, poster_url, rating)
        VALUES (@id, @title, @year, @genre, @duration, @synopsis, @poster_url, @rating)
        ON CONFLICT(id) DO NOTHING
       `);
       
       for (const m of data.results) {
         if (!m.poster_path) continue;
         const year = m.release_date ? parseInt(m.release_date.split('-')[0]) : 0;
         const genres = (m.genre_ids || []).map((id: number) => GENRES[id]).filter(Boolean).join(', ');
         
         let duration = '120m';
         try {
           const detailRes = await fetch(`${TMDB_BASE_URL}/movie/${m.id}?api_key=${TMDB_API_KEY}&language=en-US`);
           if (detailRes.ok) {
             const detailData = await detailRes.json();
             if (detailData.runtime) {
               duration = `${detailData.runtime}m`;
             }
           }
         } catch(e) {
           console.error("Failed to fetch movie detail", e);
         }
         
         try {
           insert.run({
             id: m.id.toString(),
             title: m.title,
             year,
             genre: genres || 'Unknown',
             duration: duration,
             synopsis: m.overview || 'No synopsis available.',
             poster_url: `https://image.tmdb.org/t/p/w500${m.poster_path}`,
             rating: m.vote_average ? parseFloat(m.vote_average.toFixed(1)) : 0
           });
         } catch (e) {
         }
       }
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
    const yearQuery = yearStr ? `&primary_release_year=${yearStr}` : '';
    const res = await fetch(`${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}${yearQuery}&language=en-US`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.results && data.results.length > 0) {
      const m = data.results[0];
      const year = m.release_date ? parseInt(m.release_date.split('-')[0]) : 0;
      const genres = (m.genre_ids || []).map((id: number) => GENRES[id]).filter(Boolean).join(', ');
      
      let duration = '120m';
      try {
        const detailRes = await fetch(`${TMDB_BASE_URL}/movie/${m.id}?api_key=${TMDB_API_KEY}&language=en-US`);
        if (detailRes.ok) {
          const detailData = await detailRes.json();
          if (detailData.runtime) {
            duration = `${detailData.runtime}m`;
          }
        }
      } catch(e) {}
      
      const poster_url = m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : null;
      
      const insert = db.prepare(`
        INSERT INTO movies (id, title, year, genre, duration, synopsis, poster_url, rating)
        VALUES (@id, @title, @year, @genre, @duration, @synopsis, @poster_url, @rating)
        ON CONFLICT(id) DO NOTHING
      `);
      try {
        insert.run({
          id: m.id.toString(),
          title: m.title,
          year,
          genre: genres || 'Unknown',
          duration,
          synopsis: m.overview || 'No synopsis available.',
          poster_url,
          rating: m.vote_average ? parseFloat(m.vote_average.toFixed(1)) : 0
        });
      } catch (e) {}
      
      return { id: m.id.toString(), poster_url };
    }
  } catch (e) {
    console.error("Failed to search movie", e);
  }
  return null;
}
