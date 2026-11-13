import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { User, Fingerprint, ChevronRight, Moon, Tv, Shield, Play, X } from "lucide-react";
import { fetchWithUser } from "../lib/api";
import { logout } from "../lib/firebase.ts";
import StarRating from "./StarRating";
const isPassAction = (action: string | undefined | null) => action === 'Pass' || action === 'Not Watched';
const matchesListType = (action: string | undefined | null, type: 'Watched' | 'Watchlist' | 'Pass') => {
  if (type === 'Pass') return isPassAction(action);
  return action === type;
};

export default function ProfileView({ onViewList, isActive = true }: { onViewList: (type: 'Watched' | 'Watchlist' | 'Pass') => void; isActive?: boolean }) {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(() => {
    return !!window.history.state?.profileEditing;
  });
  const [selectedMovie, setSelectedMovie] = useState<any>(null);
  const [currentTrailerKey, setCurrentTrailerKey] = useState<string | null>(null);
  const [activeTrailerKey, setActiveTrailerKey] = useState<string | null>(null);
  const [isTrailerLoading, setIsTrailerLoading] = useState(false);

  useEffect(() => {
    if (!selectedMovie) {
      setCurrentTrailerKey(null);
      setActiveTrailerKey(null);
      setIsTrailerLoading(false);
      return;
    }
    const key = selectedMovie.trailer_key || (selectedMovie as any).trailerKey;
    if (key) {
      setCurrentTrailerKey(key);
      setIsTrailerLoading(false);
    } else {
      setIsTrailerLoading(true);
      fetchWithUser(`/api/movies/${selectedMovie.id}/trailer`)
        .then(res => res.ok ? res.json() : { trailer_key: null })
        .then(data => {
          setCurrentTrailerKey(data?.trailer_key || null);
        })
        .catch(() => {
          setCurrentTrailerKey(null);
        })
        .finally(() => {
          setIsTrailerLoading(false);
        });
    }
  }, [selectedMovie]);

  const [castMembers, setCastMembers] = useState<string[]>([]);
  const [isCastLoading, setIsCastLoading] = useState(false);
  const [movieExtra, setMovieExtra] = useState<{ duration?: string; synopsis?: string }>({});

  useEffect(() => {
    if (!selectedMovie?.id) {
      setCastMembers([]);
      setIsCastLoading(false);
      setMovieExtra({});
      return;
    }
    setIsCastLoading(true);

    // 1. Fetch credits from TMDB endpoint (returns cast, runtime, overview)
    fetchWithUser(`/api/movies/${selectedMovie.id}/credits`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) {
          if (Array.isArray(data.cast) && data.cast.length > 0) {
            setCastMembers(data.cast);
          }
          if (data.duration || data.synopsis) {
            setMovieExtra(prev => ({
              ...prev,
              duration: data.duration || prev.duration,
              synopsis: (data.synopsis && data.synopsis !== 'No synopsis available.') ? data.synopsis : prev.synopsis
            }));
          }
        }
      })
      .catch(() => {})
      .finally(() => {
        setIsCastLoading(false);
      });

    // 2. Fallback: if selectedMovie is missing synopsis, query direct movie endpoint
    if (!selectedMovie.synopsis || selectedMovie.synopsis === 'No synopsis available.') {
      fetchWithUser(`/api/movies/${selectedMovie.id}`)
        .then(res => res.ok ? res.json() : null)
        .then(dbMovie => {
          if (dbMovie) {
            if (dbMovie.synopsis && dbMovie.synopsis !== 'No synopsis available.') {
              setMovieExtra(prev => ({ ...prev, synopsis: dbMovie.synopsis }));
            }
            if (dbMovie.duration) {
              setMovieExtra(prev => ({ ...prev, duration: dbMovie.duration }));
            }
          }
        })
        .catch(() => {});
    }
  }, [selectedMovie?.id]);
  
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editAvatar, setEditAvatar] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const isEditingRef = useRef(isEditing);
  const profileRef = useRef(profile);
  const selectedMovieRef = useRef(selectedMovie);

  useEffect(() => {
    isEditingRef.current = isEditing;
  }, [isEditing]);

  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  useEffect(() => {
    selectedMovieRef.current = selectedMovie;
  }, [selectedMovie]);

  const [cols, setCols] = useState(4);

  useEffect(() => {
    const updateCols = () => {
      const w = window.innerWidth;
      if (w >= 1024) setCols(8);
      else if (w >= 768) setCols(6);
      else if (w >= 640) setCols(5);
      else setCols(4);
    };
    updateCols();
    window.addEventListener('resize', updateCols);
    return () => window.removeEventListener('resize', updateCols);
  }, []);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchProfileData = () => {
    fetchWithUser(`/api/profile?t=${Date.now()}`)
      .then(async (res) => {
        if (!res.ok) {
          localStorage.removeItem('guest_token');
          logout().then(() => window.location.reload());
          throw new Error("Failed to fetch profile");
        }
        return res.json();
      })
      .then(data => {
        setProfile(data);
        if (!isEditingRef.current) {
          setEditName(data.name || "");
          setEditBio(data.bio || "");
          setEditAvatar(data.avatar_url || "");
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Profile fetch error:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    if (isActive) {
      fetchProfileData();
    }
  }, [isActive]);

  useEffect(() => {
    fetchProfileData();

    const handleFocus = () => fetchProfileData();
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') fetchProfileData();
    };

    const handleTabActivated = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (!customEvent.detail || customEvent.detail.tab === 'profile') {
        fetchProfileData();
      }
    };

    const handleSwipeSaved = () => {
      fetchProfileData();
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('watchit:tab-activated', handleTabActivated);
    window.addEventListener('watchit:swipe-saved', handleSwipeSaved);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('watchit:tab-activated', handleTabActivated);
      window.removeEventListener('watchit:swipe-saved', handleSwipeSaved);
    };
  }, []);

  // Listen to popstate to trap back button for Edit Profile mode and movie modal
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      // 1. Movie modal
      const hasMovieModal = !!event.state?.movieModal;
      if (selectedMovieRef.current && !hasMovieModal) {
        setSelectedMovie(null);
      }

      // 2. Profile edit mode
      const hasEditing = !!event.state?.profileEditing;
      if (isEditingRef.current && !hasEditing) {
        setIsEditing(false);
        if (profileRef.current) {
          setEditName(profileRef.current.name || "");
          setEditBio(profileRef.current.bio || "");
          setEditAvatar(profileRef.current.avatar_url || "");
        }
      } else if (!isEditingRef.current && hasEditing) {
        setIsEditing(true);
      }

      // 3. Tab popstate
      if (window.history.state?.tab === 'profile') {
        fetchProfileData();
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleStartEdit = () => {
    setIsEditing(true);
    window.history.pushState({ ...window.history.state, profileEditing: true }, '');
  };

  const handleCancelEdit = () => {
    if (window.history.state?.profileEditing) {
      window.history.back();
    } else {
      setIsEditing(false);
      if (profile) {
        setEditName(profile.name || "");
        setEditBio(profile.bio || "");
        setEditAvatar(profile.avatar_url || "");
      }
    }
  };

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const res = await fetchWithUser('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: editName, bio: editBio, avatar_url: editAvatar })
      });
      if (res.ok) {
        setProfile({ ...profile, name: editName, bio: editBio, avatar_url: editAvatar });
        if (window.history.state?.profileEditing) {
          window.history.back();
        } else {
          setIsEditing(false);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectMovie = (movie: any) => {
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

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemove = async (movieId: string) => {
    try {
      const removedMovie = profile?.history?.find((h: any) => h.id === movieId || h.movie_id === movieId);
      const actionKey = removedMovie?.action === 'Watched' ? 'watched' : isPassAction(removedMovie?.action) ? 'pass' : 'watchlist';
      setProfile((prev: any) => prev ? ({
        ...prev,
        counts: {
          ...prev.counts,
          [actionKey]: Math.max(0, (prev.counts?.[actionKey] || 0) - 1)
        },
        history: prev.history.filter((h: any) => h.movie_id !== movieId && h.id !== movieId)
      }) : prev);
      handleCloseMovie();
      await fetchWithUser(`/api/swipe/${movieId}`, { method: 'DELETE' });
    } catch (e) {
      console.error(e);
    }
  };

  const handleMoveToWatched = async (movieId: string) => {
    try {
      const movie = profile?.history?.find((h: any) => h.id === movieId || h.movie_id === movieId);
      const prevActionKey = isPassAction(movie?.action) ? 'pass' : movie?.action === 'Watchlist' ? 'watchlist' : null;
      setProfile((prev: any) => prev ? ({
        ...prev,
        counts: {
          ...prev.counts,
          ...(prevActionKey ? { [prevActionKey]: Math.max(0, (prev.counts?.[prevActionKey] || 0) - 1) } : {}),
          watched: (prev.counts?.watched || 0) + 1
        },
        history: prev.history.map((h: any) => (h.movie_id === movieId || h.id === movieId) ? { ...h, action: 'Watched' } : h)
      }) : prev);
      handleCloseMovie();
      await fetchWithUser(`/api/swipe/${movieId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'Watched' })
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleMoveToWatchlist = async (movieId: string) => {
    try {
      const movie = profile?.history?.find((h: any) => h.id === movieId || h.movie_id === movieId);
      const prevActionKey = isPassAction(movie?.action) ? 'pass' : movie?.action === 'Watched' ? 'watched' : null;
      setProfile((prev: any) => prev ? ({
        ...prev,
        counts: {
          ...prev.counts,
          ...(prevActionKey ? { [prevActionKey]: Math.max(0, (prev.counts?.[prevActionKey] || 0) - 1) } : {}),
          watchlist: (prev.counts?.watchlist || 0) + 1
        },
        history: prev.history.map((h: any) => (h.movie_id === movieId || h.id === movieId) ? { ...h, action: 'Watchlist' } : h)
      }) : prev);
      handleCloseMovie();
      await fetchWithUser(`/api/swipe/${movieId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'Watchlist' })
      });
    } catch (e) {
      console.error(e);
    }
  };

  const renderMovieList = (title: string, actionType: 'Watchlist' | 'Watched' | 'Pass') => {
    const list = profile?.history ? profile.history.filter((h: any) => matchesListType(h.action, actionType)) : [];
    const count = actionType === 'Watched'
      ? (profile?.counts?.watched ?? list.length)
      : actionType === 'Pass'
      ? (profile?.counts?.pass ?? list.length)
      : (profile?.counts?.watchlist ?? list.length);

    if (actionType === 'Pass' && count === 0) return null;
    const showViewAllCard = list.length > cols;
    const displayList = list.slice(0, showViewAllCard ? cols - 1 : cols);
    const remainingCount = count > displayList.length ? count - displayList.length : 0;

    return (
      <section className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl md:text-2xl font-display font-bold text-[#c9c6c5] flex items-center gap-2"><span>{title}</span> <span className="text-sm font-normal text-white/40">({count})</span></h2>
          <button onClick={() => onViewList(actionType)} className="text-sm font-bold text-[#c9c6c5] hover:underline">View All</button>
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-3 sm:gap-4">
          {displayList.map((movie: any) => (
            <div key={movie.id} onClick={() => handleSelectMovie(movie)} className="group relative aspect-[2/3] rounded-md overflow-hidden cursor-pointer transform hover:scale-[1.02] transition-all duration-300 shadow-xl border border-white/5">
              <img src={movie.poster_url || undefined} loading="lazy" decoding="async" className="w-full h-full object-cover" alt={movie.title ? `Poster for ${movie.title}` : "Movie poster"} />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 w-full p-2 glass-panel !border-0 !rounded-none translate-y-2 group-hover:translate-y-0 transition-transform">
                <h3 className="text-[10px] sm:text-xs font-bold text-white truncate px-1">{movie.title}</h3>
              </div>
            </div>
          ))}
          {showViewAllCard && (
            <div onClick={() => onViewList(actionType)} className="group relative aspect-[2/3] rounded-md overflow-hidden cursor-pointer transform hover:scale-[1.02] transition-all duration-300 shadow-xl border border-white/5 bg-[#1c1b1b] flex flex-col items-center justify-center">
               <img src={list[cols - 1].poster_url || undefined} loading="lazy" decoding="async" className="w-full h-full object-cover opacity-20 group-hover:opacity-10 transition-opacity" alt={list[cols - 1]?.title ? `Poster for ${list[cols - 1].title}` : "More movies preview"} />
               <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none">
                 <div className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                    <ChevronRight className="w-4 h-4 text-white" />
                 </div>
                 <span className="text-white font-bold text-xs uppercase tracking-wider">+{remainingCount} More</span>
               </div>
            </div>
          )}
        </div>
      </section>
    );
  };

  if (loading) return null;

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 pb-32">
      {/* Profile Header */}
      <section className="flex flex-col md:flex-row items-center md:items-start gap-6 mb-12">
        <div className="relative w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden border-2 border-[#c9c6c5] shadow-[0_0_30px_rgba(201,198,197,0.1)] shrink-0 bg-[#2b2a2a] group">
          <img 
            alt={profile?.name ? `${profile.name}'s profile avatar` : "User profile avatar"} 
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover" 
            src={isEditing ? (editAvatar || profile.avatar_url || "https://lh3.googleusercontent.com/aida-public/AB6AXuCIt82W2GZJFZbpWzZdY2X3ER7_6qkzNy4sk2HEPEyl0HxBJj68_Qe4uN8tvz57BTwNl3D1TffunDYTzKR-fi1GpIAzbKQGv_oj4bdc6s36jxHsjP8Mz-ceoxqbOTh38HWIKKi1269tq191KhzH3TarrD3uKRcCyw4fv1VN8aa7I8TIWppe-BT4kbqH51ksxDLMaZ4hGvLTOcuqtlhqern2xwX8afDRtOid2RfkRXSowZVMyD0lj6OmkaOFGHt8O3A4n-L-GGORooiY") : (profile.avatar_url || "https://lh3.googleusercontent.com/aida-public/AB6AXuCIt82W2GZJFZbpWzZdY2X3ER7_6qkzNy4sk2HEPEyl0HxBJj68_Qe4uN8tvz57BTwNl3D1TffunDYTzKR-fi1GpIAzbKQGv_oj4bdc6s36jxHsjP8Mz-ceoxqbOTh38HWIKKi1269tq191KhzH3TarrD3uKRcCyw4fv1VN8aa7I8TIWppe-BT4kbqH51ksxDLMaZ4hGvLTOcuqtlhqern2xwX8afDRtOid2RfkRXSowZVMyD0lj6OmkaOFGHt8O3A4n-L-GGORooiY")}
          />
          {isEditing && !isSaving && (
            <div 
              className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => fileInputRef.current?.click()}
            >
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
            </div>
          )}
          {isSaving && (
            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center">
              <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
            </div>
          )}
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleAvatarUpload} 
            className="hidden" 
            accept="image/*"
          />
        </div>
        <div className="text-center md:text-left flex-1 w-full">
          {isEditing ? (
            <div className="space-y-2 mb-4">
              <input 
                value={editName}
                onChange={e => setEditName(e.target.value)}
                className="w-full bg-transparent text-2xl md:text-3xl font-display font-bold text-[#c9c6c5] border-b border-white/20 outline-none focus:border-white transition-colors pb-1 placeholder:text-white/20"
                placeholder="Name"
              />
              <input 
                value={editBio}
                onChange={e => setEditBio(e.target.value)}
                className="w-full bg-transparent text-white/60 text-sm border-b border-white/20 outline-none focus:border-white transition-colors pb-1 placeholder:text-white/20"
                placeholder="Bio"
              />
            </div>
          ) : (
            <>
              <h1 className="text-2xl md:text-3xl font-display font-bold text-[#c9c6c5] mb-1">{profile.name}</h1>
              <p className="text-white/60 text-sm mb-5">{profile.bio}</p>
            </>
          )}

          <div className="flex flex-wrap justify-center md:justify-start gap-4">
            {isEditing ? (
              <>
                <button onClick={handleSave} disabled={isSaving} className={`text-white text-sm font-semibold transition-colors ${isSaving ? 'opacity-50 cursor-not-allowed' : 'hover:text-[#c9c6c5]'}`}>{isSaving ? 'Saving...' : 'Save'}</button>
                <button onClick={handleCancelEdit} disabled={isSaving} className={`text-white/40 text-sm font-medium transition-colors ${isSaving ? 'opacity-50 cursor-not-allowed' : 'hover:text-white'}`}>Cancel</button>
              </>
            ) : (
              <>
                <button onClick={handleStartEdit} className="text-white text-sm font-semibold hover:text-[#c9c6c5] transition-colors">Edit</button>
                <button onClick={async () => { localStorage.removeItem('guest_token'); await logout(); window.location.reload(); }} className="text-white/40 text-sm font-medium hover:text-red-400 transition-colors">Log Out</button>
              </>
            )}
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-8">
        {renderMovieList('My Watchlist', 'Watchlist')}
        {renderMovieList('Watched', 'Watched')}
        {renderMovieList('Not Watched', 'Pass')}
      </div>

      <AnimatePresence>
        {selectedMovie && (() => {
          const imdbId = selectedMovie.imdb_id || selectedMovie.imdbId;
          const imdbUrl = imdbId ? `https://www.imdb.com/title/${imdbId}/` : null;
          const duration = movieExtra.duration || selectedMovie.duration || "120m";
          const rawSynopsis = (selectedMovie.synopsis && selectedMovie.synopsis !== 'No synopsis available.') 
            ? selectedMovie.synopsis 
            : movieExtra.synopsis;
          const synopsis = rawSynopsis || (isCastLoading ? "" : "No synopsis available.");
          const genre = selectedMovie.genre || "";
          const rating = selectedMovie.rating != null ? selectedMovie.rating : 0;

          return (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm" 
              onClick={handleCloseMovie}
            >
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="relative bg-[#1c1b1b] border border-white/10 p-5 sm:p-6 rounded-2xl max-w-xl md:max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto" 
                onClick={e => e.stopPropagation()}
              >
                {/* Top Header Bar with Clean Dismiss (X) that never overlaps buttons */}
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
                    <span className="text-xs font-bold uppercase tracking-wider text-white/60">Movie Details</span>
                  </div>
                  <button
                    onClick={handleCloseMovie}
                    className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    title="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex flex-col md:flex-row gap-5 md:gap-6">
                  {/* LEFT SIDE: Poster, Title, Meta, Stars, Synopsis, Cast */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between space-y-4">
                    {/* Top Row: Poster + Title + Meta + Star Rating */}
                    <div className="flex gap-4 items-start">
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
                            loading="lazy"
                            decoding="async"
                            className="w-20 h-28 sm:w-24 sm:h-36 object-cover rounded-lg shadow-md border border-white/10 shrink-0" 
                            alt={selectedMovie.title ? `Poster for ${selectedMovie.title}` : "Movie poster"} 
                          />
                        </a>
                      ) : (
                        <div className="shrink-0">
                          <img 
                            src={selectedMovie.poster_url} 
                            loading="lazy"
                            decoding="async"
                            className="w-20 h-28 sm:w-24 sm:h-36 object-cover rounded-lg shadow-md border border-white/10 shrink-0" 
                            alt={selectedMovie.title ? `Poster for ${selectedMovie.title}` : "Movie poster"} 
                          />
                        </div>
                      )}

                      <div className="flex-1 min-w-0 pr-2">
                        {imdbUrl ? (
                          <a
                            href={imdbUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline hover:text-[#F5C518] transition-colors"
                            title="Open in IMDb"
                          >
                            <h3 className="text-lg sm:text-xl font-bold text-white leading-tight mb-1">
                              {selectedMovie.title}
                            </h3>
                          </a>
                        ) : (
                          <h3 className="text-lg sm:text-xl font-bold text-white leading-tight mb-1">
                            {selectedMovie.title}
                          </h3>
                        )}

                        <div className="flex flex-wrap items-center gap-2 text-xs text-white/60 mb-2">
                          {selectedMovie.year && <span>{selectedMovie.year}</span>}
                          {duration && (
                            <>
                              <span>•</span>
                              <span>{duration}</span>
                            </>
                          )}
                        </div>

                        {/* Genre Badges */}
                        {genre && (
                          <div className="flex flex-wrap gap-1.5 mb-2.5">
                            {genre.split(',').map((g: string) => g.trim()).filter(Boolean).slice(0, 3).map((g: string) => (
                              <span key={g} className="px-2 py-0.5 rounded-md bg-white/10 text-white/80 text-[11px] font-medium border border-white/5">
                                {g}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Reviews out of 5 Yellow Stars */}
                        <div className="pt-0.5">
                          <StarRating rating={rating} />
                        </div>
                      </div>
                    </div>

                    {/* Synopsis Section */}
                    <div className="space-y-1">
                      <h4 className="text-[11px] font-semibold uppercase tracking-wider text-white/40">Synopsis</h4>
                      {isCastLoading && !rawSynopsis ? (
                        <div className="text-xs text-white/30 animate-pulse">Loading synopsis...</div>
                      ) : (
                        <p className="text-xs sm:text-sm text-white/70 leading-relaxed line-clamp-3 sm:line-clamp-4">
                          {synopsis}
                        </p>
                      )}
                    </div>

                    {/* Main Cast Section */}
                    <div className="space-y-1.5">
                      <h4 className="text-[11px] font-semibold uppercase tracking-wider text-white/40">Main Cast</h4>
                      {isCastLoading ? (
                        <div className="text-xs text-white/30 animate-pulse">Loading cast members...</div>
                      ) : castMembers.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {castMembers.map((actor, idx) => (
                            <span key={idx} className="text-xs text-white/80 bg-white/5 px-2 py-0.5 rounded-md border border-white/5">
                              {actor}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div className="text-xs text-white/40 italic">Cast information unavailable</div>
                      )}
                    </div>
                  </div>

                  {/* RIGHT SIDE: Action Buttons */}
                  <div className="w-full md:w-56 shrink-0 flex flex-col justify-center space-y-2.5 md:border-l md:border-white/10 md:pl-6 pt-3 md:pt-0 border-t md:border-t-0 border-white/10">
                    {selectedMovie.action === 'Watchlist' && (
                      <button 
                        onClick={() => handleMoveToWatched(selectedMovie.id)}
                        className="w-full py-2.5 bg-white text-black text-xs sm:text-sm font-bold rounded-xl hover:bg-gray-200 transition-colors shadow-lg cursor-pointer"
                      >
                        Mark as Watched
                      </button>
                    )}

                    {isPassAction(selectedMovie.action) && (
                      <>
                        <button 
                          onClick={() => handleMoveToWatchlist(selectedMovie.id)}
                          className="w-full py-2.5 bg-[#f59e0b] hover:bg-[#d97706] text-black text-xs sm:text-sm font-bold rounded-xl transition-colors shadow-lg cursor-pointer"
                        >
                          Add to Watchlist
                        </button>
                        <button 
                          onClick={() => handleMoveToWatched(selectedMovie.id)}
                          className="w-full py-2.5 bg-white text-black text-xs sm:text-sm font-bold rounded-xl hover:bg-gray-200 transition-colors shadow-lg cursor-pointer"
                        >
                          Mark as Watched
                        </button>
                      </>
                    )}

                    {isTrailerLoading ? (
                      <button 
                        disabled
                        className="w-full py-2.5 bg-red-600/70 text-white/90 text-xs sm:text-sm font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-wait"
                      >
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Loading Trailer...</span>
                      </button>
                    ) : currentTrailerKey ? (
                      <button 
                        onClick={() => setActiveTrailerKey(currentTrailerKey)}
                        className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-bold rounded-xl transition-colors shadow-lg flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
                      >
                        <Play className="w-4 h-4 fill-current" />
                        <span>Watch Trailer</span>
                      </button>
                    ) : (
                      <button 
                        disabled
                        className="w-full py-2.5 bg-white/5 border border-white/10 text-white/40 text-xs sm:text-sm font-semibold rounded-xl flex items-center justify-center gap-2 cursor-not-allowed"
                        title="Trailer not available for this movie"
                      >
                        <Play className="w-4 h-4 opacity-40" />
                        <span>Trailer Unavailable</span>
                      </button>
                    )}

                    {imdbUrl ? (
                      <a
                        href={imdbUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-2.5 bg-[#F5C518] hover:bg-[#e2b616] text-black text-xs sm:text-sm font-bold rounded-xl transition-colors shadow-lg flex items-center justify-center gap-2 text-center cursor-pointer"
                      >
                        Open in IMDb
                      </a>
                    ) : (
                      <a
                        href={`https://www.themoviedb.org/movie/${selectedMovie.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ backgroundColor: 'rgb(3, 37, 65)' }}
                        className="w-full py-2.5 hover:opacity-90 text-white text-xs sm:text-sm font-bold rounded-xl transition-colors shadow-lg flex items-center justify-center gap-2 text-center cursor-pointer"
                      >
                        Open in TMDb
                      </a>
                    )}

                    <button 
                      onClick={() => handleRemove(selectedMovie.id)}
                      className="w-full py-2.5 bg-red-500/10 text-red-500 text-xs sm:text-sm font-bold rounded-xl hover:bg-red-500/20 transition-colors cursor-pointer"
                    >
                      {isPassAction(selectedMovie.action) ? 'Reset to Swipe Queue' : `Remove from ${selectedMovie.action}`}
                    </button>

                    <button 
                      onClick={handleCloseMovie}
                      className="w-full py-2 bg-transparent text-white/60 text-xs sm:text-sm font-bold rounded-xl hover:text-white transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* In-App Trailer Video Modal */}
      <AnimatePresence>
        {activeTrailerKey && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6 bg-black/90 backdrop-blur-md"
            onClick={() => setActiveTrailerKey(null)}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 15 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-3xl bg-[#141414] border border-white/10 rounded-md overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#181818]">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" />
                  <span className="text-xs sm:text-sm font-bold text-white truncate max-w-xs sm:max-w-md">
                    {selectedMovie?.title ? `${selectedMovie.title} - Official Trailer` : "Movie Trailer"}
                  </span>
                </div>
                <button
                  onClick={() => setActiveTrailerKey(null)}
                  className="p-1 rounded-md text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  aria-label="Close trailer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="relative aspect-video w-full bg-black">
                <iframe
                  src={`https://www.youtube.com/embed/${activeTrailerKey}?autoplay=1&rel=0`}
                  title={`${selectedMovie?.title || 'Movie'} Trailer`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full border-0 rounded-b-md"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
