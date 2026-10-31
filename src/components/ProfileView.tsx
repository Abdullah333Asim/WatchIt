import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { User, Fingerprint, ChevronRight, Moon, Tv, Shield } from "lucide-react";
import { fetchWithUser } from "../lib/api";
import { logout } from "../lib/firebase.ts";

export default function ProfileView({ onViewList }: { onViewList: (type: 'Watched' | 'Watchlist' | 'Pass') => void }) {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(() => {
    return !!window.history.state?.profileEditing;
  });
  const [selectedMovie, setSelectedMovie] = useState<any>(null);
  
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

  useEffect(() => {
    fetchWithUser('/api/profile')
      .then(res => {
        if (!res.ok) {
          localStorage.removeItem('guest_token');
          logout().then(() => window.location.reload());
          throw new Error("Failed to fetch profile");
        }
        return res.json();
      })
      .then(data => {
        setProfile(data);
        setEditName(data.name || "");
        setEditBio(data.bio || "");
        setEditAvatar(data.avatar_url || "");
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
      });
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
      const res = await fetchWithUser(`/api/swipe/${movieId}`, { method: 'DELETE' });
      if (res.ok) {
        setProfile((prev: any) => ({
          ...prev,
          history: prev.history.filter((h: any) => h.movie_id !== movieId && h.id !== movieId)
        }));
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
        setProfile((prev: any) => ({
          ...prev,
          history: prev.history.map((h: any) => (h.movie_id === movieId || h.id === movieId) ? { ...h, action: 'Watched' } : h)
        }));
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
        setProfile((prev: any) => ({
          ...prev,
          history: prev.history.map((h: any) => (h.movie_id === movieId || h.id === movieId) ? { ...h, action: 'Watchlist' } : h)
        }));
        handleCloseMovie();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const renderMovieList = (title: string, actionType: 'Watchlist' | 'Watched' | 'Pass') => {
    const list = profile.history.filter((h: any) => h.action === actionType);
    if (actionType === 'Pass' && list.length === 0) return null;
    const showViewAllCard = list.length > cols;
    const displayList = list.slice(0, showViewAllCard ? cols - 1 : cols);
    const remainingCount = list.length - (cols - 1);

    return (
      <section className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl md:text-2xl font-display font-bold text-[#c9c6c5]">{title}</h2>
          <button onClick={() => onViewList(actionType)} className="text-sm font-bold text-[#c9c6c5] hover:underline">View All</button>
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-3 sm:gap-4">
          {displayList.map((movie: any) => (
            <div key={movie.id} onClick={() => handleSelectMovie(movie)} className="group relative aspect-[2/3] rounded-md overflow-hidden cursor-pointer transform hover:scale-[1.02] transition-all duration-300 shadow-xl border border-white/5">
              <img src={movie.poster_url || undefined} className="w-full h-full object-cover" alt={movie.title ? `Poster for ${movie.title}` : "Movie poster"} />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 w-full p-2 glass-panel !border-0 !rounded-none translate-y-2 group-hover:translate-y-0 transition-transform">
                <h3 className="text-[10px] sm:text-xs font-bold text-white truncate px-1">{movie.title}</h3>
              </div>
            </div>
          ))}
          {showViewAllCard && (
            <div onClick={() => onViewList(actionType)} className="group relative aspect-[2/3] rounded-md overflow-hidden cursor-pointer transform hover:scale-[1.02] transition-all duration-300 shadow-xl border border-white/5 bg-[#1c1b1b] flex flex-col items-center justify-center">
               <img src={list[cols - 1].poster_url || undefined} className="w-full h-full object-cover opacity-20 group-hover:opacity-10 transition-opacity" alt={list[cols - 1]?.title ? `Poster for ${list[cols - 1].title}` : "More movies preview"} />
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

          return (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" 
              onClick={handleCloseMovie}
            >
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-[#1c1b1b] border border-white/10 p-6 rounded-3xl max-w-xs w-full shadow-2xl" 
                onClick={e => e.stopPropagation()}
              >
                <div className="flex gap-4 mb-6">
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
                        className="w-16 h-24 object-cover rounded-md shadow-md border border-white/5" 
                        alt={selectedMovie.title ? `Poster for ${selectedMovie.title}` : "Movie poster"} 
                      />
                    </a>
                  ) : (
                    <div className="shrink-0">
                      <img 
                        src={selectedMovie.poster_url} 
                        className="w-16 h-24 object-cover rounded-md shadow-md border border-white/5" 
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
                        <h3 className="text-lg font-bold text-white mb-1 leading-tight truncate">
                          {selectedMovie.title}
                        </h3>
                      </a>
                    ) : (
                      <h3 className="text-lg font-bold text-white mb-1 leading-tight truncate">
                        {selectedMovie.title}
                      </h3>
                    )}
                    <p className="text-white/60 text-sm">{selectedMovie.year}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {selectedMovie.action === 'Watchlist' && (
                    <button 
                      onClick={() => handleMoveToWatched(selectedMovie.id)}
                      className="w-full py-3 bg-white text-black text-sm font-bold rounded-xl hover:bg-gray-200 transition-colors shadow-lg"
                    >
                      Mark as Watched
                    </button>
                  )}

                  {selectedMovie.action === 'Pass' && (
                    <>
                      <button 
                        onClick={() => handleMoveToWatchlist(selectedMovie.id)}
                        className="w-full py-3 bg-[#f59e0b] hover:bg-[#d97706] text-black text-sm font-bold rounded-xl transition-colors shadow-lg"
                      >
                        Add to Watchlist
                      </button>
                      <button 
                        onClick={() => handleMoveToWatched(selectedMovie.id)}
                        className="w-full py-3 bg-white text-black text-sm font-bold rounded-xl hover:bg-gray-200 transition-colors shadow-lg"
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
                      className="w-full py-3 bg-[#F5C518] hover:bg-[#e2b616] text-black text-sm font-bold rounded-xl transition-colors shadow-lg flex items-center justify-center gap-2 text-center"
                    >
                      Open in IMDb
                    </a>
                  ) : (
                    <button
                      disabled
                      className="w-full py-3 bg-[#F5C518]/40 text-black/50 text-sm font-bold rounded-xl cursor-not-allowed flex items-center justify-center gap-2 text-center"
                      title="IMDb link not available"
                    >
                      Open in IMDb
                    </button>
                  )}

                  <button 
                    onClick={() => handleRemove(selectedMovie.id)}
                    className="w-full py-3 bg-red-500/10 text-red-500 text-sm font-bold rounded-xl hover:bg-red-500/20 transition-colors"
                  >
                    {selectedMovie.action === 'Pass' ? 'Reset to Swipe Queue' : `Remove from ${selectedMovie.action}`}
                  </button>

                  <button 
                    onClick={handleCloseMovie}
                    className="w-full py-3 bg-transparent text-white/60 text-sm font-bold rounded-xl hover:text-white transition-colors"
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
