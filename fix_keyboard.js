import fs from 'fs';
let code = fs.readFileSync('src/components/SwipeView.tsx', 'utf-8');

code = code.replace(
  /case 'ArrowUp':[\s\S]*?break;/,
  `case 'ArrowUp':
        case 'w':
        case 'W':
          action = 'Watchlist';
          targetY = -1000;
          break;`
);

code = code.replace(
  /case 'ArrowDown':[\s\S]*?break;/,
  `case 'ArrowDown':
        case 's':
        case 'S':
          action = 'Not Interested';
          targetY = 1000;
          break;`
);

// Fix the HTML shortcuts guide
// Currently it says W/Up -> Ignore, S/Down -> Watchlist
code = code.replace(
  /<kbd[^>]*>W<\/kbd>\s*<kbd[^>]*>↑<\/kbd>[\s\S]*?<span[^>]*>Ignore<\/span>/,
  '<kbd className="w-10 h-10 flex items-center justify-center bg-white/5 rounded border border-white/10 font-mono text-sm text-white shadow-lg">W</kbd>\n            <kbd className="w-10 h-10 flex items-center justify-center bg-white/5 rounded border border-white/10 font-mono text-sm text-white shadow-lg">↑</kbd>\n          </div>\n          <span className="text-sm font-medium text-[#f59e0b]">Watchlist</span>'
);

code = code.replace(
  /<kbd[^>]*>S<\/kbd>\s*<kbd[^>]*>↓<\/kbd>[\s\S]*?<span[^>]*>Watchlist<\/span>/,
  '<kbd className="w-10 h-10 flex items-center justify-center bg-white/5 rounded border border-white/10 font-mono text-sm text-white shadow-lg">S</kbd>\n            <kbd className="w-10 h-10 flex items-center justify-center bg-white/5 rounded border border-white/10 font-mono text-sm text-white shadow-lg">↓</kbd>\n          </div>\n          <span className="text-sm font-medium">Ignore</span>'
);

fs.writeFileSync('src/components/SwipeView.tsx', code);
