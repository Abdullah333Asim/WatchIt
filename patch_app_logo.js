import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf-8');

if (!code.includes('LogoAnimation')) {
    code = code.replace(
      'import SplashAnimation from "./components/SplashAnimation";',
      'import SplashAnimation from "./components/SplashAnimation";\nimport LogoAnimation from "./components/LogoAnimation";'
    );
}

if (!code.includes('logoAnimTrigger')) {
    code = code.replace(
      'const [activeTab, setActiveTab] = useState<Tab>("swipe");',
      'const [activeTab, setActiveTab] = useState<Tab>("swipe");\n  const [logoAnimTrigger, setLogoAnimTrigger] = useState(0);'
    );
}

// We need to intercept setActiveTab to increment trigger, or just use a useEffect listening to activeTab.
// Actually, useEffect on activeTab is easier.
if (!code.includes('useEffect(() => { setLogoAnimTrigger(p => p + 1); }, [activeTab]);')) {
    code = code.replace(
      'const [isChatSidebarOpen, setIsChatSidebarOpen] = useState(false);',
      'const [isChatSidebarOpen, setIsChatSidebarOpen] = useState(false);\n  useEffect(() => { setLogoAnimTrigger(p => p + 1); }, [activeTab]);'
    );
}

const oldLogo = '<div className="font-bold text-2xl tracking-tighter text-white drop-shadow-lg font-display">WatchIt</div>';
const newLogo = '<LogoAnimation trigger={logoAnimTrigger} />';
code = code.replace(oldLogo, newLogo);

fs.writeFileSync('src/App.tsx', code);
