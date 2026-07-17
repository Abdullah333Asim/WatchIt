import fs from 'fs';

let code = fs.readFileSync('server.ts', 'utf-8');

code = code.replace(
  'const movies = await db.execute(sql`SELECT * FROM movies WHERE id NOT IN (SELECT movie_id FROM swipes WHERE user_id = ${userId}) ORDER BY RANDOM() LIMIT 10`);\n    res.json(movies);',
  'const moviesResult = await db.execute(sql`SELECT * FROM movies WHERE id NOT IN (SELECT movie_id FROM swipes WHERE user_id = ${userId}) ORDER BY RANDOM() LIMIT 10`);\n    res.json(moviesResult.rows || moviesResult);'
);

fs.writeFileSync('server.ts', code);
