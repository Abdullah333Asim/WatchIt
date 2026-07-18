import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Filter, Star, Calendar, ChevronDown, X, Search } from "lucide-react";
import { fetchWithUser } from "../lib/api";

interface Movie {
  id: string;
  title: string;
  year: number;
  genre: string;
  duration: string;
  synopsis: string;
  poster_url: string;
  rating: number;
  action?: string;
}

export default function MovieListView({ listType, onBack }: { listType: 'Watched' | 'Watchlist', onBack: () => void }) {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  
  // Filters
  const [yearFilter, setYearFilter] = useState<string>('');
  const [genreFilter, setGenreFilter] = useState<string>('');
  const [ratingFilter, setRatingFilter] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchWithUser('/api/profile')
      .then(res => res.json())
      .then(data => {
        setMovies(data.history.filter((m: any) => m.action === listType));
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [listType]);

  const handleRemove = async (movieId: string) => {
    try {
      const res = await fetchWithUser(`/api/swipe/${movieId}`, { method: 'DELETE' });
      if (res.ok) {
        setMovies(prev => prev.filter(m => m.id !== movieId));
        setSelectedMovie(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleMoveToWatched = async (movieId: string) => {
    try {
      const res = await fetchWithUser(`/api/swipe/${movieId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'Watched' })
      });
      if (res.ok) {
        // Because we are currently viewing either Watchlist or Watched,
        // if we are in Watchlist and move it to Watched, it should disappear from Watchlist.
        // If we want it to just update, we could map, but it's easier to remove it from this view.
        if (listType === 'Watchlist') {
          setMovies(prev => prev.filter(m => m.id !== movieId));
        } else {
          setMovies(prev => prev.map(m => m.id === movieId ? { ...m, action: 'Watched' } : m));
        }
        setSelectedMovie(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const uniqueGenres = useMemo(() => {
    const genres = new Set<string>();
    movies.forEach(m => {
      if (m.genre) {
        m.genre.split(',').map(g => g.trim()).forEach(g => genres.add(g));
      }
    });
    return Array.from(genres).sort();
  }, [movies]);

  const uniqueYears = useMemo(() => {
    const years = new Set<number>();
    movies.forEach(m => {
      if (m.year) years.add(m.year);
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [movies]);

  const filteredMovies = useMemo(() => {
    return movies.filter(m => {
      if (searchQuery && !m.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (yearFilter && m.year.toString() !== yearFilter) return false;
      if (genreFilter && !m.genre.includes(genreFilter)) return false;
      if (ratingFilter > 0 && m.rating < ratingFilter) return false;
      return true;
    });
  }, [movies, yearFilter, genreFilter, ratingFilter, searchQuery]);

  const clearFilters = () => {
    setYearFilter('');
    setGenreFilter('');
    setRatingFilter(0);
    setSearchQuery('');
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 pb-32 flex flex-col md:flex-row gap-8 relative">
      {/* Desktop Filter Sidebar */}
      <div className={`md:w-64 shrink-0 space-y-6 ${showFilters ? 'block' : 'hidden md:block'}`}>
        <div className="glass-panel p-6 rounded-2xl sticky top-24">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-lg text-white flex items-center gap-2">
              <Filter className="w-5 h-5" /> Filters
            </h3>
            <button onClick={clearFilters} className="text-xs text-white/50 hover:text-white">Clear</button>
          </div>
          
          <div className="space-y-6">
            {/* Year Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/60">Release Year</label>
              <div className="relative">
                <select 
                  value={yearFilter}
                  onChange={(e) => setYearFilter(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white appearance-none outline-none focus:border-[#c9c6c5] transition-colors"
                >
                  <option value="">All Years</option>
                  {uniqueYears.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
              </div>
            </div>

            {/* Genre Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/60">Genre</label>
              <div className="relative">
                <select 
                  value={genreFilter}
                  onChange={(e) => setGenreFilter(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white appearance-none outline-none focus:border-[#c9c6c5] transition-colors"
                >
                  <option value="">All Genres</option>
                  {uniqueGenres.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
              </div>
            </div>

            {/* Rating Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/60">Minimum User Rating</label>
              <div className="relative">
                <select 
                  value={ratingFilter}
                  onChange={(e) => setRatingFilter(Number(e.target.value))}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white appearance-none outline-none focus:border-[#c9c6c5] transition-colors"
                >
                  <option value={0}>Any Rating</option>
                  <option value={5}>5+ Stars</option>
                  <option value={6}>6+ Stars</option>
                  <option value={7}>7+ Stars</option>
                  <option value={8}>8+ Stars</option>
                  <option value={9}>9+ Stars</option>
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1">
        <div className="flex justify-between items-center mb-6">
          <div>
            <button onClick={onBack} className="text-sm text-[#00dce5] hover:underline mb-2">&larr; Back to Profile</button>
            <h1 className="text-3xl font-display font-bold text-white">
              {listType === 'Watchlist' ? 'My Watchlist' : 'Watched Movies'}
            </h1>
            <p className="text-white/50">{filteredMovies.length} movies</p>
          </div>
          
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className="md:hidden glass-panel px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 hover:bg-white/5"
          >
            <Filter className="w-4 h-4" /> Filters
          </button>
        </div>

        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40 pointer-events-none" />
          <input
            type="text"
            placeholder="Search movies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-black/50 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white outline-none focus:border-[#c9c6c5] transition-colors"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 rounded-full border-2 border-t-[#00dce5] border-white/10 animate-spin" />
          </div>
        ) : filteredMovies.length === 0 ? (
          <div className="text-center py-20 glass-panel rounded-3xl border-dashed">
            <p className="text-white/50 text-lg">No movies match your filters.</p>
            <button onClick={clearFilters} className="mt-4 text-[#00dce5] hover:underline">Clear all filters</button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            <AnimatePresence>
              {filteredMovies.map((movie) => (
                <motion.div 
                  key={movie.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="group relative aspect-[2/3] rounded-md overflow-hidden shadow-xl border border-white/5 bg-[#1a1a1a] cursor-pointer"
                  onClick={() => setSelectedMovie(movie)}
                >
                  <img src={movie.poster_url} className="w-full h-full object-cover" alt={movie.title} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity" />
                  
                  <div className="absolute bottom-0 left-0 w-full p-4 translate-y-0 sm:translate-y-4 sm:group-hover:translate-y-0 transition-transform">
                    <h4 className="text-sm font-bold text-white mb-1 leading-tight">{movie.title}</h4>
                    <div className="flex items-center gap-2 text-xs font-medium">
                      <span className="text-white/60">{movie.year}</span>
                      <span className="flex items-center gap-1 text-yellow-400">
                        <Star className="w-3 h-3 fill-current" /> {movie.rating}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedMovie && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80" 
            onClick={() => setSelectedMovie(null)}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-[#111] border border-[#333] p-6 rounded-xl max-w-xs w-full" 
              onClick={e => e.stopPropagation()}
            >
              <div className="flex gap-4 mb-6">
                <img src={selectedMovie.poster_url} className="w-16 h-24 object-cover rounded-sm border border-[#222]" />
                <div className="flex flex-col justify-center overflow-hidden">
                  <h3 className="text-lg font-medium text-white mb-1 leading-tight truncate">{selectedMovie.title}</h3>
                  <p className="text-[#888] text-sm">{selectedMovie.year}</p>
                </div>
              </div>
              <div className="space-y-2">
                {listType === 'Watchlist' && (
                  <button 
                    onClick={() => handleMoveToWatched(selectedMovie.id)}
                    className="w-full py-2.5 bg-white text-black text-sm font-medium rounded-md hover:bg-gray-200 transition-colors"
                  >
                    Mark as Watched
                  </button>
                )}
                <button 
                  onClick={() => handleRemove(selectedMovie.id)}
                  className="w-full py-2.5 bg-[#222] text-red-500 text-sm font-medium rounded-md hover:bg-[#333] transition-colors"
                >
                  Remove from {listType}
                </button>
                <button 
                  onClick={() => setSelectedMovie(null)}
                  className="w-full py-2.5 bg-transparent text-[#888] text-sm font-medium rounded-md hover:text-white transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
