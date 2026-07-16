import fs from 'fs';
let code = fs.readFileSync('src/components/SwipeView.tsx', 'utf-8');

const exportLine = 'export default function SwipeView';
const preloadFunc = `export const preloadMovies = async () => {
  if (initialFetched) return;
  try {
    const res = await fetchWithUser(\`/api/movies?page=\${cachedPage}\`);
    const data = await res.json();
    const existingIds = new Set(cachedMovies.map(m => m.id));
    const newMovies = [];
    for (const m of data) {
      if (!existingIds.has(m.id)) {
        newMovies.push(m);
        existingIds.add(m.id);
      }
    }
    cachedMovies = [...cachedMovies, ...newMovies];
    initialFetched = true;
  } catch (err) {
    console.error(err);
  }
};

`;

if (!code.includes('export const preloadMovies')) {
  code = code.replace(exportLine, preloadFunc + exportLine);
  fs.writeFileSync('src/components/SwipeView.tsx', code);
}
