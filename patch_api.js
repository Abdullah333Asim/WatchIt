import fs from 'fs';
let code = fs.readFileSync('src/lib/api.ts', 'utf-8');

code = code.replace(
  'const userId = localStorage.getItem("userId") || "";',
  'let userId = localStorage.getItem("userId") || "";\n  if (userId === "undefined" || userId === "null") userId = "";'
);

fs.writeFileSync('src/lib/api.ts', code);
