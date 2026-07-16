import { useState, useEffect, useRef } from "react";
import { motion, useMotionValue, useTransform, useAnimation, AnimatePresence } from "motion/react";
import { Star, ArrowLeft, ArrowRight, ArrowUp, ArrowDown, X } from "lucide-react";
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
}

let cachedMovies: Movie[] = [];
let cachedCurrentIndex: number = 0;
let cachedPage: number = 1;
let initialFetched: boolean = false;

export default function SwipeView({ onColorExtracted }: { onColorExtracted: (color: string) => void }) {
  const [movies, setMovies] = useState<Movie[]>(cachedMovies);
  const [currentIndex, setCurrentIndex] = useState(cachedCurrentIndex);
  const [loading, setLoading] = useState(!initialFetched);
  const [page, setPage] = useState(cachedPage);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  
  const movie = movies[currentIndex];

  const nextMovie = movies[currentIndex + 1];

  const fetchMovies = (pageNum: number) => {
    fetchWithUser(`/api/movies?page=${pageNum}`)
      .then(res => res.json())
      .then(data => {
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
    if (!movie) return;

    fetchWithUser('/api/swipe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ movieId: movie.id, action })
    });

    setCurrentIndex(prev => {
      const nextIdx = prev + 1;
      if (movies.length - nextIdx < 3) {
        setPage(p => p + 1);
      }
      return nextIdx;
    });
  };

  if (loading) return (
    <div className="flex items-center justify-center h-[calc(100vh-160px)]">
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
        className="w-12 h-12 border-4 border-white/10 border-t-[#c9c6c5] rounded-full"
      />
    </div>
  );

  if (!movie) return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-160px)] px-6 text-center">
      <h2 className="text-2xl font-display font-bold mb-2">That's a wrap!</h2>
      <p className="text-white/60">Loading more movies... please wait or head to the chat tab.</p>
    </div>
  );

  return (
    <div className="max-w-md mx-auto px-6 pt-4 h-[calc(100vh-160px)] flex flex-col justify-between">
      <div className="flex justify-center items-center gap-2 mb-2 text-white/50 text-xs font-bold uppercase tracking-wider animate-pulse pt-2">
        <ArrowUp className="w-4 h-4 animate-bounce" />
        <span>Swipe up to add to watchlist</span>
      </div>
      <div className="relative w-full flex-1 min-h-0 flex items-center justify-center perspective-1000 mb-4">
        {/* Next Card (Background) */}
        {nextMovie && (
          <div className="absolute inset-0 w-full h-full rounded-2xl overflow-hidden shadow-2xl transform scale-95 translate-y-4 opacity-50 z-0 border border-white/5 bg-[#2b2a2a]">
            <img src={nextMovie.poster_url || undefined} className="w-full h-full object-cover" alt="" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#141313] via-transparent to-transparent" />
          </div>
        )}

        {/* Current Card */}
        <Card 
          key={movie.id}
          movie={movie} 
          onSwipe={handleSwipe} 
          onColorExtracted={onColorExtracted}
          onClick={() => setSelectedMovie(movie)}
        />
      </div>

      {/* Swipe Instructions */}
      <div className="w-full flex justify-between items-start px-4 py-2 text-white/50 text-[10px] sm:text-xs font-bold tracking-wider">
        <div className="flex flex-col items-center gap-1 w-24 text-center animate-pulse">
          <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 mb-1 animate-bounce" />
          <span>HAVEN'T<br/>WATCHED</span>
        </div>
        <div className="flex flex-col items-center gap-1 w-24 text-center animate-pulse">
          <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6 mb-1 animate-bounce" />
          <span>WATCHED</span>
        </div>
      </div>

      <AnimatePresence>
        {selectedMovie && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setSelectedMovie(null)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-[#141313] border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-10 flex flex-col max-h-[80vh]"
            >
              <button 
                onClick={() => setSelectedMovie(null)}
                className="absolute top-4 right-4 z-20 bg-black/50 p-2 rounded-full text-white/80 hover:text-white hover:bg-black/80 transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="relative h-64 shrink-0">
                <img src={selectedMovie.poster_url || undefined} className="w-full h-full object-cover" alt="" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#141313] to-transparent" />
              </div>
              <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-3xl font-display font-bold text-white leading-tight">{selectedMovie.title}</h2>
                  <div className="flex items-center gap-1 bg-white/10 px-2 py-1 rounded-lg shrink-0">
                    <Star className="w-4 h-4 fill-[#c9c6c5] text-[#c9c6c5]" />
                    <span className="text-sm font-bold">{selectedMovie.rating}</span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 mb-6 text-sm text-[#c9c6c5] font-medium">
                  <span className="bg-white/5 py-1 px-3 rounded-full border border-white/10">{selectedMovie.year}</span>
                  <span className="bg-white/5 py-1 px-3 rounded-full border border-white/10">{selectedMovie.duration || "120m"}</span>
                  <span className="bg-white/5 py-1 px-3 rounded-full border border-white/10">{selectedMovie.genre}</span>
                </div>
                <div className="space-y-4">
                  <h3 className="text-sm font-bold tracking-widest text-white/50 uppercase">Synopsis</h3>
                  <p className="text-white/80 leading-relaxed">
                    {selectedMovie.synopsis}
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Card({ movie, onSwipe, onColorExtracted, onClick }: { movie: Movie, onSwipe: (action: 'Watched' | 'Pass' | 'Watchlist' | 'Not Interested') => void, onColorExtracted: (color: string) => void, onClick?: () => void }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-30, 30]);
  const opacity = useTransform(x, [-200, -150, 0, 150, 200], [0, 1, 1, 1, 0]);
  const scale = useTransform(x, [-200, 0, 200], [0.8, 1, 0.8]);
  
  const likeOpacity = useTransform(x, [25, 75], [0, 1]);
  const passOpacity = useTransform(x, [-75, -25], [1, 0]);
  const watchlistOpacity = useTransform(y, [-75, -25], [1, 0]);
  const notInterestedOpacity = useTransform(y, [25, 75], [0, 1]);

  const controls = useAnimation();
  const imgRef = useRef<HTMLImageElement>(null);
  const isDragging = useRef(false);

  useEffect(() => {
    if (imgRef.current) {
      extractDominantColor(imgRef.current).then(onColorExtracted);
    }
  }, [movie.poster_url]);

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

  return (
    <motion.div
      drag
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.8}
      onDragStart={() => {
        isDragging.current = true;
      }}
      onDragEnd={handleDragEnd}
      onClick={() => {
        if (!isDragging.current) {
          onClick?.();
        }
      }}
      animate={controls}
      style={{ x, y, rotate, opacity, scale }}
      className="absolute inset-0 w-full h-full rounded-2xl overflow-hidden shadow-2xl z-10 border border-white/10 cursor-grab active:cursor-grabbing bg-[#141313] touch-none will-change-transform"
    >
      <img 
        ref={imgRef}
        src={movie.poster_url || undefined} 
        className="absolute inset-0 w-full h-full object-cover" 
        alt={movie.title} 
        referrerPolicy="no-referrer"
      />
      
      {/* Vibe Overlays */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.5)_100%)]" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#141313] via-transparent to-transparent h-2/3 mt-auto" />

      {/* Swipe Indicators */}
      <motion.div style={{ opacity: likeOpacity }} className="absolute top-8 left-8 border-4 border-white text-white font-display font-bold py-2 px-4 rounded-xl -rotate-12">WATCHED</motion.div>
      <motion.div style={{ opacity: passOpacity }} className="absolute top-8 right-8 border-4 border-red-500 text-red-500 font-display font-bold py-2 px-4 rounded-xl rotate-12 text-center text-sm md:text-base leading-tight">HAVEN'T<br/>WATCHED</motion.div>
      <motion.div style={{ opacity: watchlistOpacity }} className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <motion.div className="bg-[#f59e0b] text-black font-display font-bold py-3 px-6 rounded-2xl shadow-2xl">ADD TO WATCHLIST</motion.div>
      </motion.div>
      <motion.div style={{ opacity: notInterestedOpacity }} className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <motion.div className="bg-red-500 text-white font-display font-bold py-3 px-6 rounded-2xl shadow-2xl">IGNORE</motion.div>
      </motion.div>

      {/* Card Info */}
      <div className="absolute bottom-0 w-full p-6 bg-gradient-to-t from-[#141313] to-transparent pt-12">
        <div className="flex justify-between items-end mb-2">
          <h2 className="text-xl md:text-2xl font-display font-bold text-white leading-tight drop-shadow-lg pr-4">{movie.title}</h2>
          <div className="flex items-center gap-1 bg-black/40 px-2 py-1 rounded-lg shrink-0">
            <Star className="w-4 h-4 fill-[#c9c6c5] text-[#c9c6c5]" />
            <span className="text-xs font-bold">{movie.rating}</span>
          </div>
        </div>
        <div className="flex items-center gap-3 mb-3 text-sm text-white/60">
          <span>{movie.year}</span>
          <span className="w-1 h-1 rounded-full bg-white/20" />
          <span>{movie.genre}</span>
        </div>
        <p className="text-sm text-white/80 line-clamp-2 leading-relaxed">
          {movie.synopsis}
        </p>
      </div>
    </motion.div>
  );
}
