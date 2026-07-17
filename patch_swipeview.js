import fs from 'fs';

let code = fs.readFileSync('src/components/SwipeView.tsx', 'utf-8');

code = code.replace(
  'const data = await res.json();\n    const existingIds = new Set(cachedMovies.map(m => m.id));',
  'const data = await res.json();\n    if (!Array.isArray(data)) return;\n    const existingIds = new Set(cachedMovies.map(m => m.id));'
);

code = code.replace(
  '.then(data => {\n        setMovies(prev => {',
  '.then(data => {\n        if (!Array.isArray(data)) return;\n        setMovies(prev => {'
);

fs.writeFileSync('src/components/SwipeView.tsx', code);
