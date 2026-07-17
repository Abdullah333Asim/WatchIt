import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf-8');

// Add import for SplashAnimation
if (!code.includes('SplashAnimation')) {
    code = code.replace(
      'import MovieListView from "./components/MovieListView";',
      'import MovieListView from "./components/MovieListView";\nimport SplashAnimation from "./components/SplashAnimation";'
    );
}

// Add state for splash screen
if (!code.includes('showSplash')) {
    code = code.replace(
      'export default function App() {',
      'export default function App() {\n  const [showSplash, setShowSplash] = useState(true);'
    );
}

// Render splash screen conditionally
const renderBlock = '    <div \n      className="min-h-screen text-[#e5e2e1] font-sans selection:bg-white/10 overflow-x-hidden transition-colors duration-700 bg-black"\n    >';

if (code.includes(renderBlock) && !code.includes('showSplash && <SplashAnimation')) {
    code = code.replace(
        renderBlock,
        '    <>\n      {showSplash && <SplashAnimation onComplete={() => setShowSplash(false)} />}\n      <div \n        className="min-h-screen text-[#e5e2e1] font-sans selection:bg-white/10 overflow-x-hidden transition-colors duration-700 bg-black"\n      >'
    );
    // Don't forget to close the fragment at the end of the component
    // We'll just replace the final </div>); with </div></>);
    const endBlock = '    </div>\n  );\n}';
    code = code.replace(endBlock, '    </div>\n    </>\n  );\n}');
}

// Wait, the LoginView is rendered earlier if not authenticated:
// if (!isAuthenticated) {
//    return <LoginView onLogin={(id) => { localStorage.setItem("userId", id); setIsAuthenticated(true); }} />;
//  }
// We should render SplashAnimation over LoginView too!
const loginReturn = '  if (!isAuthenticated) {\n    return <LoginView onLogin={(id) => { localStorage.setItem("userId", id); setIsAuthenticated(true); }} />;\n  }';
const newLoginReturn = '  if (!isAuthenticated) {\n    return (\n      <>\n        {showSplash && <SplashAnimation onComplete={() => setShowSplash(false)} />}\n        <LoginView onLogin={(id) => { localStorage.setItem("userId", id); setIsAuthenticated(true); }} />\n      </>\n    );\n  }';

if (code.includes(loginReturn)) {
    code = code.replace(loginReturn, newLoginReturn);
}

fs.writeFileSync('src/App.tsx', code);
