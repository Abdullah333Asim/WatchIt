import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Filter, Star, ChevronDown, X, Search, RotateCcw } from "lucide-react";
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
  imdb_id?: string | null;
}

export default function MovieListView({ listType, onBack }: { listType: 'Watched' | 'Watchlist' | 'Pass', onBack: () => void }) {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);

  const selectedMovieRef = useRef(selectedMovie);
  useEffect(() => {
    selectedMovieRef.current = selectedMovie;
  }, [selectedMovie]);

  // Trap back navigation for movie modal
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const hasMovieModal = !!event.state?.movieModal;
      if (selectedMovieRef.current && !hasMovieModal) {
        setSelectedMovie(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleSelectMovie = (movie: Movie) => {
    setSelectedMovie(movie);
    window.history.pushState({ ...window.history.state, movieModal: true }, '');
  };

  const handleCloseMovie = () => {
    if (window.history.state?.movieModal) {
      window.history.back();
    } else {
      setSelectedMovie(null);
    }
  };
  
  // Filter States
  const [yearFrom, setYearFrom] = useState<string>('');
  const [yearTo, setYearTo] = useState<string>('');
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [minRating, setMinRating] = useState<number>(0);
  const [maxRating, setMaxRating] = useState<number>(10);
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
        handleCloseMovie();
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
        if (listType === 'Watchlist' || listType === 'Pass') {
          setMovies(prev => prev.filter(m => m.id !== movieId));
        } else {
          setMovies(prev => prev.map(m => m.id === movieId ? { ...m, action: 'Watched' } : m));
        }
        handleCloseMovie();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleMoveToWatchlist = async (movieId: string) => {
    try {
      const res = await fetchWithUser(`/api/swipe/${movieId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'Watchlist' })
      });
      if (res.ok) {
        if (listType === 'Pass') {
          setMovies(prev => prev.filter(m => m.id !== movieId));
        }
        handleCloseMovie();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const uniqueGenres = useMemo(() => {
    const genres = new Set<string>();
    movies.forEach(m => {
      if (m.genre) {
        m.genre.split(',').map(g => g.trim()).filter(Boolean).forEach(g => genres.add(g));
      }
    });
    return Array.from(genres).sort();
  }, [movies]);

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    movies.forEach(m => {
      if (m.year && !isNaN(m.year)) years.add(m.year);
    });
    return Array.from(years).sort((a, b) => a - b);
  }, [movies]);

  const toggleGenre = (genre: string) => {
    setSelectedGenres(prev => 
      prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre]
    );
  };

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (yearFrom || yearTo) count++;
    if (selectedGenres.length > 0) count++;
    if (minRating > 0 || maxRating < 10) count++;
    if (searchQuery.trim()) count++;
    return count;
  }, [yearFrom, yearTo, selectedGenres, minRating, maxRating, searchQuery]);

  const clearFilters = () => {
    setYearFrom('');
    setYearTo('');
    setSelectedGenres([]);
    setMinRating(0);
    setMaxRating(10);
    setSearchQuery('');
  };

  const setDecadeRange = (from: number, to: number) => {
    if (yearFrom === String(from) && yearTo === String(to)) {
      setYearFrom('');
      setYearTo('');
    } else {
      setYearFrom(String(from));
      setYearTo(String(to));
    }
  };

  const filteredMovies = useMemo(() => {
    return movies.filter(m => {
      if (searchQuery && !m.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (yearFrom && m.year < Number(yearFrom)) return false;
      if (yearTo && m.year > Number(yearTo)) return false;
      if (selectedGenres.length > 0) {
        const movieGenres = m.genre ? m.genre.split(',').map((g: string) => g.trim()) : [];
        const matches = selectedGenres.some(sg => movieGenres.includes(sg));
        if (!matches) return false;
      }
      const r = Number(m.rating) || 0;
      if (minRating > 0 && r < minRating) return false;
      if (maxRating < 10 && r > maxRating) return false;
      return true;
    });
  }, [movies, yearFrom, yearTo, selectedGenres, minRating, maxRating, searchQuery]);

  const filterSidebarContent = (
    <div className="space-y-6">
      {/* Release Year Range */}
      <div className="space-y-2.5">
        <div className="flex justify-between items-center">
          <label className="text-xs font-semibold uppercase tracking-wider text-white/70">Release Year</label>
          {(yearFrom || yearTo) && (
            <button 
              onClick={() => { setYearFrom(''); setYearTo(''); }} 
              className="text-[11px] text-[#00dce5] hover:underline"
            >
              Reset
            </button>
          )}
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="text-[10px] text-white/40 block mb-1">From</span>
            <div className="relative">
              <select 
                value={yearFrom}
                onChange={(e) => setYearFrom(e.target.value)}
                className="w-full bg-[#181818] border border-white/10 rounded-md px-2.5 py-1.5 text-xs text-white appearance-none outline-none focus:border-[#00dce5] transition-colors"
              >
                <option value="">Any</option>
                {availableYears.map(y => (
                  <option key={y} value={y} disabled={yearTo ? y > Number(yearTo) : false}>{y}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40 pointer-events-none" />
            </div>
          </div>
          <div>
            <span className="text-[10px] text-white/40 block mb-1">To</span>
            <div className="relative">
              <select 
                value={yearTo}
                onChange={(e) => setYearTo(e.target.value)}
                className="w-full bg-[#181818] border border-white/10 rounded-md px-2.5 py-1.5 text-xs text-white appearance-none outline-none focus:border-[#00dce5] transition-colors"
              >
                <option value="">Any</option>
                {[...availableYears].reverse().map(y => (
                  <option key={y} value={y} disabled={yearFrom ? y < Number(yearFrom) : false}>{y}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Quick decade chips */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {[
            { label: '2020s', from: 2020, to: 2029 },
            { label: '2010s', from: 2010, to: 2019 },
            { label: '2000s', from: 2000, to: 2009 },
            { label: '90s', from: 1990, to: 1999 },
            { label: '< 1990', from: 1900, to: 1989 },
          ].map(d => {
            const isActive = yearFrom === String(d.from) && yearTo === String(d.to);
            return (
              <button
                key={d.label}
                type="button"
                onClick={() => setDecadeRange(d.from, d.to)}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
                  isActive
                    ? 'bg-[#00dce5] text-black font-semibold'
                    : 'bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/5'
                }`}
              >
                {d.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Genre Multi-select */}
      <div className="space-y-2.5">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-white/70">Genres</label>
            {selectedGenres.length > 0 && (
              <span className="text-[10px] bg-[#00dce5]/20 text-[#00dce5] px-1.5 py-0.2 rounded font-bold">
                {selectedGenres.length}
              </span>
            )}
          </div>
          {selectedGenres.length > 0 && (
            <button 
              onClick={() => setSelectedGenres([])} 
              className="text-[11px] text-[#00dce5] hover:underline"
            >
              Clear
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pr-1 custom-scrollbar [scrollbar-width:thin] [scrollbar-color:#3f3f46_transparent]">
          {uniqueGenres.map(genre => {
            const isSelected = selectedGenres.includes(genre);
            return (
              <button
                key={genre}
                type="button"
                onClick={() => toggleGenre(genre)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                  isSelected 
                    ? 'bg-[#00dce5] text-black font-semibold shadow-sm shadow-[#00dce5]/20' 
                    : 'bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10'
                }`}
              >
                {genre}
              </button>
            );
          })}
        </div>
      </div>

      {/* Rating Range Dual Slider with Decimal Support */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <label className="text-xs font-semibold uppercase tracking-wider text-white/70">Rating Range</label>
          {(minRating > 0 || maxRating < 10) && (
            <button 
              onClick={() => { setMinRating(0); setMaxRating(10); }} 
              className="text-[11px] text-[#00dce5] hover:underline"
            >
              Reset
            </button>
          )}
        </div>

        <div className="flex items-center justify-between text-xs font-bold text-white px-0.5">
          <span className="flex items-center gap-1 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-md">
            <Star className="w-3 h-3 fill-current" /> {minRating.toFixed(1)}
          </span>
          <span className="text-white/30 text-[11px]">to</span>
          <span className="flex items-center gap-1 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-md">
            <Star className="w-3 h-3 fill-current" /> {maxRating.toFixed(1)}
          </span>
        </div>

        {/* Dual Thumb Range Slider Track */}
        <div className="relative pt-2 pb-2">
          <div className="relative h-2 w-full">
            {/* Background track */}
            <div className="absolute inset-0 bg-white/10 rounded-full" />
            
            {/* Active highlighted range bar */}
            <div 
              className="absolute top-0 bottom-0 bg-[#00dce5] rounded-full"
              style={{
                left: `${(minRating / 10) * 100}%`,
                right: `${100 - (maxRating / 10) * 100}%`
              }}
            />

            {/* Min rating slider */}
            <input 
              type="range" 
              min="0" 
              max="10" 
              step="0.1"
              value={minRating}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setMinRating(Math.min(val, maxRating - 0.2));
              }}
              className="absolute inset-0 w-full appearance-none bg-transparent pointer-events-none z-10 [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-lg [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-0"
              aria-label="Minimum rating"
            />

            {/* Max rating slider */}
            <input 
              type="range" 
              min="0" 
              max="10" 
              step="0.1"
              value={maxRating}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setMaxRating(Math.max(val, minRating + 0.2));
              }}
              className="absolute inset-0 w-full appearance-none bg-transparent pointer-events-none z-10 [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-lg [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-0"
              aria-label="Maximum rating"
            />
          </div>
        </div>

        {/* Quick rating presets */}
        <div className="flex items-center gap-1.5 pt-0.5">
          {[
            { label: 'All', min: 0, max: 10 },
            { label: '6.0+', min: 6.0, max: 10 },
            { label: '7.0+', min: 7.0, max: 10 },
            { label: '8.0+', min: 8.0, max: 10 },
          ].map(p => {
            const isSelected = minRating === p.min && maxRating === p.max;
            return (
              <button
                key={p.label}
                type="button"
                onClick={() => { setMinRating(p.min); setMaxRating(p.max); }}
                className={`flex-1 py-1 rounded text-[11px] font-medium transition-all text-center ${
                  isSelected 
                    ? 'bg-[#00dce5] text-black font-semibold' 
                    : 'bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/5'
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 pb-32 flex flex-col md:flex-row gap-6 lg:gap-8 relative">
      {/* Desktop Filter Sidebar (Pins flush left on PC view) */}
      <aside className="hidden md:block w-64 lg:w-72 shrink-0 md:sticky md:top-20 self-start">
        <div className="bg-[#121212] border border-white/10 rounded-lg p-5 shadow-2xl space-y-6">
          <div className="flex justify-between items-center pb-3 border-b border-white/10">
            <h3 className="font-bold text-base text-white flex items-center gap-2">
              <Filter className="w-4 h-4 text-[#00dce5]" /> Filters
              {activeFiltersCount > 0 && (
                <span className="text-[10px] bg-[#00dce5]/20 text-[#00dce5] px-1.5 py-0.5 rounded-full font-bold">
                  {activeFiltersCount}
                </span>
              )}
            </h3>
            {activeFiltersCount > 0 && (
              <button 
                onClick={clearFilters} 
                className="text-xs text-white/50 hover:text-white transition-colors flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" /> Clear All
              </button>
            )}
          </div>

          {filterSidebarContent}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0">
        {/* Header & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <button 
              onClick={onBack} 
              className="text-xs font-semibold text-[#00dce5] hover:underline mb-1.5 inline-flex items-center gap-1"
            >
              &larr; Back to Profile
            </button>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-white leading-tight">
              {listType === 'Watchlist' ? 'My Watchlist' : listType === 'Watched' ? 'Watched Movies' : 'Not Watched Movies'}
            </h1>
            <p className="text-white/50 text-xs sm:text-sm mt-0.5">
              Showing {filteredMovies.length} of {movies.length} movies
            </p>
          </div>
          
          {/* Mobile Filter Toggle Button */}
          <button 
            onClick={() => setShowMobileFilters(!showMobileFilters)}
            className="md:hidden bg-[#181818] border border-white/10 px-4 py-2 rounded-md text-sm font-medium flex items-center justify-between gap-2 text-white hover:bg-white/5 self-start"
          >
            <span className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-[#00dce5]" /> Filters
              {activeFiltersCount > 0 && (
                <span className="text-[10px] bg-[#00dce5] text-black px-1.5 py-0.5 rounded-full font-bold">
                  {activeFiltersCount}
                </span>
              )}
            </span>
            <ChevronDown className={`w-4 h-4 transition-transform ${showMobileFilters ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Mobile Filter Dropdown Drawer */}
        <AnimatePresence>
          {showMobileFilters && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden overflow-hidden mb-6"
            >
              <div className="bg-[#121212] border border-white/10 rounded-lg p-5 shadow-2xl space-y-6">
                <div className="flex justify-between items-center pb-3 border-b border-white/10">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">Refine Results</span>
                  {activeFiltersCount > 0 && (
                    <button onClick={clearFilters} className="text-xs text-[#00dce5] hover:underline">Clear All</button>
                  )}
                </div>
                {filterSidebarContent}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search Input */}
        <div className="relative mb-6">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by movie title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#141414] border border-white/10 rounded-md pl-10 pr-10 py-2.5 text-sm text-white placeholder:text-white/40 outline-none focus:border-[#00dce5] transition-colors"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Movies Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="w-8 h-8 rounded-full border-2 border-t-[#00dce5] border-white/10 animate-spin mb-3" />
            <p className="text-xs text-white/40 font-medium">Loading collection...</p>
          </div>
        ) : filteredMovies.length === 0 ? (
          <div className="text-center py-20 bg-[#121212] border border-dashed border-white/10 rounded-lg p-8">
            <p className="text-white/60 text-base font-medium mb-1">No movies match your filters</p>
            <p className="text-white/40 text-xs mb-4">Try adjusting your year, genre, or rating criteria.</p>
            {activeFiltersCount > 0 && (
              <button 
                onClick={clearFilters} 
                className="px-4 py-2 bg-[#00dce5] text-black text-xs font-bold rounded-md hover:bg-[#00c5cd] transition-colors cursor-pointer"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 sm:gap-4">
            <AnimatePresence>
              {filteredMovies.map((movie) => (
                <motion.div 
                  key={movie.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="group relative aspect-[2/3] rounded-md overflow-hidden shadow-lg border border-white/5 bg-[#141414] cursor-pointer"
                  onClick={() => handleSelectMovie(movie)}
                >
                  <img 
                    src={movie.poster_url} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                    alt={movie.title ? `Poster for ${movie.title}` : "Movie poster"} 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity" />
                  
                  <div className="absolute bottom-0 left-0 w-full p-3 translate-y-0 sm:translate-y-3 sm:group-hover:translate-y-0 transition-transform">
                    <h2 className="text-xs sm:text-sm font-bold text-white mb-1 leading-tight truncate">{movie.title}</h2>
                    <div className="flex items-center gap-2 text-[11px] font-medium">
                      <span className="text-white/60">{movie.year}</span>
                      {movie.rating != null && (
                        <span className="flex items-center gap-0.5 text-yellow-400 font-semibold">
                          <Star className="w-3 h-3 fill-current" /> {Number(movie.rating).toFixed(1)}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* Selected Movie Modal */}
      <AnimatePresence>
        {selectedMovie && (() => {
          const imdbId = selectedMovie.imdb_id || (selectedMovie as any).imdbId;
          const imdbUrl = imdbId ? `https://www.imdb.com/title/${imdbId}/` : null;

          return (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" 
              onClick={handleCloseMovie}
            >
              <motion.div 
                initial={{ scale: 0.95, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 10 }}
                className="bg-[#141414] border border-white/10 p-5 rounded-lg max-w-xs w-full shadow-2xl" 
                onClick={e => e.stopPropagation()}
              >
                <div className="flex gap-3.5 mb-5">
                  {imdbUrl ? (
                    <a
                      href={imdbUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 transition-transform hover:scale-105"
                      title="Open in IMDb"
                    >
                      <img 
                        src={selectedMovie.poster_url} 
                        className="w-16 h-24 object-cover rounded-md border border-white/10" 
                        alt={selectedMovie.title ? `Poster for ${selectedMovie.title}` : "Movie poster"} 
                      />
                    </a>
                  ) : (
                    <div className="shrink-0">
                      <img 
                        src={selectedMovie.poster_url} 
                        className="w-16 h-24 object-cover rounded-md border border-white/10" 
                        alt={selectedMovie.title ? `Poster for ${selectedMovie.title}` : "Movie poster"} 
                      />
                    </div>
                  )}

                  <div className="flex flex-col justify-center overflow-hidden">
                    {imdbUrl ? (
                      <a
                        href={imdbUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline hover:text-[#F5C518] transition-colors"
                        title="Open in IMDb"
                      >
                        <h3 className="text-base font-bold text-white mb-1 leading-tight truncate">
                          {selectedMovie.title}
                        </h3>
                      </a>
                    ) : (
                      <h3 className="text-base font-bold text-white mb-1 leading-tight truncate">
                        {selectedMovie.title}
                      </h3>
                    )}
                    <div className="flex items-center gap-2 text-xs text-white/60">
                      <span>{selectedMovie.year}</span>
                      {selectedMovie.rating != null && (
                        <span className="flex items-center gap-0.5 text-yellow-400 font-bold">
                          <Star className="w-3 h-3 fill-current" /> {Number(selectedMovie.rating).toFixed(1)}
                        </span>
                      )}
                    </div>
                    {selectedMovie.genre && (
                      <p className="text-[11px] text-white/40 truncate mt-1">{selectedMovie.genre}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  {listType === 'Watchlist' && (
                    <button 
                      onClick={() => handleMoveToWatched(selectedMovie.id)}
                      className="w-full py-2 bg-white text-black text-xs font-bold rounded-md hover:bg-gray-200 transition-colors cursor-pointer"
                    >
                      Mark as Watched
                    </button>
                  )}

                  {listType === 'Pass' && (
                    <>
                      <button 
                        onClick={() => handleMoveToWatchlist(selectedMovie.id)}
                        className="w-full py-2 bg-[#f59e0b] hover:bg-[#d97706] text-black text-xs font-bold rounded-md transition-colors cursor-pointer"
                      >
                        Add to Watchlist
                      </button>
                      <button 
                        onClick={() => handleMoveToWatched(selectedMovie.id)}
                        className="w-full py-2 bg-white text-black text-xs font-bold rounded-md hover:bg-gray-200 transition-colors cursor-pointer"
                      >
                        Mark as Watched
                      </button>
                    </>
                  )}

                  {imdbUrl ? (
                    <a
                      href={imdbUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2 bg-[#F5C518] hover:bg-[#e2b616] text-black text-xs font-bold rounded-md transition-colors shadow-md flex items-center justify-center gap-1.5 text-center cursor-pointer"
                    >
                      Open in IMDb
                    </a>
                  ) : (
                    <button
                      disabled
                      className="w-full py-2 bg-[#F5C518]/40 text-black/50 text-xs font-bold rounded-md cursor-not-allowed flex items-center justify-center gap-1.5 text-center"
                      title="IMDb link not available"
                    >
                      Open in IMDb
                    </button>
                  )}

                  <button 
                    onClick={() => handleRemove(selectedMovie.id)}
                    className="w-full py-2 bg-red-500/10 text-red-500 text-xs font-semibold rounded-md hover:bg-red-500/20 transition-colors cursor-pointer"
                  >
                    {listType === 'Pass' ? 'Reset to Swipe Queue' : `Remove from ${listType}`}
                  </button>

                  <button 
                    onClick={handleCloseMovie}
                    className="w-full py-2 bg-transparent text-white/50 text-xs font-semibold rounded-md hover:text-white transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
