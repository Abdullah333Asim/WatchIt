import fs from 'fs';
let code = fs.readFileSync('server.ts', 'utf-8');

code = code.replace(
  `      SELECT m.*, s.action FROM movies m
      JOIN swipes s ON m.id = s.movie_id
      WHERE s.user_id = ?
      ORDER BY s.timestamp DESC`,
  `      SELECT m.*, s.action FROM movies m
      JOIN swipes s ON m.id = s.movie_id
      WHERE s.user_id = ?
      GROUP BY m.id
      ORDER BY MAX(s.timestamp) DESC`
);

fs.writeFileSync('server.ts', code);
