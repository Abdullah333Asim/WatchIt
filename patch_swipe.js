import fs from 'fs';
let code = fs.readFileSync('server.ts', 'utf-8');

code = code.replace(
  `      db.prepare(\`
        INSERT INTO swipes (user_id, movie_id, action)
        VALUES (?, ?, ?)
      \`).run(userId, movieId, action);`,
  `      db.prepare(\`
        DELETE FROM swipes WHERE user_id = ? AND movie_id = ?
      \`).run(userId, movieId);
      
      db.prepare(\`
        INSERT INTO swipes (user_id, movie_id, action)
        VALUES (?, ?, ?)
      \`).run(userId, movieId, action);`
);

fs.writeFileSync('server.ts', code);
