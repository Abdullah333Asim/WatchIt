import fs from 'fs';

let code = fs.readFileSync('server/tmdb.ts', 'utf-8');

code = code.replace(
  'import db from "./db.ts";',
  'import { db } from "../src/db/index.ts";\nimport { movies } from "../src/db/schema.ts";\nimport { sql } from "drizzle-orm";'
);

code = code.replace(
  /const insert = db\.prepare\(`[\s\S]*?INSERT INTO movies \(id, title, year, genre, duration, synopsis, poster_url, rating\)[\s\S]*?VALUES \(@id, @title, @year, @genre, @duration, @synopsis, @poster_url, @rating\)[\s\S]*?ON CONFLICT\(id\) DO NOTHING[\s\S]*?`\);[\s\S]*?for \(const m of data\.results\) \{/g,
  'for (const m of data.results) {'
);

code = code.replace(
  /try \{\s*insert\.run\(\{\s*id: m\.id\.toString\(\),\s*title: m\.title,\s*year,\s*genre: genres \|\| 'Unknown',\s*duration: duration,\s*synopsis: m\.overview \|\| 'No synopsis available\.',\s*poster_url: `https:\/\/image\.tmdb\.org\/t\/p\/w500\$\{m\.poster_path\}`,\s*rating: m\.vote_average \? parseFloat\(m\.vote_average\.toFixed\(1\)\) : 0\s*\}\);\s*\} catch \(e\) \{\s*\}/g,
  `try {
           await db.insert(movies).values({
             id: m.id.toString(),
             title: m.title,
             year,
             genre: genres || 'Unknown',
             duration: duration,
             synopsis: m.overview || 'No synopsis available.',
             posterUrl: \`https://image.tmdb.org/t/p/w500\${m.poster_path}\`,
             rating: m.vote_average ? parseFloat(m.vote_average.toFixed(1)) : 0
           }).onConflictDoNothing();
         } catch (e) {
         }`
);

code = code.replace(
  /const insert = db\.prepare\(`[\s\S]*?INSERT INTO movies \(id, title, year, genre, duration, synopsis, poster_url, rating\)[\s\S]*?VALUES \(@id, @title, @year, @genre, @duration, @synopsis, @poster_url, @rating\)[\s\S]*?ON CONFLICT\(id\) DO NOTHING[\s\S]*?`\);\s*try \{\s*insert\.run\(\{\s*id: m\.id\.toString\(\),\s*title: m\.title,\s*year,\s*genre: genres \|\| 'Unknown',\s*duration,\s*synopsis: m\.overview \|\| 'No synopsis available\.',\s*poster_url,\s*rating: m\.vote_average \? parseFloat\(m\.vote_average\.toFixed\(1\)\) : 0\s*\}\);\s*\} catch \(e\) \{\}/g,
  `try {
        await db.insert(movies).values({
          id: m.id.toString(),
          title: m.title,
          year,
          genre: genres || 'Unknown',
          duration,
          synopsis: m.overview || 'No synopsis available.',
          posterUrl: poster_url,
          rating: m.vote_average ? parseFloat(m.vote_average.toFixed(1)) : 0
        }).onConflictDoNothing();
      } catch (e) {}`
);

fs.writeFileSync('server/tmdb.ts', code);
