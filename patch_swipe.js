import fs from 'fs';
let code = fs.readFileSync('src/components/SwipeView.tsx', 'utf-8');

code = code.replace(/w-8 h-8/g, 'w-6 h-6');
code = code.replace(/font-mono text-xs text-white/g, 'font-mono text-[10px] text-white');
code = code.replace(/text-xs font-medium/g, 'text-[10px] font-medium');
code = code.replace(/gap-4/g, 'gap-3');
code = code.replace(/gap-3/g, 'gap-2');
code = code.replace(/mb-1/g, 'mb-0.5');

// Show controls on md instead of lg
code = code.replace(/hidden lg:flex flex-col/g, 'hidden md:flex flex-col');

// Hide arrows on md instead of lg
code = code.replace(/lg:hidden/g, 'md:hidden');

fs.writeFileSync('src/components/SwipeView.tsx', code);
