import fs from 'fs';

let code = fs.readFileSync('server.ts', 'utf-8');

// Imports
code = code.replace(
  'import db from "./server/db.ts";',
  'import { db } from "./src/db/index.ts";\nimport { users, movies, swipes, conversations, messages } from "./src/db/schema.ts";\nimport { eq, and, sql, notInArray, desc } from "drizzle-orm";'
);

// Middleware
code = code.replace(
  /const user = db.prepare\("SELECT id FROM users WHERE id = \?"\)\.get\(userId\);/,
  'const user = (await db.select({ id: users.id }).from(users).where(eq(users.id, userId))).at(0);'
);
code = code.replace(
  /db\.prepare\(`[\s\S]*?INSERT OR IGNORE INTO users[\s\S]*?VALUES \(\?, \?, \?, \?, \?\)[\s\S]*?`\)\.run\(userId, "Anonymous Cinephile", "Cinephile", "https:\/\/api\.dicebear\.com\/7\.x\/avataaars\/svg\?seed=" \+ userId, JSON\.stringify\({}\)\);/,
  'await db.insert(users).values({ id: userId, name: "Anonymous Cinephile", bio: "Cinephile", avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=" + userId, tasteDna: JSON.stringify({}) }).onConflictDoNothing();'
);
// Make the middleware async
code = code.replace('app.use("/api", (req, res, next) => {', 'app.use("/api", async (req, res, next) => {');

// Login
code = code.replace(
  /let user = db.prepare\("SELECT \* FROM users WHERE name = \?"\)\.get\(username\) as any;/,
  'let user = (await db.select().from(users).where(eq(users.name, username))).at(0) as any;'
);
code = code.replace(
  /db\.prepare\("UPDATE users SET password = \? WHERE id = \?"\)\.run\(hashedPassword, user\.id\);/,
  'await db.update(users).set({ password: hashedPassword }).where(eq(users.id, user.id));'
);
code = code.replace('app.post("/api/login", (req, res) => {', 'app.post("/api/login", async (req, res) => {');

// Register
code = code.replace(
  /let user = db\.prepare\("SELECT \* FROM users WHERE name = \? COLLATE NOCASE"\)\.get\(username\) as any;/,
  'let user = (await db.select().from(users).where(sql`lower(name) = lower(${username})`)).at(0) as any;'
);
code = code.replace(
  /db\.prepare\(`[\s\S]*?INSERT INTO users \(id, name, bio, avatar_url, taste_dna, password\)[\s\S]*?VALUES \(\?, \?, \?, \?, \?, \?\)[\s\S]*?`\)\.run\(id, username, "Cinephile", "https:\/\/api\.dicebear\.com\/7\.x\/avataaars\/svg\?seed=" \+ encodeURIComponent\(username\), JSON\.stringify\({}\), hashedPassword\);/,
  'await db.insert(users).values({ id, name: username, bio: "Cinephile", avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=" + encodeURIComponent(username), tasteDna: JSON.stringify({}), password: hashedPassword });'
);
code = code.replace('app.post("/api/register", (req, res) => {', 'app.post("/api/register", async (req, res) => {');

// /api/movies
code = code.replace(
  /const movies = db\.prepare\(`[\s\S]*?SELECT \* FROM movies[\s\S]*?WHERE id NOT IN \(SELECT movie_id FROM swipes WHERE user_id = \?\)[\s\S]*?ORDER BY RANDOM\(\)[\s\S]*?LIMIT 10[\s\S]*?`\)\.all\(userId\);/,
  'const movies = await db.execute(sql`SELECT * FROM movies WHERE id NOT IN (SELECT movie_id FROM swipes WHERE user_id = ${userId}) ORDER BY RANDOM() LIMIT 10`);'
);

// /api/swipe POST
code = code.replace(
  /db\.prepare\(`[\s\S]*?DELETE FROM swipes WHERE user_id = \? AND movie_id = \?[\s\S]*?`\)\.run\(userId, movieId\);/,
  'await db.delete(swipes).where(and(eq(swipes.userId, userId), eq(swipes.movieId, movieId)));'
);
code = code.replace(
  /db\.prepare\(`[\s\S]*?INSERT INTO swipes \(user_id, movie_id, action\)[\s\S]*?VALUES \(\?, \?, \?\)[\s\S]*?`\)\.run\(userId, movieId, action\);/,
  'await db.insert(swipes).values({ userId, movieId, action });'
);

// /api/swipe DELETE
code = code.replace(
  /db\.prepare\(`DELETE FROM swipes WHERE user_id = \? AND movie_id = \?`\)\.run\(userId, movieId\);/,
  'await db.delete(swipes).where(and(eq(swipes.userId, userId), eq(swipes.movieId, movieId)));'
);
code = code.replace('app.delete("/api/swipe/:movieId", (req, res) => {', 'app.delete("/api/swipe/:movieId", async (req, res) => {');

// /api/swipe PUT
code = code.replace(
  /db\.prepare\(`UPDATE swipes SET action = \? WHERE user_id = \? AND movie_id = \?`\)\.run\(action, userId, movieId\);/,
  'await db.update(swipes).set({ action }).where(and(eq(swipes.userId, userId), eq(swipes.movieId, movieId)));'
);
code = code.replace('app.put("/api/swipe/:movieId", (req, res) => {', 'app.put("/api/swipe/:movieId", async (req, res) => {');

// /api/profile GET
code = code.replace(
  /const user = db\.prepare\("SELECT \* FROM users WHERE id = \?"\)\.get\(userId\) as any;/,
  'const user = (await db.select().from(users).where(eq(users.id, userId))).at(0) as any;'
);
code = code.replace(
  /const history = db\.prepare\(`[\s\S]*?SELECT m\.\*, s\.action FROM movies m[\s\S]*?JOIN swipes s ON m\.id = s\.movie_id[\s\S]*?WHERE s\.user_id = \?[\s\S]*?GROUP BY m\.id, s\.action[\s\S]*?ORDER BY MAX\(s\.timestamp\) DESC[\s\S]*?`\)\.all\(userId\);/,
  'const historyResult = await db.execute(sql`SELECT m.*, s.action FROM movies m JOIN swipes s ON m.id = s.movie_id WHERE s.user_id = ${userId} GROUP BY m.id, s.action ORDER BY MAX(s.timestamp) DESC`);\n    const history = historyResult.rows || historyResult;'
);
// Also handle the case where it just grouped by m.id (depends on the original query)
code = code.replace(
  /const history = db\.prepare\(`[\s\S]*?SELECT m\.\*, s\.action FROM movies m[\s\S]*?JOIN swipes s ON m\.id = s\.movie_id[\s\S]*?WHERE s\.user_id = \?[\s\S]*?GROUP BY m\.id[\s\S]*?ORDER BY MAX\(s\.timestamp\) DESC[\s\S]*?`\)\.all\(userId\);/,
  'const historyResult = await db.execute(sql`SELECT m.*, s.action FROM movies m JOIN swipes s ON m.id = s.movie_id WHERE s.user_id = ${userId} GROUP BY m.id, s.action ORDER BY MAX(s.timestamp) DESC`);\n    const history = historyResult.rows || historyResult;'
);
code = code.replace('app.get("/api/profile", (req, res) => {', 'app.get("/api/profile", async (req, res) => {');

// /api/profile PUT
code = code.replace(
  /db\.prepare\(`[\s\S]*?UPDATE users[\s\S]*?SET name = \?, bio = \?, avatar_url = \?[\s\S]*?WHERE id = \?[\s\S]*?`\)\.run\(name, bio, avatar_url, userId\);/,
  'await db.update(users).set({ name, bio, avatarUrl: avatar_url }).where(eq(users.id, userId));'
);
code = code.replace('app.put("/api/profile", (req, res) => {', 'app.put("/api/profile", async (req, res) => {');

// /api/conversations GET
code = code.replace(
  /const convos = db\.prepare\(`SELECT \* FROM conversations WHERE user_id = \? ORDER BY updated_at DESC`\)\.all\(userId\);/,
  'const convos = await db.select().from(conversations).where(eq(conversations.userId, userId)).orderBy(desc(conversations.updatedAt));'
);
code = code.replace('app.get("/api/conversations", (req, res) => {', 'app.get("/api/conversations", async (req, res) => {');

// /api/conversations/:id GET
code = code.replace(
  /const convo = db\.prepare\(`SELECT \* FROM conversations WHERE id = \? AND user_id = \?`\)\.get\(id, userId\);/,
  'const convo = (await db.select().from(conversations).where(and(eq(conversations.id, id), eq(conversations.userId, userId)))).at(0);'
);
code = code.replace(
  /const messages\s*=\s*db\.prepare\(`SELECT \* FROM messages WHERE conversation_id = \? ORDER BY timestamp ASC`\)\.all\(id\);/,
  'const messagesResult = await db.select().from(messages).where(eq(messages.conversationId, id)).orderBy(messages.timestamp);\n      const messages = messagesResult;'
);
code = code.replace('app.get("/api/conversations/:id", (req, res) => {', 'app.get("/api/conversations/:id", async (req, res) => {');

// /api/chat POST
code = code.replace(
  /const user = db\.prepare\("SELECT taste_dna FROM users WHERE id = \?"\)\.get\(userId\) as any;/,
  'const user = (await db.select({ tasteDna: users.tasteDna }).from(users).where(eq(users.id, userId))).at(0) as any;'
);
code = code.replace(
  /const history = db\.prepare\(`[\s\S]*?SELECT m\.title, s\.action FROM movies m[\s\S]*?JOIN swipes s ON m\.id = s\.movie_id[\s\S]*?WHERE s\.user_id = \?[\s\S]*?ORDER BY s\.timestamp DESC[\s\S]*?`\)\.all\(userId\) as any\[\];/,
  'const historyResult = await db.execute(sql`SELECT m.title, s.action FROM movies m JOIN swipes s ON m.id = s.movie_id WHERE s.user_id = ${userId} ORDER BY s.timestamp DESC`);\n      const history = (historyResult.rows || historyResult) as any[];'
);
code = code.replace(
  /db\.prepare\(`INSERT INTO conversations \(id, user_id, title\) VALUES \(\?, \?, \?\)`\)\.run\(convId, userId, title\);/,
  'await db.insert(conversations).values({ id: convId, userId, title });'
);
code = code.replace(
  /db\.prepare\(`UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = \?`\)\.run\(convId\);/,
  'await db.execute(sql`UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ${convId}`);'
);
code = code.replace(
  /db\.prepare\(`INSERT INTO messages \(id, conversation_id, role, content\) VALUES \(\?, \?, \?, \?\)`\)\.run\((.*?)\);/g,
  'await db.insert(messages).values({ id: $1, conversationId: $2, role: $3, content: $4 });'
);
code = code.replace(
  /const chatHistory = db\.prepare\(`SELECT role, content FROM messages WHERE conversation_id = \? ORDER BY timestamp ASC LIMIT 10`\)\.all\(convId\) as any\[\];/,
  'const chatHistoryResult = await db.execute(sql`SELECT role, content FROM messages WHERE conversation_id = ${convId} ORDER BY timestamp ASC LIMIT 10`);\n      const chatHistory = (chatHistoryResult.rows || chatHistoryResult) as any[];'
);
code = code.replace(
  /let m = db\.prepare\('SELECT id, poster_url FROM movies WHERE title = \? COLLATE NOCASE'\)\.get\(rec\.title\) as any;/,
  'let m = (await db.execute(sql`SELECT id, poster_url FROM movies WHERE lower(title) = lower(${rec.title})`)).rows?.[0] as any;'
);
code = code.replace(
  /db\.prepare\(`INSERT INTO messages \(id, conversation_id, role, content\) VALUES \(\?, \?, \?, \?\)`\)\.run\(randomUUID\(\), convId, 'ai', response\);/,
  'await db.insert(messages).values({ id: randomUUID(), conversationId: convId, role: "ai", content: response });'
);
code = code.replace(
  /db\.prepare\(`INSERT INTO messages \(id, conversation_id, role, content\) VALUES \(\?, \?, \?, \?\)`\)\.run\(randomUUID\(\), convId, 'user', query\);/,
  'await db.insert(messages).values({ id: randomUUID(), conversationId: convId, role: "user", content: query });'
);

fs.writeFileSync('server.ts', code);
