import fs from 'fs';
let code = fs.readFileSync('server.ts', 'utf-8');

code = code.replace(
  'import { loadPopularMovies } from "./server/tmdb.ts";',
  'import { loadPopularMovies, searchMovieAndSave } from "./server/tmdb.ts";'
);

const oldLogic = `      const response = await getRecommendations(user.taste_dna, historyStr, query, chatHistoryStr);
      
      db.prepare(\`INSERT INTO messages (id, conversation_id, role, content) VALUES (?, ?, ?, ?)\`).run(randomUUID(), convId, 'ai', response);

      res.json({ response, conversationId: convId });`;

const newLogic = `      let response = await getRecommendations(user.taste_dna, historyStr, query, chatHistoryStr);
      
      try {
        const parsed = JSON.parse(response);
        if (parsed.recommendations && Array.isArray(parsed.recommendations)) {
          for (let rec of parsed.recommendations) {
            let m = db.prepare('SELECT id, poster_url FROM movies WHERE title = ? COLLATE NOCASE').get(rec.title) as any;
            if (!m) {
              m = await searchMovieAndSave(rec.title, rec.year);
            }
            if (m) {
              rec.movie_id = m.id;
              rec.poster_url = m.poster_url;
            }
          }
          response = JSON.stringify(parsed);
        }
      } catch (e) {
        console.error("Failed to parse recommendations", e);
      }
      
      db.prepare(\`INSERT INTO messages (id, conversation_id, role, content) VALUES (?, ?, ?, ?)\`).run(randomUUID(), convId, 'ai', response);

      res.json({ response, conversationId: convId });`;

code = code.replace(oldLogic, newLogic);
fs.writeFileSync('server.ts', code);
