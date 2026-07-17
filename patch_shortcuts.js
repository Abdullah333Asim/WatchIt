import fs from 'fs';
let code = fs.readFileSync('src/components/SwipeView.tsx', 'utf-8');

const shortcutsHtml = `
      {/* Keyboard Shortcuts Guide (Desktop Only) */}
      <div className="hidden xl:flex flex-col absolute left-8 top-1/2 -translate-y-1/2 gap-4 text-white/50 z-20 pointer-events-none">
        <div className="text-xs font-bold uppercase tracking-widest text-white/30 mb-2">Keyboard</div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            <kbd className="w-8 h-8 flex items-center justify-center bg-white/5 rounded border border-white/10 font-mono text-xs">W</kbd>
            <kbd className="w-8 h-8 flex items-center justify-center bg-white/5 rounded border border-white/10 font-mono text-xs">↑</kbd>
          </div>
          <span className="text-xs font-medium">Ignore</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            <kbd className="w-8 h-8 flex items-center justify-center bg-white/5 rounded border border-white/10 font-mono text-xs">A</kbd>
            <kbd className="w-8 h-8 flex items-center justify-center bg-white/5 rounded border border-white/10 font-mono text-xs">←</kbd>
          </div>
          <span className="text-xs font-medium text-red-500">Pass</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            <kbd className="w-8 h-8 flex items-center justify-center bg-white/5 rounded border border-white/10 font-mono text-xs">S</kbd>
            <kbd className="w-8 h-8 flex items-center justify-center bg-white/5 rounded border border-white/10 font-mono text-xs">↓</kbd>
          </div>
          <span className="text-xs font-medium text-[#f59e0b]">Watchlist</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            <kbd className="w-8 h-8 flex items-center justify-center bg-white/5 rounded border border-white/10 font-mono text-xs">D</kbd>
            <kbd className="w-8 h-8 flex items-center justify-center bg-white/5 rounded border border-white/10 font-mono text-xs">→</kbd>
          </div>
          <span className="text-xs font-medium text-white">Watched</span>
        </div>
      </div>
`;

code = code.replace(
  '<div className="h-[calc(100vh-160px)] flex flex-col relative max-w-sm mx-auto w-full">',
  '<div className="h-[calc(100vh-160px)] flex flex-col relative max-w-sm mx-auto w-full">\n' + shortcutsHtml
);

// Wait, the main div for SwipeView is:
// <div className="h-[calc(100vh-160px)] flex flex-col relative max-w-sm mx-auto w-full">
// Wait, is it max-w-sm? Let's check what it is in the current file.
fs.writeFileSync('patch_shortcuts.js_tmp', 'done');
