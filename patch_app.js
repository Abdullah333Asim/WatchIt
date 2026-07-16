import fs from 'fs';

let code = fs.readFileSync('src/App.tsx', 'utf-8');

// Fix isAuthenticated to handle "undefined" or "null" strings
code = code.replace(
  'const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => !!localStorage.getItem("userId"));',
  'const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => { const id = localStorage.getItem("userId"); return !!id && id !== "undefined" && id !== "null"; });'
);

// Remove the hidden SwipeView and add a useEffect to call preload
code = code.replace(
  /\{\/\* Hidden preloader for the swipe page \*\/\}[\s\S]*?<\/div>/,
  `{/* Background preloader for SwipeView */}
      <div className="hidden" aria-hidden="true"></div>`
);

// Add the import for preloadMovies if not there, or just call it directly since we can export it
const loginViewStart = 'function LoginView({ onLogin }: { onLogin: (id: string) => void }) {';
const loginViewHook = `  useEffect(() => {
    import('./components/SwipeView').then(mod => {
      if (mod.preloadMovies) mod.preloadMovies();
    });
  }, []);`;

code = code.replace(loginViewStart, loginViewStart + '\n' + loginViewHook);

fs.writeFileSync('src/App.tsx', code);
