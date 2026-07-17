import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf-8');

code = code.replace(
  'className={`${activeTab === \'profile\' ? \'absolute\' : \'fixed\'} top-0 w-full bg-transparent flex justify-center items-center px-6 h-16 z-50 pointer-events-none transition-opacity duration-300 ${isChatSidebarOpen ? \'opacity-0\' : \'opacity-100\'}`}',
  'className={`${activeTab === \'profile\' ? \'absolute\' : \'fixed\'} top-0 w-full bg-transparent flex justify-center md:justify-start items-center px-6 md:px-6 h-16 z-50 pointer-events-none transition-opacity duration-300 ${isChatSidebarOpen ? \'opacity-0 md:opacity-100\' : \'opacity-100\'}`}'
);

fs.writeFileSync('src/App.tsx', code);
