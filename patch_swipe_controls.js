import fs from 'fs';
let code = fs.readFileSync('src/components/SwipeView.tsx', 'utf-8');

// Update Swipe Instructions visibility
code = code.replace(
  '<div className="w-full flex justify-between items-start px-4 py-2 text-white/50 text-[10px] sm:text-xs font-bold tracking-wider">',
  '<div className="w-full flex justify-between items-start px-4 py-2 text-white/50 text-[10px] sm:text-xs font-bold tracking-wider lg:hidden">'
);

// Update Swipe up to add to watchlist visibility
code = code.replace(
  '<div className="flex justify-center items-center gap-2 mb-2 text-white/50 text-xs font-bold uppercase tracking-wider animate-pulse pt-2">',
  '<div className="flex justify-center items-center gap-2 mb-2 text-white/50 text-xs font-bold uppercase tracking-wider animate-pulse pt-2 lg:hidden">'
);

// Update Keyboard Controls sizing
const oldControls = `      {/* Keyboard Shortcuts Guide (Desktop Only) */}
      <div className="hidden lg:flex flex-col fixed left-8 top-1/2 -translate-y-1/2 gap-6 text-white/50 z-50 pointer-events-none">
        <div className="text-xs font-bold uppercase tracking-widest text-white/30 mb-2">Controls</div>
        <div className="flex items-center gap-4">
          <div className="flex gap-1">
            <kbd className="w-10 h-10 flex items-center justify-center bg-white/5 rounded border border-white/10 font-mono text-sm text-white shadow-lg">W</kbd>
            <kbd className="w-10 h-10 flex items-center justify-center bg-white/5 rounded border border-white/10 font-mono text-sm text-white shadow-lg">↑</kbd>
          </div>
          <span className="text-sm font-medium text-[#f59e0b]">Watchlist</span>
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
          <span className="text-sm font-medium">Ignore</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex gap-1">
            <kbd className="w-10 h-10 flex items-center justify-center bg-white/5 rounded border border-white/10 font-mono text-sm text-white shadow-lg">D</kbd>
            <kbd className="w-10 h-10 flex items-center justify-center bg-white/5 rounded border border-white/10 font-mono text-sm text-white shadow-lg">→</kbd>
          </div>
          <span className="text-sm font-medium text-[#00dce5]">Watched</span>
        </div>
      </div>`;

const newControls = `      {/* Keyboard Shortcuts Guide (Desktop Only) */}
      <div className="hidden lg:flex flex-col fixed left-8 top-1/2 -translate-y-1/2 gap-4 text-white/50 z-50 pointer-events-none">
        <div className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-1">Controls</div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            <kbd className="w-8 h-8 flex items-center justify-center bg-white/5 rounded border border-white/10 font-mono text-xs text-white shadow-lg">W</kbd>
            <kbd className="w-8 h-8 flex items-center justify-center bg-white/5 rounded border border-white/10 font-mono text-xs text-white shadow-lg">↑</kbd>
          </div>
          <span className="text-xs font-medium text-[#f59e0b]">Watchlist</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            <kbd className="w-8 h-8 flex items-center justify-center bg-white/5 rounded border border-white/10 font-mono text-xs text-white shadow-lg">A</kbd>
            <kbd className="w-8 h-8 flex items-center justify-center bg-white/5 rounded border border-white/10 font-mono text-xs text-white shadow-lg">←</kbd>
          </div>
          <span className="text-xs font-medium text-red-500">Pass</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            <kbd className="w-8 h-8 flex items-center justify-center bg-white/5 rounded border border-white/10 font-mono text-xs text-white shadow-lg">S</kbd>
            <kbd className="w-8 h-8 flex items-center justify-center bg-white/5 rounded border border-white/10 font-mono text-xs text-white shadow-lg">↓</kbd>
          </div>
          <span className="text-xs font-medium">Ignore</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            <kbd className="w-8 h-8 flex items-center justify-center bg-white/5 rounded border border-white/10 font-mono text-xs text-white shadow-lg">D</kbd>
            <kbd className="w-8 h-8 flex items-center justify-center bg-white/5 rounded border border-white/10 font-mono text-xs text-white shadow-lg">→</kbd>
          </div>
          <span className="text-xs font-medium text-[#00dce5]">Watched</span>
        </div>
      </div>`;

code = code.replace(oldControls, newControls);

fs.writeFileSync('src/components/SwipeView.tsx', code);
