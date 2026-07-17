import fs from 'fs';

let code = fs.readFileSync('src/App.tsx', 'utf-8');

code = code.replace(
  '  useEffect(() => {\n    import(\'./components/SwipeView\').then(mod => {\n      if (mod.preloadMovies) mod.preloadMovies();\n    });\n  }, []);',
  ''
);

fs.writeFileSync('src/App.tsx', code);
