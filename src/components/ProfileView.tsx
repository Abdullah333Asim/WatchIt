import { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { User, Fingerprint, ChevronRight, Moon, Tv, Shield } from "lucide-react";
import { fetchWithUser } from "../lib/api";

export default function ProfileView({ onViewList }: { onViewList: (type: 'Watched' | 'Watchlist') => void }) {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editAvatar, setEditAvatar] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchWithUser('/api/profile')
      .then(res => res.json())
      .then(data => {
        setProfile(data);
        setEditName(data.name || "");
        setEditBio(data.bio || "");
        setEditAvatar(data.avatar_url || "");
        setLoading(false);
      });
  }, []);

  const handleSave = async () => {
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
        setIsEditing(false);
      }
    } catch (e) {
      console.error(e);
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

  if (loading) return null;

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 pb-32">
      {/* Profile Header */}
      <section className="flex flex-col md:flex-row items-center md:items-start gap-8 mb-12">
        <div className="relative w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden border-2 border-[#c9c6c5] shadow-[0_0_30px_rgba(201,198,197,0.1)] shrink-0 bg-[#2b2a2a] group">
          <img 
            alt="Profile Avatar" 
            className="w-full h-full object-cover" 
            src={isEditing ? (editAvatar || profile.avatar_url || "https://lh3.googleusercontent.com/aida-public/AB6AXuCIt82W2GZJFZbpWzZdY2X3ER7_6qkzNy4sk2HEPEyl0HxBJj68_Qe4uN8tvz57BTwNl3D1TffunDYTzKR-fi1GpIAzbKQGv_oj4bdc6s36jxHsjP8Mz-ceoxqbOTh38HWIKKi1269tq191KhzH3TarrD3uKRcCyw4fv1VN8aa7I8TIWppe-BT4kbqH51ksxDLMaZ4hGvLTOcuqtlhqern2xwX8afDRtOid2RfkRXSowZVMyD0lj6OmkaOFGHt8O3A4n-L-GGORooiY") : (profile.avatar_url || "https://lh3.googleusercontent.com/aida-public/AB6AXuCIt82W2GZJFZbpWzZdY2X3ER7_6qkzNy4sk2HEPEyl0HxBJj68_Qe4uN8tvz57BTwNl3D1TffunDYTzKR-fi1GpIAzbKQGv_oj4bdc6s36jxHsjP8Mz-ceoxqbOTh38HWIKKi1269tq191KhzH3TarrD3uKRcCyw4fv1VN8aa7I8TIWppe-BT4kbqH51ksxDLMaZ4hGvLTOcuqtlhqern2xwX8afDRtOid2RfkRXSowZVMyD0lj6OmkaOFGHt8O3A4n-L-GGORooiY")}
          />
          {isEditing && (
            <div 
              className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="bg-white/20 p-2 rounded-full mb-1 border border-white/20 text-white shadow-lg backdrop-blur-sm">
                <svg className="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
              </div>
              <span className="text-[10px] font-bold tracking-wider text-white">UPLOAD</span>
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
            <div className="space-y-4 mb-4">
              <input 
                value={editName}
                onChange={e => setEditName(e.target.value)}
                className="w-full bg-[#2b2a2a] text-[#c9c6c5] p-3 rounded-xl border border-white/10 outline-none focus:border-[#00dce5]"
                placeholder="Your Name"
              />
              <textarea 
                value={editBio}
                onChange={e => setEditBio(e.target.value)}
                className="w-full bg-[#2b2a2a] text-white/60 p-3 rounded-xl border border-white/10 outline-none focus:border-[#00dce5] h-20 resize-none font-sans"
                placeholder="Say something about yourself..."
              />
            </div>
          ) : (
            <>
              <h1 className="text-3xl font-display font-bold text-[#c9c6c5] mb-1">{profile.name}</h1>
              <p className="text-white/60 mb-6">{profile.bio}</p>
            </>
          )}

          <div className="flex flex-wrap justify-center md:justify-start gap-3">
            {isEditing ? (
              <>
                <button onClick={handleSave} className="bg-[#00dce5] text-[#002021] px-6 py-2 rounded-xl font-bold hover:bg-[#63f7ff] transition-colors shadow-lg">Save Profile</button>
                <button onClick={() => setIsEditing(false)} className="glass-panel text-white/60 px-6 py-2 rounded-xl font-medium border border-white/5 hover:text-white transition-colors">Cancel</button>
              </>
            ) : (
              <>
                <button onClick={() => setIsEditing(true)} className="bg-[#c9c6c5] text-[#1c1b1b] px-6 py-2 rounded-xl font-medium hover:bg-[#b0aeac] transition-colors shadow-lg">Edit Profile</button>
                <button onClick={() => { localStorage.removeItem("userId"); window.location.reload(); }} className="glass-panel text-white/60 px-6 py-2 rounded-xl font-medium border border-white/5 hover:text-white hover:bg-red-500/10 transition-colors">Log Out</button>
              </>
            )}
          </div>
        </div>
      </section>

        <div className="grid md:grid-cols-12 gap-10">
        {/* Watchlist */}
        <section className="md:col-span-12 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-display font-bold text-[#c9c6c5]">My Watchlist</h2>
            <button onClick={() => onViewList('Watchlist')} className="text-sm font-bold text-[#c9c6c5] hover:underline">View All</button>
          </div>
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {profile.history.filter((h: any) => h.action === 'Watchlist').slice(0, 5).map((movie: any) => (
              <div key={movie.id} className="group relative aspect-[2/3] rounded-xl overflow-hidden cursor-pointer transform hover:scale-[1.02] transition-all duration-300 shadow-xl border border-white/5">
                <img src={movie.poster_url || undefined} className="w-full h-full object-cover" alt="" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 w-full p-3 glass-panel !border-0 !rounded-none translate-y-2 group-hover:translate-y-0 transition-transform">
                  <h4 className="text-xs font-bold text-white truncate px-1">{movie.title}</h4>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Recently Swiped */}
        <section className="md:col-span-7 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-display font-bold text-[#c9c6c5]">Watched</h2>
            <button onClick={() => onViewList('Watched')} className="text-sm font-bold text-[#c9c6c5] hover:underline">View All</button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {profile.history.filter((h: any) => h.action === 'Watched').slice(0, 4).map((movie: any) => (
              <div key={movie.id} className="group relative aspect-[2/3] rounded-xl overflow-hidden cursor-pointer transform hover:scale-[1.02] transition-all duration-300 shadow-xl border border-white/5">
                <img src={movie.poster_url || undefined} className="w-full h-full object-cover" alt="" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 w-full p-3 glass-panel !border-0 !rounded-none translate-y-2 group-hover:translate-y-0 transition-transform">
                  <h4 className="text-xs font-bold text-white truncate px-1">{movie.title}</h4>
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
