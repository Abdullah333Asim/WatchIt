import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { User, Fingerprint, ChevronRight, Moon, Tv, Shield } from "lucide-react";

export default function ProfileView() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editAvatar, setEditAvatar] = useState("");

  useEffect(() => {
    fetch('/api/profile')
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
      const res = await fetch('/api/profile', {
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

  if (loading) return null;

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 pb-32">
      {/* Profile Header */}
      <section className="flex flex-col md:flex-row items-center md:items-start gap-8 mb-12">
        <div className="relative w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden border-2 border-[#c9c6c5] shadow-[0_0_30px_rgba(201,198,197,0.1)] shrink-0 bg-[#2b2a2a]">
          <img 
            alt="Profile Avatar" 
            className="w-full h-full object-cover" 
            src={profile.avatar_url || "https://lh3.googleusercontent.com/aida-public/AB6AXuCIt82W2GZJFZbpWzZdY2X3ER7_6qkzNy4sk2HEPEyl0HxBJj68_Qe4uN8tvz57BTwNl3D1TffunDYTzKR-fi1GpIAzbKQGv_oj4bdc6s36jxHsjP8Mz-ceoxqbOTh38HWIKKi1269tq191KhzH3TarrD3uKRcCyw4fv1VN8aa7I8TIWppe-BT4kbqH51ksxDLMaZ4hGvLTOcuqtlhqern2xwX8afDRtOid2RfkRXSowZVMyD0lj6OmkaOFGHt8O3A4n-L-GGORooiY"}
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
              <input 
                value={editAvatar}
                onChange={e => setEditAvatar(e.target.value)}
                className="w-full bg-[#2b2a2a] text-[#c9c6c5] p-3 rounded-xl border border-white/10 outline-none focus:border-[#00dce5]"
                placeholder="Avatar URL"
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
              <button onClick={() => setIsEditing(true)} className="bg-[#c9c6c5] text-[#1c1b1b] px-6 py-2 rounded-xl font-medium hover:bg-[#b0aeac] transition-colors shadow-lg">Edit Profile</button>
            )}
          </div>
        </div>
      </section>

      <div className="grid md:grid-cols-12 gap-10">
        {/* Taste DNA */}
        <section className="md:col-span-5 space-y-6">
          <h2 className="text-2xl font-display font-bold text-[#c9c6c5] flex items-center gap-3">
            <Fingerprint className="w-6 h-6" />
            Taste DNA
          </h2>
          <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-[#c9c6c5]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative z-10 space-y-4">
              <div>
                <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2">Dominant Genres</h3>
                <div className="flex flex-wrap gap-2">
                  {profile.taste_dna.dominantGenres.map((g: string) => (
                    <span key={g} className="bg-[#c9c6c5]/10 text-[#c9c6c5] px-3 py-1 rounded-full text-xs font-semibold border border-[#c9c6c5]/20">
                      {g}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2">Cinematic Vibe</h3>
                <p className="text-white text-sm leading-relaxed">{profile.taste_dna.cinematicVibe}</p>
              </div>
              <div className="pt-2">
                <div className="flex justify-between items-end mb-2">
                   <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${profile.taste_dna.matchAccuracy}%` }}
                      className="h-full bg-gradient-to-r from-[#00dce5]/50 to-[#00dce5] shadow-[0_0_10px_rgba(0,220,229,0.5)]" 
                    />
                  </div>
                </div>
                <p className="text-[10px] font-bold text-right text-white/40 uppercase tracking-wide">{profile.taste_dna.matchAccuracy}% Match Accuracy</p>
              </div>
            </div>
          </div>
        </section>

        {/* Recently Swiped */}
        <section className="md:col-span-7 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-display font-bold text-[#c9c6c5]">Recently Swiped Right</h2>
            <button className="text-sm font-bold text-[#c9c6c5] hover:underline">View All</button>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {profile.history.filter((h: any) => h.action === 'Watched' || h.action === 'Watchlist').slice(0, 3).map((movie: any) => (
              <div key={movie.id} className="group relative aspect-[2/3] rounded-xl overflow-hidden cursor-pointer transform hover:scale-[1.02] transition-all duration-300 shadow-xl border border-white/5">
                <img src={movie.poster_url} className="w-full h-full object-cover" alt="" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 w-full p-3 glass-panel !border-0 !rounded-none translate-y-2 group-hover:translate-y-0 transition-transform">
                  <h4 className="text-xs font-bold text-white truncate">{movie.title}</h4>
                  <p className="text-[10px] text-[#00dce5] font-bold">{movie.action === 'Watchlist' ? 'Added' : 'Watched'}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Preferences / Settings */}
        <section className="md:col-span-12 space-y-6">
          <h2 className="text-2xl font-display font-bold text-[#c9c6c5]">Preferences</h2>
          <div className="glass-panel rounded-2xl overflow-hidden divide-y divide-white/5">
            <PreferenceItem icon={<Moon />} title="Cinematic Mode" description="Keep interface entirely dark" hasToggle active />
            <PreferenceItem icon={<Tv />} title="Connected Services" description="Manage streaming integrations" />
            <PreferenceItem icon={<Shield />} title="Privacy & Data" description="Control your Taste DNA usage" />
          </div>
        </section>
      </div>
    </div>
  );
}

function PreferenceItem({ icon, title, description, hasToggle = false, active = false }: { icon: any, title: string, description: string, hasToggle?: boolean, active?: boolean }) {
  return (
    <div className="flex items-center justify-between p-6 hover:bg-white/5 transition-colors cursor-pointer group">
      <div className="flex items-center gap-6">
        <div className="text-white/40 group-hover:text-[#c9c6c5] transition-colors">
          {icon}
        </div>
        <div>
          <h4 className="font-bold text-white">{title}</h4>
          <p className="text-xs text-white/40 font-medium">{description}</p>
        </div>
      </div>
      {hasToggle ? (
        <div className={`w-10 h-6 rounded-full relative transition-colors ${active ? 'bg-[#c9c6c5]' : 'bg-white/10'}`}>
          <div className={`w-4 h-4 bg-black rounded-full absolute top-1 transition-all ${active ? 'right-1' : 'left-1'}`} />
        </div>
      ) : (
        <ChevronRight className="w-5 h-5 text-white/20 group-hover:text-white transition-colors" />
      )}
    </div>
  );
}
