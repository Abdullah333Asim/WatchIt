import { useState, useEffect, useRef } from "react";
import { motion, useMotionValue, useTransform, useAnimation, AnimatePresence } from "motion/react";
import { Star, ArrowLeft, ArrowRight, ArrowUp, ArrowDown, X, RotateCcw } from "lucide-react";
import { extractDominantColor } from "../lib/color";
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
  imdb_id?: string | null;
}

let cachedMovies: Movie[] = [];
let cachedCurrentIndex: number = 0;
let cachedPage: number = 1;
let initialFetched: boolean = false;

const preloadMovies = async () => {
  if (initialFetched) return;
  try {
    const res = await fetchWithUser(`/api/movies?page=${cachedPage}`);
    if (!res.ok) return;
    const data = await res.json();
    if (!Array.isArray(data)) return;
    const existingIds = new Set(cachedMovies.map(m => m.id));
    const newMovies: Movie[] = [];
    for (const m of data) {
      if (!existingIds.has(m.id)) {
        newMovies.push(m);
        existingIds.add(m.id);
      }
    }
    cachedMovies = [...cachedMovies, ...newMovies];
    initialFetched = true;
  } catch (err) {
    console.error("Preload movies error:", err);
  }
};

export default function SwipeView({ onColorExtracted }: { onColorExtracted: (color: string) => void }) {
  const [movies, setMovies] = useState<Movie[]>(cachedMovies);
  const [currentIndex, setCurrentIndex] = useState(cachedCurrentIndex);
  const [loading, setLoading] = useState(!initialFetched && cachedMovies.length === 0);
  const [page, setPage] = useState(cachedPage);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [isFetching, setIsFetching] = useState(false);

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

  const handleSelectMovie = (m: Movie) => {
    setSelectedMovie(m);
    window.history.pushState({ ...window.history.state, movieModal: true }, '');
  };

  const handleCloseMovie = () => {
    if (window.history.state?.movieModal) {
      window.history.back();
    } else {
      setSelectedMovie(null);
    }
  };

  const isFetchingRef = useRef(false);

  const fetchMovies = (pageNum: number) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setIsFetching(true);
    fetchWithUser(`/api/movies?page=${pageNum}`)
      .then(res => {
        if (!res.ok) {
          throw new Error(`Failed to fetch movies (${res.status})`);
        }
        return res.json();
      })
      .then(data => {
        if (!Array.isArray(data)) {
          console.warn("Unexpected movies payload:", data);
          return;
        }
        setMovies(prev => {
          const existingIds = new Set(prev.map(m => m.id));
          const newMovies: Movie[] = [];
          for (const m of data) {
            if (!existingIds.has(m.id)) {
              newMovies.push(m);
              existingIds.add(m.id);
            }
          }
          const updatedMovies = [...prev, ...newMovies];
          cachedMovies = updatedMovies;
          return updatedMovies;
        });
        setLoading(false);
        initialFetched = true;
      })
      .catch(err => {
        console.error("Failed to fetch movies batch:", err);
        setLoading(false);
      })
      .finally(() => {
        isFetchingRef.current = false;
        setIsFetching(false);
      });
  };

  const lastFetchedPage = useRef(initialFetched ? cachedPage : 0);

  useEffect(() => {
    cachedCurrentIndex = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    cachedPage = page;
    if (page === lastFetchedPage.current) {
      return;
    }
    lastFetchedPage.current = page;
    fetchMovies(page);
  }, [page]);

  const handleSwipe = async (action: 'Watched' | 'Pass' | 'Watchlist' | 'Not Interested') => {
    const currentMovie = movies[currentIndex];
    if (!currentMovie) return;

    fetchWithUser('/api/swipe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ movieId: currentMovie.id, action })
    });

    setCurrentIndex(prev => {
      const nextIdx = prev + 1;
      // Pre-fetch next batch of movies when 6 or fewer cards remain in queue
      if (movies.length - nextIdx <= 6 && !isFetchingRef.current) {
        setPage(p => p + 1);
      }
      return nextIdx;
    });
  };

  const stackMovies = movies.slice(currentIndex, currentIndex + 3);

  // Automatically request next batch if stack runs empty and not currently fetching
  useEffect(() => {
    if (!loading && !isFetching && stackMovies.length === 0) {
      setPage(p => p + 1);
    }
  }, [stackMovies.length, loading, isFetching]);

  if (loading || (stackMovies.length === 0 && isFetching)) return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-160px)]">
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
        className="w-12 h-12 border-4 border-white/10 border-t-[#c9c6c5] rounded-full mb-3"
      />
      <p className="text-white/40 text-xs font-medium animate-pulse">Loading fresh movies...</p>
    </div>
  );

  if (stackMovies.length === 0) return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-160px)] px-6 text-center">
      <h2 className="text-2xl font-display font-bold mb-2">That's a wrap!</h2>
      <p className="text-white/60 mb-5 max-w-xs">No movies currently in your queue. You can try loading more or head to the chat tab.</p>
      <button
        onClick={() => {
          setLoading(true);
          cachedMovies = [];
          cachedCurrentIndex = 0;
          initialFetched = false;
          lastFetchedPage.current = 0;
          setCurrentIndex(0);
          setMovies([]);
          setPage(p => p + 1);
        }}
        className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-semibold transition-all border border-white/10 active:scale-95 flex items-center gap-2 cursor-pointer shadow-lg"
      >
        <RotateCcw className="w-4 h-4" /> Load Movies
      </button>
    </div>
  );

  return (
    <div className="relative max-w-md mx-auto px-6 pt-2 h-[calc(100vh-160px)] flex flex-col justify-between overflow-visible">
      <h1 className="sr-only">Swipe & Discover AI Movie Recommendations</h1>

      {/* Keyboard Shortcuts Guide (Desktop Only) */}
      <div className="hidden md:flex flex-col fixed left-8 top-1/2 -translate-y-1/2 gap-2 text-white/50 z-50 pointer-events-none">
        <div className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-0.5">Controls</div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <kbd className="w-6 h-6 flex items-center justify-center bg-white/5 rounded border border-white/10 font-mono text-[10px] text-white shadow-lg">W</kbd>
            <kbd className="w-6 h-6 flex items-center justify-center bg-white/5 rounded border border-white/10 font-mono text-[10px] text-white shadow-lg">↑</kbd>
          </div>
          <span className="text-[10px] font-medium text-[#f59e0b]">Watchlist</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <kbd className="w-6 h-6 flex items-center justify-center bg-white/5 rounded border border-white/10 font-mono text-[10px] text-white shadow-lg">A</kbd>
            <kbd className="w-6 h-6 flex items-center justify-center bg-white/5 rounded border border-white/10 font-mono text-[10px] text-white shadow-lg">←</kbd>
          </div>
          <span className="text-[10px] font-medium text-red-500">Not Watched</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <kbd className="w-6 h-6 flex items-center justify-center bg-white/5 rounded border border-white/10 font-mono text-[10px] text-white shadow-lg">S</kbd>
            <kbd className="w-6 h-6 flex items-center justify-center bg-white/5 rounded border border-white/10 font-mono text-[10px] text-white shadow-lg">↓</kbd>
          </div>
          <span className="text-[10px] font-medium">Ignore</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <kbd className="w-6 h-6 flex items-center justify-center bg-white/5 rounded border border-white/10 font-mono text-[10px] text-white shadow-lg">D</kbd>
            <kbd className="w-6 h-6 flex items-center justify-center bg-white/5 rounded border border-white/10 font-mono text-[10px] text-white shadow-lg">→</kbd>
          </div>
          <span className="text-[10px] font-medium text-[#00dce5]">Watched</span>
        </div>
      </div>

      {/* Mobile Floating Side Indicators (Isolated from card layout flow) */}
      <div className="md:hidden pointer-events-none absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center gap-1 text-white/50 animate-pulse">
        <ArrowLeft className="w-5 h-5 mb-0.5 animate-bounce" />
        <span className="text-[10px] font-bold tracking-wider uppercase text-center leading-tight">NOT<br/>WATCHED</span>
      </div>

      <div className="md:hidden pointer-events-none absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center gap-1 text-white/50 animate-pulse">
        <ArrowRight className="w-5 h-5 mb-0.5 animate-bounce" />
        <span className="text-[10px] font-bold tracking-wider uppercase text-center leading-tight">WATCHED</span>
      </div>

      <div className="flex justify-center items-center gap-2 mb-2 text-white/50 text-xs font-bold uppercase tracking-wider animate-pulse pt-2 md:hidden shrink-0">
        <ArrowUp className="w-4 h-4 animate-bounce" />
        <span>Swipe up to add to watchlist</span>
      </div>

      {/* 3-Card Stack Container with strictly defined flex bounds */}
      <div className="relative w-full flex-1 min-h-0 max-h-[600px] flex items-center justify-center perspective-1000 my-auto overflow-visible">
        {stackMovies.slice().reverse().map((m, revIdx) => {
          const stackIndex = stackMovies.length - 1 - revIdx;
          return (
            <Card 
              key={m.id}
              movie={m} 
              stackIndex={stackIndex}
              onSwipe={handleSwipe} 
              onColorExtracted={onColorExtracted}
              onClick={() => handleSelectMovie(m)}
              isActive={!selectedMovie}
            />
          );
        })}
      </div>

      <AnimatePresence>
        {selectedMovie && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={handleCloseMovie}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-[#141313] border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-10 flex flex-col max-h-[80vh]"
            >
              <button 
                onClick={handleCloseMovie}
                className="absolute top-4 right-4 z-20 bg-black/50 p-2 rounded-full text-white/80 hover:text-white hover:bg-black/80 transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="relative h-64 shrink-0">
                <img src={selectedMovie.poster_url || undefined} className="w-full h-full object-cover" alt={selectedMovie.title ? `Poster for ${selectedMovie.title}` : "Movie poster"} />
                <div className="absolute inset-0 bg-gradient-to-t from-[#141313] to-transparent" />
              </div>
              <div className="p-6 overflow-y-auto flex-1 custom-scrollbar [scrollbar-width:thin] [scrollbar-color:#3f3f46_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#3f3f46] [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-[#52525b]">
                <div className="flex justify-between items-start gap-4 mb-3">
                  <h2 className="text-2xl font-display font-bold text-white leading-tight flex-1">{selectedMovie.title}</h2>
                  <div className="flex items-center gap-1 bg-white/10 px-2.5 py-1 rounded-lg shrink-0">
                    <Star className="w-4 h-4 fill-[#c9c6c5] text-[#c9c6c5]" />
                    <span className="text-sm font-bold">{selectedMovie.rating}</span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2.5 mb-6">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[#c9c6c5] font-medium">
                    <span className="bg-white/5 py-1 px-3 rounded-full border border-white/10">{selectedMovie.year}</span>
                    <span className="bg-white/5 py-1 px-3 rounded-full border border-white/10">{selectedMovie.duration || "120m"}</span>
                    <span className="bg-white/5 py-1 px-3 rounded-full border border-white/10">{selectedMovie.genre}</span>
                  </div>
                  {(selectedMovie.imdb_id || (selectedMovie as any).imdbId) && (
                    <a
                      href={`https://www.imdb.com/title/${selectedMovie.imdb_id || (selectedMovie as any).imdbId}/`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-[#F5C518] hover:bg-[#e2b616] text-black text-[11px] sm:text-xs font-bold px-2.5 py-1 rounded-md transition-colors shadow-sm inline-flex items-center gap-1 shrink-0 ml-auto"
                    >
                      Open in IMDb
                    </a>
                  )}
                </div>
                <div className="space-y-4">
                  <h3 className="text-xs font-bold tracking-widest text-white/50 uppercase">Synopsis</h3>
                  <p className="text-sm text-white/80 leading-relaxed">
                    {selectedMovie.synopsis}
                  </p>
                </div>
                <MovieReviews movieId={selectedMovie.id} />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Card({ 
  movie, 
  stackIndex, 
  onSwipe, 
  onColorExtracted, 
  onClick, 
  isActive = true 
}: { 
  movie: Movie; 
  stackIndex: number; 
  onSwipe: (action: 'Watched' | 'Pass' | 'Watchlist' | 'Not Interested') => void; 
  onColorExtracted: (color: string) => void; 
  onClick?: () => void; 
  isActive?: boolean; 
}) {
  const isTop = stackIndex === 0;
  const canInteract = isTop && isActive;

  // Drag and swipe motion values (active on top card)
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-30, 30]);
  const dragOpacity = useTransform(x, [-200, -150, 0, 150, 200], [0, 1, 1, 1, 0]);
  const dragScale = useTransform(x, [-200, 0, 200], [0.8, 1, 0.8]);
  
  const likeOpacity = useTransform(x, [25, 75], [0, 1]);
  const passOpacity = useTransform(x, [-75, -25], [1, 0]);
  const watchlistOpacity = useTransform(y, [-75, -25], [1, 0]);
  const notInterestedOpacity = useTransform(y, [25, 75], [0, 1]);

  const controls = useAnimation();
  const imgRef = useRef<HTMLImageElement>(null);
  const isDragging = useRef(false);

  useEffect(() => {
    if (!canInteract) return;

    const handleKeyDown = async (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (isDragging.current) return;

      let action: 'Watched' | 'Pass' | 'Watchlist' | 'Not Interested' | null = null;
      let targetX = 0;
      let targetY = 0;

      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          action = 'Watchlist';
          targetY = -1000;
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          action = 'Not Interested';
          targetY = 1000;
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          action = 'Pass';
          targetX = -1000;
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          action = 'Watched';
          targetX = 1000;
          break;
        default:
          return;
      }

      e.preventDefault();
      isDragging.current = true;
      await controls.start({ x: targetX, y: targetY, transition: { duration: 0.3 } });
      onSwipe(action);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canInteract, onSwipe, controls]);

  useEffect(() => {
    if (isTop && imgRef.current) {
      extractDominantColor(imgRef.current).then(onColorExtracted);
    }
  }, [movie.poster_url, isTop, onColorExtracted]);

  const handleDragEnd = async (_: any, info: any) => {
    setTimeout(() => {
      isDragging.current = false;
    }, 100);

    if (info.offset.x > 75) {
      await controls.start({ x: 1000, transition: { duration: 0.3 } });
      onSwipe('Watched');
    } else if (info.offset.x < -75) {
      await controls.start({ x: -1000, transition: { duration: 0.3 } });
      onSwipe('Pass');
    } else if (info.offset.y < -75) {
      await controls.start({ y: -1000, transition: { duration: 0.3 } });
      onSwipe('Watchlist');
    } else if (info.offset.y > 75) {
      await controls.start({ y: 1000, transition: { duration: 0.3 } });
      onSwipe('Not Interested');
    } else {
      controls.start({ x: 0, y: 0, transition: { type: "spring", stiffness: 300, damping: 20 } });
    }
  };

  // "Messy deck" stacking: alternating rotation & x-offset for depth
  const targetScale = stackIndex === 0 ? 1 : stackIndex === 1 ? 0.96 : 0.92;
  const targetX = stackIndex === 0 ? 0 : stackIndex === 1 ? -12 : 12;
  const targetY = stackIndex === 0 ? 0 : stackIndex === 1 ? 2 : -2;
  const targetRotate = stackIndex === 0 ? 0 : stackIndex === 1 ? -4 : 3;
  const targetOpacity = stackIndex === 2 ? 0.75 : stackIndex === 1 ? 0.9 : 1;

  return (
    <motion.div
      key={movie.id}
      className="absolute top-0 left-0 w-full h-full overflow-visible"
      style={{
        zIndex: 30 - stackIndex * 10,
        pointerEvents: canInteract ? 'auto' : 'none',
        transformOrigin: "center center"
      }}
      initial={{
        scale: targetScale,
        x: targetX,
        y: targetY,
        rotate: targetRotate,
        opacity: targetOpacity
      }}
      animate={{
        scale: targetScale,
        x: targetX,
        y: targetY,
        rotate: targetRotate,
        opacity: targetOpacity
      }}
      transition={{
        type: "spring",
        stiffness: 320,
        damping: 26,
        mass: 0.8
      }}
    >
      <motion.div
        drag={canInteract}
        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
        dragElastic={0.8}
        onDragStart={() => {
          if (canInteract) isDragging.current = true;
        }}
        onDragEnd={handleDragEnd}
        onClick={() => {
          if (canInteract && !isDragging.current) {
            onClick?.();
          }
        }}
        animate={controls}
        style={isTop ? { x, y, rotate, opacity: dragOpacity, scale: dragScale } : undefined}
        className={`relative w-full h-full rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-[#141313] will-change-transform ${
          isTop ? 'cursor-grab active:cursor-grabbing touch-none z-10' : 'cursor-default pointer-events-none'
        }`}
      >
        <img 
          ref={imgRef}
          src={movie.poster_url || undefined} 
          className="absolute inset-0 w-full h-full object-cover" 
          alt={movie.title ? `Poster for ${movie.title}` : "Movie poster"} 
          referrerPolicy="no-referrer"
        />
        
        {/* Vibe Overlays */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.5)_100%)]" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#141313] via-transparent to-transparent h-2/3 mt-auto" />

        {/* Subtle dimming layer for cards sitting behind top card */}
        {!isTop && (
          <div className="absolute inset-0 bg-black/25 pointer-events-none rounded-2xl transition-opacity duration-300" />
        )}

        {/* Swipe Indicators (Top Card Only) */}
        {isTop && (
          <>
            <motion.div style={{ opacity: likeOpacity }} className="absolute top-8 left-8 border-4 border-white text-white font-display font-bold py-2 px-4 rounded-xl -rotate-12 pointer-events-none z-30">
              WATCHED
            </motion.div>
            <motion.div style={{ opacity: passOpacity }} className="absolute top-8 right-8 border-4 border-red-500 text-red-500 font-display font-bold py-2 px-4 rounded-xl rotate-12 text-center text-sm md:text-base leading-tight pointer-events-none z-30">
              NOT WATCHED
            </motion.div>
            <motion.div style={{ opacity: watchlistOpacity }} className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
              <motion.div className="bg-[#f59e0b] text-black font-display font-bold py-3 px-6 rounded-2xl shadow-2xl">
                ADD TO WATCHLIST
              </motion.div>
            </motion.div>
            <motion.div style={{ opacity: notInterestedOpacity }} className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
              <motion.div className="bg-red-500 text-white font-display font-bold py-3 px-6 rounded-2xl shadow-2xl">
                IGNORE
              </motion.div>
            </motion.div>
          </>
        )}

        {/* Card Info */}
        <div className="absolute bottom-0 w-full p-6 bg-gradient-to-t from-[#141313] via-[#141313]/90 to-transparent pt-12 z-20">
          <div className="flex justify-between items-end mb-2">
            <h2 className="text-xl md:text-2xl font-display font-bold text-white leading-tight drop-shadow-lg pr-4">{movie.title}</h2>
            <div className="flex items-center gap-1 bg-black/40 px-2 py-1 rounded-lg shrink-0">
              <Star className="w-4 h-4 fill-[#c9c6c5] text-[#c9c6c5]" />
              <span className="text-xs font-bold">{movie.rating}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 mb-3 text-sm text-white/60">
            <span>{movie.year}</span>
            <span className="w-1 h-1 rounded-full bg-white/20" />
            <span>{movie.genre}</span>
          </div>
          <p className="text-sm text-white/80 line-clamp-2 leading-relaxed">
            {movie.synopsis}
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

function MovieReviews({ movieId }: { movieId: string }) {
  const [reviews, setReviews] = useState<{author: string, content: string}[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    fetchWithUser(`/api/movies/${movieId}/reviews`)
      .then(res => res.json())
      .then(data => {
        if (isMounted) {
          setReviews(Array.isArray(data) ? data : []);
          setLoading(false);
        }
      })
      .catch(err => {
        console.error("Failed to fetch reviews", err);
        if (isMounted) {
          setReviews([]);
          setLoading(false);
        }
      });
    return () => { isMounted = false; };
  }, [movieId]);

  if (loading) {
    return (
      <div className="space-y-4 mt-8 border-t border-white/10 pt-6">
        <h3 className="text-xs font-bold tracking-widest text-white/50 uppercase">User Reviews</h3>
        <div className="animate-pulse space-y-3">
          <div className="h-3 bg-white/10 rounded w-1/4"></div>
          <div className="h-8 bg-white/10 rounded w-full"></div>
          <div className="h-3 bg-white/10 rounded w-1/4 mt-4"></div>
          <div className="h-8 bg-white/10 rounded w-full"></div>
        </div>
      </div>
    );
  }

  if (reviews.length === 0) return null;

  return (
    <div className="space-y-4 mt-8 border-t border-white/10 pt-6">
      <h3 className="text-xs font-bold tracking-widest text-white/50 uppercase">User Reviews</h3>
      <div className="space-y-4">
        {reviews.map((r, i) => (
          <div key={i} className="bg-white/5 p-4 rounded-xl border border-white/5">
            <div className="text-xs font-bold text-white mb-1.5">{r.author}</div>
            <p className="text-sm text-white/70 italic">"{r.content}"</p>
          </div>
        ))}
      </div>
    </div>
  );
}
