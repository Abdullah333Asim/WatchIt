import fs from 'fs';

let code = fs.readFileSync('src/App.tsx', 'utf-8');

code = code.replace(
  'import { useState, useEffect, ReactNode } from "react";',
  'import { useState, useEffect, ReactNode } from "react";\nimport { loginWithGoogle, auth } from "./lib/firebase.ts";\nimport { onAuthStateChanged } from "firebase/auth";'
);

code = code.replace(
  /const \[isAuthenticated, setIsAuthenticated\] = useState<boolean>\(\(\) => \{ const id = localStorage\.getItem\("userId"\); return !!id && id !== "undefined" && id !== "null"; \}\);/g,
  'const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);\n  const [isAuthLoading, setIsAuthLoading] = useState(true);\n  useEffect(() => {\n    const unsub = onAuthStateChanged(auth, (user) => {\n      setIsAuthenticated(!!user);\n      setIsAuthLoading(false);\n    });\n    return unsub;\n  }, []);'
);

code = code.replace(
  /if \(!isAuthenticated\) return <LoginView onLogin=\{\(id\) => \{ localStorage\.setItem\("userId", id\); setIsAuthenticated\(true\); \}\} \/>;/,
  'if (isAuthLoading) return null;\n    if (!isAuthenticated) return <LoginView />;'
);

code = code.replace(
  /if \(!isAuthenticated\) \{\s*return \(\s*<>\s*\{showSplash && <SplashAnimation onComplete=\{\(\) => setShowSplash\(false\)\} \/>\}\s*<LoginView onLogin=\{\(id\) => \{ localStorage\.setItem\("userId", id\); setIsAuthenticated\(true\); \}\} \/>\s*<\/>\s*\);\s*\}/,
  'if (!isAuthenticated) {\n    return (\n      <>\n        {showSplash && <SplashAnimation onComplete={() => setShowSplash(false)} />}\n        <LoginView />\n      </>\n    );\n  }'
);

// Replace LoginView Component entirely
const loginViewStart = code.indexOf('function LoginView');
const loginViewEnd = code.indexOf('function CardsIcon');

const newLoginView = `
function LoginView() {
  useEffect(() => {
    import('./components/SwipeView').then(mod => {
      if (mod.preloadMovies) mod.preloadMovies();
    });
  }, []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const handleLogin = async () => {
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      await loginWithGoogle();
    } catch (err) {
      console.error(err);
      setError("Login failed");
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-white font-sans selection:bg-white/10 relative overflow-hidden">
      <div className="hidden" aria-hidden="true"></div>
      <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_center,rgba(201,198,197,0.15)_0%,transparent_100%)] pointer-events-none" />
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md glass-panel p-10 rounded-3xl border border-white/10 shadow-2xl relative z-10"
      >
        <div className="text-center mb-10">
          <h1 className="text-5xl font-display font-bold mb-4 tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white to-[#c9c6c5]">WatchIt</h1>
          <p className="text-white/50 text-sm font-medium uppercase tracking-widest">Welcome back</p>
        </div>
        <div className="space-y-6">
          {error && (
            <motion.p 
              initial={{ opacity: 0, height: 0 }} 
              animate={{ opacity: 1, height: 'auto' }} 
              className="text-red-400 text-sm font-medium text-center"
            >
              {error}
            </motion.p>
          )}
          <button 
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-white text-black font-bold py-4 rounded-xl hover:bg-[#e5e2e1] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(255,255,255,0.1)] active:scale-[0.98]"
          >
            {loading ? "Entering..." : "Sign in with Google"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
`;

code = code.substring(0, loginViewStart) + newLoginView + code.substring(loginViewEnd);

fs.writeFileSync('src/App.tsx', code);
