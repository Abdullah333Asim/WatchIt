import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { db } from "./src/db/index.ts";
import { users, movies, swipes, conversations, messages } from "./src/db/schema.ts";
import { eq, and, sql, notInArray, desc } from "drizzle-orm";
import { getRecommendations } from "./server/gemini.ts";
import { randomUUID, createHash } from "crypto";
import { requireAuth, AuthRequest } from "./server/middleware.ts";
import { loadPopularMovies, searchMovieAndSave } from "./server/tmdb.ts";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-guest-key';

async function startServer() {
  const app = express();
  const PORT = 3000;
  
  app.use(express.json({ limit: "50mb" }));

  // Guest Auth Routes
  app.post("/api/auth/register", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Username and password required" });
    
    const cleanUsername = username.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!cleanUsername) return res.status(400).json({ error: "Username must contain alphanumeric characters" });

    try {
      const existingUser = (await db.select().from(users).where(eq(users.name, cleanUsername))).at(0);
      if (existingUser) {
        if (!existingUser.password) return res.status(400).json({ error: "Username already taken" });
        const isValid = await bcrypt.compare(password, existingUser.password);
        if (isValid) {
          const token = jwt.sign({ uid: existingUser.id, name: existingUser.name }, JWT_SECRET, { expiresIn: '30d' });
          return res.json({ token, user: { uid: existingUser.id, name: existingUser.name } });
        }
        return res.status(400).json({ error: "Username already taken" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const userId = `guest_${randomUUID()}`;
      
      await db.insert(users).values({
        id: userId,
        name: cleanUsername,
        password: hashedPassword,
        email: `${cleanUsername}@guest.watchit.com`,
        bio: 'Guest Cinephile',
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`,
        tasteDna: JSON.stringify({})
      });

      const token = jwt.sign({ uid: userId, name: cleanUsername }, JWT_SECRET, { expiresIn: '30d' });
      res.json({ token, user: { uid: userId, name: cleanUsername } });
    } catch (error) {
      console.error("Register error", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Username and password required" });
    
    const cleanUsername = username.toLowerCase().replace(/[^a-z0-9]/g, '');

    try {
      let user = (await db.select().from(users).where(eq(users.name, cleanUsername))).at(0);
      
      if (!user) {
        return res.status(401).json({ error: "Invalid username or password" });
      }

      if (!user.password) return res.status(401).json({ error: "Invalid username or password" });

      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) return res.status(401).json({ error: "Invalid username or password" });

      const token = jwt.sign({ uid: user.id, name: user.name }, JWT_SECRET, { expiresIn: '30d' });
      res.json({ token, user: { uid: user.id, name: user.name } });
    } catch (error) {
      console.error("Login error", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // API Routes
  app.get("/api/movies/:id/reviews", requireAuth, async (req, res) => {
    const { id } = req.params;
    const TMDB_API_KEY = process.env.TMDB_API_KEY;
    if (!TMDB_API_KEY) {
      return res.json([]);
    }
    try {
      const resp = await fetch(`https://api.themoviedb.org/3/movie/${id}/reviews?api_key=${TMDB_API_KEY}&language=en-US&page=1`);
      if (!resp.ok) return res.json([]);
      const data = await resp.json();
      if (data.results && data.results.length > 0) {
        // Only include reviews that are relatively short (e.g. max 250 chars)
        const shortReviews = data.results.filter((r: any) => r.content.length <= 250);
        const reviews = shortReviews.slice(0, 2).map((r: any) => ({
          author: r.author,
          content: r.content
        }));
        return res.json(reviews);
      }
      res.json([]);
    } catch (e) {
      console.error("Error fetching reviews", e);
      res.json([]);
    }
  });

  app.get("/api/movies", requireAuth, async (req, res) => {
    const userId = (req as AuthRequest).user!.uid;
    const page = parseInt(req.query.page as string) || 1;

    // Load dynamic movies from TMDB
    await loadPopularMovies(page);

    // Get movies the user hasn't swiped on yet
    const moviesResult = await db.execute(sql`SELECT * FROM movies WHERE id NOT IN (SELECT movie_id FROM swipes WHERE user_id = ${userId}) ORDER BY RANDOM() LIMIT 10`);
    res.json(moviesResult.rows || moviesResult);
  });

  app.post("/api/swipe", requireAuth, async (req, res) => {
    const { movieId, action } = req.body;
    const userId = (req as AuthRequest).user!.uid;
    
    try {
      await db.delete(swipes).where(and(eq(swipes.userId, userId), eq(swipes.movieId, movieId)));
      
      await db.insert(swipes).values({ userId, movieId, action });
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.delete("/api/swipe/:movieId", requireAuth, async (req, res) => {
    const { movieId } = req.params;
    const userId = (req as AuthRequest).user!.uid;
    try {
      await db.delete(swipes).where(and(eq(swipes.userId, userId), eq(swipes.movieId, movieId)));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.put("/api/swipe/:movieId", requireAuth, async (req, res) => {
    const { movieId } = req.params;
    const { action } = req.body;
    const userId = (req as AuthRequest).user!.uid;
    try {
      await db.update(swipes).set({ action }).where(and(eq(swipes.userId, userId), eq(swipes.movieId, movieId)));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.get("/api/profile", requireAuth, async (req, res) => {
    const userId = (req as AuthRequest).user!.uid;
    const user = (await db.select().from(users).where(eq(users.id, userId))).at(0) as any;
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const historyResult = await db.execute(sql`SELECT m.*, s.action FROM movies m JOIN swipes s ON m.id = s.movie_id WHERE s.user_id = ${userId} GROUP BY m.id, s.action ORDER BY MAX(s.timestamp) DESC`);
    const history = historyResult.rows || historyResult;
    
    res.json({
      ...user,
      avatar_url: user.avatarUrl,
      taste_dna: user.tasteDna ? JSON.parse(user.tasteDna) : {},
      history
    });
  });

  app.put("/api/profile", requireAuth, async (req, res) => {
    const userId = (req as AuthRequest).user!.uid;
    const { name, bio, avatar_url } = req.body;
    try {
      await db.update(users).set({ name, bio, avatarUrl: avatar_url }).where(eq(users.id, userId));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.get("/api/conversations", requireAuth, async (req, res) => {
    const userId = (req as AuthRequest).user!.uid;
    try {
      const convos = await db.select().from(conversations).where(eq(conversations.userId, userId)).orderBy(desc(conversations.updatedAt));
      res.json(convos);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.get("/api/conversations/:id", requireAuth, async (req, res) => {
    const { id } = req.params;
    const userId = (req as AuthRequest).user!.uid;
    try {
      const convo = (await db.select().from(conversations).where(and(eq(conversations.id, id), eq(conversations.userId, userId)))).at(0);
      if (!convo) return res.status(404).json({ error: "Not found" });
      const msgs = await db.select().from(messages).where(eq(messages.conversationId, id)).orderBy(messages.timestamp);
      res.json({ conversation: convo, messages: msgs });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.post("/api/chat", requireAuth, async (req, res) => {
    const { query, conversationId } = req.body;
    const userId = (req as AuthRequest).user!.uid;
    
    try {
      const user = (await db.select({ tasteDna: users.tasteDna }).from(users).where(eq(users.id, userId))).at(0) as any;
      const historyResult = await db.execute(sql`SELECT m.title, s.action FROM movies m JOIN swipes s ON m.id = s.movie_id WHERE s.user_id = ${userId} ORDER BY s.timestamp DESC`);
      const history = (historyResult.rows || historyResult) as any[];
      
      const historyStr = history.slice(0, 20).map(h => `${h.title} (${h.action})`).join(", ");
      
      let convId = conversationId;
      if (!convId) {
        convId = randomUUID();
        const title = query.length > 30 ? query.substring(0, 30) + '...' : query;
        await db.insert(conversations).values({ id: convId, userId, title });
      } else {
        await db.execute(sql`UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ${convId}`);
      }

      await db.insert(messages).values({ id: randomUUID(), conversationId: convId, role: 'user', content: query });

      const chatHistoryResult = await db.execute(sql`SELECT role, content FROM messages WHERE conversation_id = ${convId} ORDER BY timestamp ASC LIMIT 10`);
      const chatHistory = (chatHistoryResult.rows || chatHistoryResult) as any[];
      const chatHistoryStr = chatHistory.map(m => `${m.role === 'user' ? 'User' : 'Cine Noir'}: ${m.content}`).join('\n\n');

      let response = await getRecommendations(user.taste_dna, historyStr, query, chatHistoryStr);
      
      try {
        const parsed = JSON.parse(response);
        if (parsed.recommendations && Array.isArray(parsed.recommendations)) {
          for (let rec of parsed.recommendations) {
            let m = (await db.execute(sql`SELECT id, poster_url FROM movies WHERE lower(title) = lower(${rec.title})`)).rows?.[0] as any;
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
      
      await db.insert(messages).values({ id: randomUUID(), conversationId: convId, role: 'ai', content: response });

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
