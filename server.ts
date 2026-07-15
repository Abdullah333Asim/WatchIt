import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import db from "./server/db.ts";
import { getRecommendations } from "./server/gemini.ts";
import { randomUUID, createHash } from "crypto";
import { loadPopularMovies } from "./server/tmdb.ts";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));

  // API Routes
  app.use("/api", (req, res, next) => {
    const userId = req.headers["x-user-id"] as string;
    if (userId && userId !== "default-user") {
      const user = db.prepare("SELECT id FROM users WHERE id = ?").get(userId);
      if (!user) {
        // Recreate missing user to handle transient sqlite resets in deployed environments
        db.prepare(`
          INSERT OR IGNORE INTO users (id, name, bio, avatar_url, taste_dna)
          VALUES (?, ?, ?, ?, ?)
        `).run(userId, "Anonymous Cinephile", "Just Joined", "https://api.dicebear.com/7.x/avataaars/svg?seed=" + userId, JSON.stringify({}));
      }
    }
    next();
  });

  app.post("/api/login", (req, res) => {
    const { username, password } = req.body;
    if (!username) return res.status(400).json({ error: "Username required" });
    if (!password) return res.status(400).json({ error: "Password required" });
    
    try {
      const hashedPassword = createHash('sha256').update(password).digest('hex');
      let user = db.prepare("SELECT * FROM users WHERE name = ? COLLATE NOCASE").get(username) as any;
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      } else {
        if (!user.password) {
          db.prepare("UPDATE users SET password = ? WHERE id = ?").run(hashedPassword, user.id);
        } else if (user.password !== hashedPassword) {
          return res.status(401).json({ error: "Invalid password" });
        }
      }
      res.json({ id: user.id });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.post("/api/register", (req, res) => {
    const { username, password } = req.body;
    if (!username) return res.status(400).json({ error: "Username required" });
    if (!password) return res.status(400).json({ error: "Password required" });
    
    try {
      const hashedPassword = createHash('sha256').update(password).digest('hex');
      let user = db.prepare("SELECT * FROM users WHERE name = ? COLLATE NOCASE").get(username) as any;
      if (user) {
        return res.status(409).json({ error: "Username already exists" });
      }
      const id = randomUUID();
      db.prepare(`
        INSERT INTO users (id, name, bio, avatar_url, taste_dna, password)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(id, username, "Cinephile • Just Joined", "https://api.dicebear.com/7.x/avataaars/svg?seed=" + encodeURIComponent(username), JSON.stringify({}), hashedPassword);
      res.json({ id });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.get("/api/movies", async (req, res) => {
    const userId = req.headers["x-user-id"] || "default-user";
    const page = parseInt(req.query.page as string) || 1;

    // Load dynamic movies from TMDB
    await loadPopularMovies(page);

    // Get movies the user hasn't swiped on yet
    const movies = db.prepare(`
      SELECT * FROM movies 
      WHERE id NOT IN (SELECT movie_id FROM swipes WHERE user_id = ?)
      ORDER BY RANDOM()
      LIMIT 10
    `).all(userId);
    res.json(movies);
  });

  app.post("/api/swipe", async (req, res) => {
    const { movieId, action } = req.body;
    const userId = req.headers["x-user-id"] || "default-user";
    
    try {
      db.prepare(`
        INSERT INTO swipes (user_id, movie_id, action)
        VALUES (?, ?, ?)
      `).run(userId, movieId, action);
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.delete("/api/swipe/:movieId", (req, res) => {
    const { movieId } = req.params;
    const userId = req.headers["x-user-id"] || "default-user";
    try {
      db.prepare(`DELETE FROM swipes WHERE user_id = ? AND movie_id = ?`).run(userId, movieId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.put("/api/swipe/:movieId", (req, res) => {
    const { movieId } = req.params;
    const { action } = req.body;
    const userId = req.headers["x-user-id"] || "default-user";
    try {
      db.prepare(`UPDATE swipes SET action = ? WHERE user_id = ? AND movie_id = ?`).run(action, userId, movieId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.get("/api/profile", (req, res) => {
    const userId = req.headers["x-user-id"] || "default-user";
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId) as any;
    const history = db.prepare(`
      SELECT m.*, s.action FROM movies m
      JOIN swipes s ON m.id = s.movie_id
      WHERE s.user_id = ?
      ORDER BY s.timestamp DESC
    `).all(userId);
    
    res.json({
      ...user,
      taste_dna: JSON.parse(user.taste_dna),
      history
    });
  });

  app.put("/api/profile", (req, res) => {
    const userId = req.headers["x-user-id"] || "default-user";
    const { name, bio, avatar_url } = req.body;
    try {
      db.prepare(`
        UPDATE users 
        SET name = ?, bio = ?, avatar_url = ?
        WHERE id = ?
      `).run(name, bio, avatar_url, userId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.get("/api/conversations", (req, res) => {
    const userId = req.headers["x-user-id"] || "default-user";
    try {
      const convos = db.prepare(`SELECT * FROM conversations WHERE user_id = ? ORDER BY updated_at DESC`).all(userId);
      res.json(convos);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.get("/api/conversations/:id", (req, res) => {
    const { id } = req.params;
    const userId = req.headers["x-user-id"] || "default-user";
    try {
      const convo = db.prepare(`SELECT * FROM conversations WHERE id = ? AND user_id = ?`).get(id, userId);
      if (!convo) return res.status(404).json({ error: "Not found" });
      const messages = db.prepare(`SELECT * FROM messages WHERE conversation_id = ? ORDER BY timestamp ASC`).all(id);
      res.json({ conversation: convo, messages });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.post("/api/chat", async (req, res) => {
    const { query, conversationId } = req.body;
    const userId = req.headers["x-user-id"] || "default-user";
    
    try {
      const user = db.prepare("SELECT taste_dna FROM users WHERE id = ?").get(userId) as any;
      const history = db.prepare(`
        SELECT m.title, s.action FROM movies m
        JOIN swipes s ON m.id = s.movie_id
        WHERE s.user_id = ?
      `).all(userId) as any[];
      
      const historyStr = history.map(h => `${h.title} (${h.action})`).join(", ");
      
      let convId = conversationId;
      if (!convId) {
        convId = randomUUID();
        const title = query.length > 30 ? query.substring(0, 30) + '...' : query;
        db.prepare(`INSERT INTO conversations (id, user_id, title) VALUES (?, ?, ?)`).run(convId, userId, title);
      } else {
        db.prepare(`UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(convId);
      }

      db.prepare(`INSERT INTO messages (id, conversation_id, role, content) VALUES (?, ?, ?, ?)`).run(randomUUID(), convId, 'user', query);

      const chatHistory = db.prepare(`SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY timestamp ASC LIMIT 20`).all(convId) as any[];
      const chatHistoryStr = chatHistory.map(m => `${m.role === 'user' ? 'User' : 'Cine Noir'}: ${m.content}`).join('\n\n');

      const response = await getRecommendations(user.taste_dna, historyStr, query, chatHistoryStr);
      
      db.prepare(`INSERT INTO messages (id, conversation_id, role, content) VALUES (?, ?, ?, ?)`).run(randomUUID(), convId, 'ai', response);

      res.json({ response, conversationId: convId });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
