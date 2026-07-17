import fs from 'fs';
let code = fs.readFileSync('src/components/ChatView.tsx', 'utf-8');

code = code.replace(
  '<div className="max-w-2xl mx-auto h-[calc(100vh-160px)] flex flex-col relative w-full">',
  '<div className="h-[calc(100vh-160px)] flex flex-col relative w-full">\n      {/* Top Bar Navigation */}\n      <div className="w-full flex justify-between px-6 pt-4 z-20 shrink-0 md:fixed md:top-16 md:left-0 md:w-auto md:flex-col md:gap-2 md:pt-4 md:pl-6 pointer-events-none md:[&>*]:pointer-events-auto">\n        <button onClick={() => setIsSidebarOpen(true)} className="pointer-events-auto glass-panel p-2 flex items-center gap-2 rounded-xl text-white/60 hover:text-white transition-colors">\n          <Menu className="w-5 h-5" />\n        </button>\n        <button onClick={startNewChat} className="pointer-events-auto glass-panel p-2 flex items-center gap-2 rounded-xl text-white/60 hover:text-white transition-colors">\n          <Plus className="w-5 h-5" />\n        </button>\n      </div>\n      <div className="max-w-2xl mx-auto w-full flex flex-col relative flex-grow overflow-hidden">'
);

// We need to delete the old Top Bar Navigation
const oldTopBar = `      {/* Top Bar Navigation */}
      <div className="w-full flex justify-between px-6 pt-4 z-20 shrink-0">
        <button onClick={() => setIsSidebarOpen(true)} className="glass-panel p-2 flex items-center gap-2 rounded-xl text-white/60 hover:text-white transition-colors">
          <Menu className="w-5 h-5" />
        </button>
        <button onClick={startNewChat} className="glass-panel p-2 flex items-center gap-2 rounded-xl text-white/60 hover:text-white transition-colors">
          <Plus className="w-5 h-5" />
        </button>
      </div>`;
code = code.replace(oldTopBar, '');

// Also close the new max-w-2xl div right before the main div closes.
// The main return block is:
//   return (
//     <div ...>
//        ...
//        {/* Sidebar */}
//        <AnimatePresence>
// ...
const lastDivIndex = code.lastIndexOf('</div>\n    </div>\n  );');
if (lastDivIndex !== -1) {
    code = code.substring(0, lastDivIndex) + '</div>\n      </div>\n    </div>\n  );';
} else {
    // try different search
    code = code.replace(/    <\/div>\n  \);\n}\n$/, '      </div>\n    </div>\n  );\n}\n');
}

fs.writeFileSync('src/components/ChatView.tsx', code);
