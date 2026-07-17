import fs from 'fs';
let code = fs.readFileSync('src/components/SwipeView.tsx', 'utf-8');

const shortcutsHtml = `
      {/* Keyboard Shortcuts Guide (Desktop Only) */}
      <div className="hidden lg:flex flex-col fixed left-8 top-1/2 -translate-y-1/2 gap-6 text-white/50 z-50 pointer-events-none">
        <div className="text-xs font-bold uppercase tracking-widest text-white/30 mb-2">Controls</div>
        <div className="flex items-center gap-4">
          <div className="flex gap-1">
            <kbd className="w-10 h-10 flex items-center justify-center bg-white/5 rounded border border-white/10 font-mono text-sm text-white shadow-lg">W</kbd>
            <kbd className="w-10 h-10 flex items-center justify-center bg-white/5 rounded border border-white/10 font-mono text-sm text-white shadow-lg">↑</kbd>
          </div>
          <span className="text-sm font-medium">Ignore</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex gap-1">
            <kbd className="w-10 h-10 flex items-center justify-center bg-white/5 rounded border border-white/10 font-mono text-sm text-white shadow-lg">A</kbd>
            <kbd className="w-10 h-10 flex items-center justify-center bg-white/5 rounded border border-white/10 font-mono text-sm text-white shadow-lg">←</kbd>
          </div>
          <span className="text-sm font-medium text-red-500">Pass</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex gap-1">
            <kbd className="w-10 h-10 flex items-center justify-center bg-white/5 rounded border border-white/10 font-mono text-sm text-white shadow-lg">S</kbd>
            <kbd className="w-10 h-10 flex items-center justify-center bg-white/5 rounded border border-white/10 font-mono text-sm text-white shadow-lg">↓</kbd>
          </div>
          <span className="text-sm font-medium text-[#f59e0b]">Watchlist</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex gap-1">
            <kbd className="w-10 h-10 flex items-center justify-center bg-white/5 rounded border border-white/10 font-mono text-sm text-white shadow-lg">D</kbd>
            <kbd className="w-10 h-10 flex items-center justify-center bg-white/5 rounded border border-white/10 font-mono text-sm text-white shadow-lg">→</kbd>
          </div>
          <span className="text-sm font-medium text-[#00dce5]">Watched</span>
        </div>
      </div>
`;

code = code.replace(
  '<div className="max-w-md mx-auto px-6 pt-4 h-[calc(100vh-160px)] flex flex-col justify-between">',
  '<div className="max-w-md mx-auto px-6 pt-4 h-[calc(100vh-160px)] flex flex-col justify-between">\n' + shortcutsHtml
);

fs.writeFileSync('src/components/SwipeView.tsx', code);
