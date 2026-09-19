var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc2) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc2 = __getOwnPropDesc(from, key)) || desc2.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// app.ts
var app_exports = {};
__export(app_exports, {
  app: () => app,
  createApp: () => createApp,
  default: () => app_default
});
module.exports = __toCommonJS(app_exports);
var import_config2 = require("dotenv/config");
var import_express = __toESM(require("express"));

// src/db/index.ts
var import_config = require("dotenv/config");
var import_node_postgres = require("drizzle-orm/node-postgres");
var import_pg = __toESM(require("pg"));

// src/db/schema.ts
var schema_exports = {};
__export(schema_exports, {
  conversations: () => conversations,
  messages: () => messages,
  movies: () => movies,
  swipes: () => swipes,
  users: () => users
});
var import_pg_core = require("drizzle-orm/pg-core");
var users = (0, import_pg_core.pgTable)("users", {
  id: (0, import_pg_core.text)("id").primaryKey(),
  name: (0, import_pg_core.text)("name"),
  email: (0, import_pg_core.text)("email"),
  bio: (0, import_pg_core.text)("bio"),
  avatarUrl: (0, import_pg_core.text)("avatar_url"),
  tasteDna: (0, import_pg_core.text)("taste_dna"),
  password: (0, import_pg_core.text)("password")
});
var movies = (0, import_pg_core.pgTable)("movies", {
  id: (0, import_pg_core.text)("id").primaryKey(),
  title: (0, import_pg_core.text)("title").notNull(),
  year: (0, import_pg_core.integer)("year"),
  genre: (0, import_pg_core.text)("genre"),
  duration: (0, import_pg_core.text)("duration"),
  synopsis: (0, import_pg_core.text)("synopsis"),
  posterUrl: (0, import_pg_core.text)("poster_url"),
  rating: (0, import_pg_core.real)("rating")
});
var swipes = (0, import_pg_core.pgTable)("swipes", {
  userId: (0, import_pg_core.text)("user_id").notNull().references(() => users.id),
  movieId: (0, import_pg_core.text)("movie_id").notNull().references(() => movies.id),
  action: (0, import_pg_core.text)("action"),
  timestamp: (0, import_pg_core.timestamp)("timestamp").defaultNow()
}, (table) => ({
  pk: (0, import_pg_core.primaryKey)({ columns: [table.userId, table.movieId] }),
  userIdIdx: (0, import_pg_core.index)("swipes_user_id_idx").on(table.userId)
}));
var conversations = (0, import_pg_core.pgTable)("conversations", {
  id: (0, import_pg_core.text)("id").primaryKey(),
  userId: (0, import_pg_core.text)("user_id").notNull().references(() => users.id),
  title: (0, import_pg_core.text)("title"),
  updatedAt: (0, import_pg_core.timestamp)("updated_at").defaultNow()
}, (table) => ({
  userIdIdx: (0, import_pg_core.index)("conversations_user_id_idx").on(table.userId)
}));
var messages = (0, import_pg_core.pgTable)("messages", {
  id: (0, import_pg_core.text)("id").primaryKey(),
  conversationId: (0, import_pg_core.text)("conversation_id").notNull().references(() => conversations.id),
  role: (0, import_pg_core.text)("role"),
  content: (0, import_pg_core.text)("content"),
  timestamp: (0, import_pg_core.timestamp)("timestamp").defaultNow()
}, (table) => ({
  conversationIdIdx: (0, import_pg_core.index)("messages_conversation_id_idx").on(table.conversationId)
}));

// src/db/index.ts
var sqlConnectionString = process.env.DATABASE_URL || process.env.SQL_CONNECTION_STRING;
var sqlPortRaw = process.env.SQL_PORT;
var sqlPort = sqlPortRaw ? Number(sqlPortRaw) : void 0;
if (sqlPortRaw && (!Number.isInteger(sqlPort) || sqlPort <= 0)) {
  throw new Error("SQL_PORT must be a positive integer.");
}
var sqlSsl = process.env.SQL_SSL === "true";
var sqlSslRejectUnauthorized = process.env.SQL_SSL_REJECT_UNAUTHORIZED === "true";
var pool = new import_pg.default.Pool(
  sqlConnectionString ? {
    connectionString: sqlConnectionString,
    ssl: sqlSsl ? { rejectUnauthorized: sqlSslRejectUnauthorized } : void 0,
    connectionTimeoutMillis: 8e3
  } : {
    host: process.env.SQL_HOST,
    port: sqlPort,
    user: process.env.SQL_USER,
    password: process.env.SQL_PASSWORD,
    database: process.env.SQL_DB_NAME,
    ssl: sqlSsl ? { rejectUnauthorized: sqlSslRejectUnauthorized } : void 0,
    connectionTimeoutMillis: 8e3
  }
);
pool.on("error", (err) => {
  console.error("Unexpected error on idle SQL pool client:", err);
});
var db = (0, import_node_postgres.drizzle)(pool, { schema: schema_exports });

// app.ts
var import_drizzle_orm3 = require("drizzle-orm");

// server/gemini.ts
var import_genai = require("@google/genai");
var import_groq_sdk = __toESM(require("groq-sdk"));
var import_cerebras_cloud_sdk = __toESM(require("@cerebras/cerebras_cloud_sdk"));
var import_dotenv = __toESM(require("dotenv"));
import_dotenv.default.config();
if (!process.env.GEMINI_API_KEY) {
  console.warn("GEMINI_API_KEY is not set. AI features will not work.");
}
var ai = new import_genai.GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build"
    }
  }
});
async function getRecommendations(preferences, history, query, chatHistoryText = "") {
  const safeHistory = (history || "").replace(/[\r\n\t]+/g, " ").slice(0, 1e3);
  const safeQuery = (query || "").replace(/[\r\n\t]+/g, " ").slice(0, 500);
  const safeChatHistory = (chatHistoryText || "").slice(0, 2e3);
  const prompt = `
    You are Cine Noir, a friendly, semi-formal movie recommender.
    User's Recently Swiped/Watched History (DO NOT recommend these again): ${safeHistory}
    
    Previous Conversation:
    ${safeChatHistory}
    
    User Request: ${safeQuery}
    
    Provide highly specific movie/show recommendations based on their watched history and request. 
    Focus on the "vibe" and specific artistic preferences.
    Act as if you are a sophisticated curator in a dark, atmospheric theater lobby.

    You MUST respond with valid JSON in the following format:
    {
      "reply": "Your conversational reply to the user, spoken as Cine Noir.",
      "recommendations": [
        {
          "title": "Movie title",
          "year": "Release year",
          "synopsis": "Brief synopsis",
          "why_it_matches": "Why it matches their taste"
        }
      ]
    }
  `;
  const fetchGemini = async () => {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: import_genai.Type.OBJECT,
          properties: {
            reply: {
              type: import_genai.Type.STRING,
              description: "Your conversational reply to the user, spoken as Cine Noir."
            },
            recommendations: {
              type: import_genai.Type.ARRAY,
              description: "A list of movie recommendations.",
              items: {
                type: import_genai.Type.OBJECT,
                properties: {
                  title: { type: import_genai.Type.STRING, description: "Movie title" },
                  year: { type: import_genai.Type.STRING, description: "Release year" },
                  synopsis: { type: import_genai.Type.STRING, description: "Brief synopsis" },
                  why_it_matches: { type: import_genai.Type.STRING, description: "Why it matches their taste" }
                },
                required: ["title", "year", "synopsis", "why_it_matches"]
              }
            }
          },
          required: ["reply", "recommendations"]
        }
      }
    });
    return response.text;
  };
  const fetchGroq = async () => {
    if (!process.env.GROQ_API_KEY) {
      throw new Error("GROQ_API_KEY not set");
    }
    const groq = new import_groq_sdk.default({ apiKey: process.env.GROQ_API_KEY });
    const response = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" },
      temperature: 0.7
    });
    return response.choices[0]?.message?.content;
  };
  const fetchCerebras = async () => {
    if (!process.env.CEREBRAS_API_KEY) {
      throw new Error("CEREBRAS_API_KEY not set");
    }
    const cerebras = new import_cerebras_cloud_sdk.default({ apiKey: process.env.CEREBRAS_API_KEY });
    const response = await cerebras.chat.completions.create({
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      model: "llama3.1-70b",
      response_format: { type: "json_object" },
      temperature: 0.7
    });
    if (!("choices" in response)) {
      throw new Error("Cerebras returned an unexpected response shape");
    }
    const firstChoice = response.choices[0];
    if (!firstChoice) return null;
    if ("message" in firstChoice) return firstChoice.message?.content;
    if ("delta" in firstChoice) return firstChoice.delta?.content;
    return null;
  };
  try {
    const result = await Promise.any([fetchCerebras(), fetchGroq(), fetchGemini()]);
    if (!result) throw new Error("Empty response");
    return result;
  } catch (error) {
    console.error("Both APIs failed or returned empty", error);
    const fallback = await fetchGemini();
    return fallback;
  }
}

// app.ts
var import_crypto = require("crypto");

// server/firebase-admin.ts
var import_app = require("firebase-admin/app");
var import_auth = require("firebase-admin/auth");
if (!(0, import_app.getApps)().length) {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const firebaseProjectId = process.env.FIREBASE_PROJECT_ID;
  if (serviceAccountJson) {
    let parsedServiceAccount;
    try {
      parsedServiceAccount = JSON.parse(serviceAccountJson);
    } catch (e) {
      throw new Error(`FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON: ${e.message}`);
    }
    if (!parsedServiceAccount.project_id || !parsedServiceAccount.client_email || !parsedServiceAccount.private_key) {
      throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is missing required fields (project_id, client_email, private_key).");
    }
    if (parsedServiceAccount.private_key.includes("\\n")) {
      parsedServiceAccount.private_key = parsedServiceAccount.private_key.replace(/\\n/g, "\n");
    }
    (0, import_app.initializeApp)({
      credential: (0, import_app.cert)(parsedServiceAccount),
      projectId: parsedServiceAccount.project_id
    });
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    (0, import_app.initializeApp)({
      credential: (0, import_app.applicationDefault)(),
      ...firebaseProjectId ? { projectId: firebaseProjectId } : {}
    });
  } else {
    throw new Error(
      "Firebase Admin credentials are not configured. Set FIREBASE_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS in your environment variables."
    );
  }
}
var adminAuth = (0, import_auth.getAuth)();

// server/middleware.ts
var import_drizzle_orm = require("drizzle-orm");
var import_jsonwebtoken = __toESM(require("jsonwebtoken"));
var JWT_SECRET = process.env.JWT_SECRET || "super-secret-guest-key";
var requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: Missing token" });
  }
  const token = authHeader.split("Bearer ")[1];
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.user = decodedToken;
    await db.insert(users).values({
      id: decodedToken.uid,
      name: decodedToken.name || "Anonymous",
      email: decodedToken.email,
      bio: "Cinephile",
      avatarUrl: decodedToken.picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${decodedToken.uid}`,
      tasteDna: JSON.stringify({})
    }).onConflictDoNothing();
    return next();
  } catch (error) {
    const decodedToken = import_jsonwebtoken.default.decode(token, { complete: true });
    if (decodedToken?.header?.alg !== "HS256") {
      console.error("Error verifying Firebase ID token:", error);
      return res.status(401).json({ error: "Unauthorized: Invalid token" });
    }
    try {
      const decodedGuest = import_jsonwebtoken.default.verify(token, JWT_SECRET, { algorithms: ["HS256"] });
      const userExists = (await db.select().from(users).where((0, import_drizzle_orm.eq)(users.id, decodedGuest.uid))).at(0);
      if (!userExists) {
        return res.status(401).json({ error: "Unauthorized: User not found" });
      }
      req.user = decodedGuest;
      return next();
    } catch (jwtError) {
      console.error("Error verifying Firebase ID token and custom JWT:", error, jwtError);
      return res.status(401).json({ error: "Unauthorized: Invalid token" });
    }
  }
};

// server/tmdb.ts
var import_drizzle_orm2 = require("drizzle-orm");
var TMDB_API_KEY = process.env.TMDB_API_KEY;
var TMDB_BASE_URL = "https://api.themoviedb.org/3";
var GENRES = {
  28: "Action",
  12: "Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  14: "Fantasy",
  36: "History",
  27: "Horror",
  10402: "Music",
  9648: "Mystery",
  10749: "Romance",
  878: "Science Fiction",
  10770: "TV Movie",
  53: "Thriller",
  10752: "War",
  37: "Western"
};
async function loadPopularMovies(page = 1) {
  if (!TMDB_API_KEY) {
    console.warn("TMDB_API_KEY not set, falling back to local DB only.");
    return false;
  }
  try {
    const res = await fetch(`${TMDB_BASE_URL}/movie/popular?api_key=${TMDB_API_KEY}&language=en-US&page=${page}`);
    if (!res.ok) {
      console.error("TMDB error", await res.text());
      return false;
    }
    const data = await res.json();
    if (data.results && Array.isArray(data.results)) {
      for (const m of data.results) {
        if (!m.poster_path) continue;
        const existing = (await db.execute(import_drizzle_orm2.sql`SELECT id FROM movies WHERE id = ${m.id.toString()}`)).rows?.[0];
        if (existing) continue;
        const year = m.release_date ? parseInt(m.release_date.split("-")[0]) : 0;
        const genres = (m.genre_ids || []).map((id) => GENRES[id]).filter(Boolean).join(", ");
        let duration = "120m";
        try {
          const detailRes = await fetch(`${TMDB_BASE_URL}/movie/${m.id}?api_key=${TMDB_API_KEY}&language=en-US`);
          if (detailRes.ok) {
            const detailData = await detailRes.json();
            if (detailData.runtime) {
              duration = `${detailData.runtime}m`;
            }
          }
        } catch (e) {
          console.error("Failed to fetch movie detail", e);
        }
        try {
          await db.insert(movies).values({
            id: m.id.toString(),
            title: m.title,
            year,
            genre: genres || "Unknown",
            duration,
            synopsis: m.overview || "No synopsis available.",
            posterUrl: `https://image.tmdb.org/t/p/w500${m.poster_path}`,
            rating: m.vote_average ? parseFloat(m.vote_average.toFixed(1)) : 0
          }).onConflictDoNothing();
        } catch (e) {
        }
      }
      return true;
    }
  } catch (e) {
    console.error("Failed to load TMDB movies", e);
  }
  return false;
}
async function searchMovieAndSave(title, yearStr) {
  if (!TMDB_API_KEY) return null;
  try {
    const cleanTitle = title.replace(/\s*[\(\[\{]\d{4}[\)\]\}]\s*$/, "").trim();
    const cleanYear = yearStr && !isNaN(parseInt(yearStr)) ? parseInt(yearStr).toString() : "";
    const yearQuery = cleanYear ? `&primary_release_year=${cleanYear}` : "";
    let res = await fetch(`${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(cleanTitle)}${yearQuery}&language=en-US`);
    if (!res.ok) return null;
    let data = await res.json();
    if ((!data.results || data.results.length === 0) && yearQuery) {
      res = await fetch(`${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(cleanTitle)}&language=en-US`);
      if (res.ok) {
        data = await res.json();
      }
    }
    if (data.results && data.results.length > 0) {
      const m = data.results.find((item) => item.poster_path) || data.results[0];
      const year = m.release_date ? parseInt(m.release_date.split("-")[0]) : cleanYear ? parseInt(cleanYear) : 0;
      const genres = (m.genre_ids || []).map((id) => GENRES[id]).filter(Boolean).join(", ");
      let duration = "120m";
      try {
        const detailRes = await fetch(`${TMDB_BASE_URL}/movie/${m.id}?api_key=${TMDB_API_KEY}&language=en-US`);
        if (detailRes.ok) {
          const detailData = await detailRes.json();
          if (detailData.runtime) {
            duration = `${detailData.runtime}m`;
          }
        }
      } catch (e) {
      }
      const poster_url = m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : null;
      try {
        await db.insert(movies).values({
          id: m.id.toString(),
          title: m.title,
          year,
          genre: genres || "Unknown",
          duration,
          synopsis: m.overview || "No synopsis available.",
          posterUrl: poster_url,
          rating: m.vote_average ? parseFloat(m.vote_average.toFixed(1)) : 0
        }).onConflictDoUpdate({
          target: movies.id,
          set: {
            posterUrl: poster_url,
            title: m.title,
            year,
            rating: m.vote_average ? parseFloat(m.vote_average.toFixed(1)) : 0
          }
        });
      } catch (e) {
      }
      return {
        id: m.id.toString(),
        title: m.title,
        year,
        poster_url,
        rating: m.vote_average ? parseFloat(m.vote_average.toFixed(1)) : 0
      };
    }
  } catch (e) {
    console.error("Failed to search movie", e);
  }
  return null;
}

// app.ts
var import_bcryptjs = __toESM(require("bcryptjs"));
var import_jsonwebtoken2 = __toESM(require("jsonwebtoken"));
var JWT_SECRET2 = process.env.JWT_SECRET || "super-secret-guest-key";
function createApp() {
  const app2 = (0, import_express.default)();
  app2.use(import_express.default.json({ limit: "50mb" }));
  app2.get("/api/health", async (_req, res) => {
    const checks = {
      env: {
        hasFirebaseServiceAccount: !!process.env.FIREBASE_SERVICE_ACCOUNT_JSON,
        hasTmdbKey: !!process.env.TMDB_API_KEY,
        hasGeminiKey: !!process.env.GEMINI_API_KEY || !!process.env.GOOGLE_GENERATIVE_AI_API_KEY,
        hasJwtSecret: !!process.env.JWT_SECRET,
        hasDatabaseUrl: !!process.env.DATABASE_URL,
        nodeEnv: process.env.NODE_ENV,
        isVercel: !!process.env.VERCEL
      }
    };
    try {
      await db.execute(import_drizzle_orm3.sql`SELECT 1`);
      checks.database = "ok";
    } catch (e) {
      checks.database = `error: ${e.message}`;
    }
    res.json(checks);
  });
  app2.post("/api/auth/register", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Username and password required" });
    const cleanUsername = username.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (!cleanUsername) return res.status(400).json({ error: "Username must contain alphanumeric characters" });
    try {
      const existingUser = (await db.select().from(users).where((0, import_drizzle_orm3.eq)(users.name, cleanUsername))).at(0);
      if (existingUser) {
        if (!existingUser.password) return res.status(400).json({ error: "Username already taken" });
        const isValid = await import_bcryptjs.default.compare(password, existingUser.password);
        if (isValid) {
          const token2 = import_jsonwebtoken2.default.sign({ uid: existingUser.id, name: existingUser.name }, JWT_SECRET2, { expiresIn: "30d" });
          return res.json({ token: token2, user: { uid: existingUser.id, name: existingUser.name } });
        }
        return res.status(400).json({ error: "Username already taken" });
      }
      const hashedPassword = await import_bcryptjs.default.hash(password, 10);
      const userId = `guest_${(0, import_crypto.randomUUID)()}`;
      await db.insert(users).values({
        id: userId,
        name: cleanUsername,
        password: hashedPassword,
        email: `${cleanUsername}@guest.watchit.com`,
        bio: "Guest Cinephile",
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`,
        tasteDna: JSON.stringify({})
      });
      const token = import_jsonwebtoken2.default.sign({ uid: userId, name: cleanUsername }, JWT_SECRET2, { expiresIn: "30d" });
      res.json({ token, user: { uid: userId, name: cleanUsername } });
    } catch (error) {
      console.error("Register error", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  app2.post("/api/auth/login", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Username and password required" });
    const cleanUsername = username.toLowerCase().replace(/[^a-z0-9]/g, "");
    try {
      const user = (await db.select().from(users).where((0, import_drizzle_orm3.eq)(users.name, cleanUsername))).at(0);
      if (!user) {
        return res.status(401).json({ error: "Invalid username or password" });
      }
      if (!user.password) return res.status(401).json({ error: "Invalid username or password" });
      const isValid = await import_bcryptjs.default.compare(password, user.password);
      if (!isValid) return res.status(401).json({ error: "Invalid username or password" });
      const token = import_jsonwebtoken2.default.sign({ uid: user.id, name: user.name }, JWT_SECRET2, { expiresIn: "30d" });
      res.json({ token, user: { uid: user.id, name: user.name } });
    } catch (error) {
      console.error("Login error", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  app2.get("/api/movies/:id/reviews", requireAuth, async (req, res) => {
    const { id } = req.params;
    const TMDB_API_KEY2 = process.env.TMDB_API_KEY;
    if (!TMDB_API_KEY2) {
      return res.json([]);
    }
    try {
      const resp = await fetch(`https://api.themoviedb.org/3/movie/${encodeURIComponent(id)}/reviews?api_key=${TMDB_API_KEY2}&language=en-US&page=1`);
      if (!resp.ok) return res.json([]);
      const data = await resp.json();
      if (data.results && data.results.length > 0) {
        const shortReviews = data.results.filter((r) => r.content && r.content.length <= 250);
        const reviews = shortReviews.slice(0, 2).map((r) => ({
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
  app2.get("/api/movies", requireAuth, async (req, res) => {
    const userId = req.user.uid;
    const page = parseInt(req.query.page) || 1;
    try {
      await loadPopularMovies(page);
      const moviesResult = await db.execute(import_drizzle_orm3.sql`SELECT * FROM movies WHERE id NOT IN (SELECT movie_id FROM swipes WHERE user_id = ${userId}) ORDER BY RANDOM() LIMIT 10`);
      res.json(moviesResult.rows || moviesResult);
    } catch (error) {
      console.error("Get movies error", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  app2.post("/api/swipe", requireAuth, async (req, res) => {
    const { movieId, action } = req.body;
    const userId = req.user.uid;
    if (!movieId || !action) {
      return res.status(400).json({ error: "movieId and action are required" });
    }
    try {
      await db.delete(swipes).where((0, import_drizzle_orm3.and)((0, import_drizzle_orm3.eq)(swipes.userId, userId), (0, import_drizzle_orm3.eq)(swipes.movieId, movieId)));
      await db.insert(swipes).values({ userId, movieId, action });
      res.json({ success: true });
    } catch (error) {
      console.error("Post swipe error", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  app2.delete("/api/swipe/:movieId", requireAuth, async (req, res) => {
    const { movieId } = req.params;
    const userId = req.user.uid;
    try {
      await db.delete(swipes).where((0, import_drizzle_orm3.and)((0, import_drizzle_orm3.eq)(swipes.userId, userId), (0, import_drizzle_orm3.eq)(swipes.movieId, movieId)));
      res.json({ success: true });
    } catch (error) {
      console.error("Delete swipe error", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  app2.put("/api/swipe/:movieId", requireAuth, async (req, res) => {
    const { movieId } = req.params;
    const { action } = req.body;
    const userId = req.user.uid;
    try {
      await db.update(swipes).set({ action }).where((0, import_drizzle_orm3.and)((0, import_drizzle_orm3.eq)(swipes.userId, userId), (0, import_drizzle_orm3.eq)(swipes.movieId, movieId)));
      res.json({ success: true });
    } catch (error) {
      console.error("Put swipe error", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  app2.get("/api/profile", requireAuth, async (req, res) => {
    const userId = req.user.uid;
    try {
      const user = (await db.select().from(users).where((0, import_drizzle_orm3.eq)(users.id, userId))).at(0);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      const historyResult = await db.execute(import_drizzle_orm3.sql`SELECT m.*, s.action FROM movies m JOIN swipes s ON m.id = s.movie_id WHERE s.user_id = ${userId} GROUP BY m.id, s.action ORDER BY MAX(s.timestamp) DESC`);
      const history = historyResult.rows || historyResult;
      res.json({
        ...user,
        avatar_url: user.avatarUrl,
        taste_dna: user.tasteDna ? JSON.parse(user.tasteDna) : {},
        history
      });
    } catch (error) {
      console.error("Get profile error", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  app2.put("/api/profile", requireAuth, async (req, res) => {
    const userId = req.user.uid;
    const { name, bio, avatar_url } = req.body;
    try {
      await db.update(users).set({ name, bio, avatarUrl: avatar_url }).where((0, import_drizzle_orm3.eq)(users.id, userId));
      res.json({ success: true });
    } catch (error) {
      console.error("Put profile error", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  app2.get("/api/conversations", requireAuth, async (req, res) => {
    const userId = req.user.uid;
    try {
      const convos = await db.select().from(conversations).where((0, import_drizzle_orm3.eq)(conversations.userId, userId)).orderBy((0, import_drizzle_orm3.desc)(conversations.updatedAt));
      res.json(convos);
    } catch (error) {
      console.error("Get conversations error", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  app2.get("/api/conversations/:id", requireAuth, async (req, res) => {
    const { id } = req.params;
    const userId = req.user.uid;
    try {
      const convo = (await db.select().from(conversations).where((0, import_drizzle_orm3.and)((0, import_drizzle_orm3.eq)(conversations.id, id), (0, import_drizzle_orm3.eq)(conversations.userId, userId)))).at(0);
      if (!convo) return res.status(404).json({ error: "Not found" });
      const msgs = await db.select().from(messages).where((0, import_drizzle_orm3.eq)(messages.conversationId, id)).orderBy(messages.timestamp);
      res.json({ conversation: convo, messages: msgs });
    } catch (error) {
      console.error("Get conversation error", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  app2.post("/api/chat", requireAuth, async (req, res) => {
    const { query, conversationId } = req.body;
    const userId = req.user.uid;
    if (!query) {
      return res.status(400).json({ error: "Query parameter is required" });
    }
    try {
      const user = (await db.select({ tasteDna: users.tasteDna }).from(users).where((0, import_drizzle_orm3.eq)(users.id, userId))).at(0);
      const historyResult = await db.execute(import_drizzle_orm3.sql`SELECT m.title, s.action FROM movies m JOIN swipes s ON m.id = s.movie_id WHERE s.user_id = ${userId} ORDER BY s.timestamp DESC LIMIT 20`);
      const history = historyResult.rows || historyResult;
      const historyStr = history.map((h) => `${h.title} (${h.action})`).join(", ");
      let convId = conversationId;
      if (!convId) {
        convId = (0, import_crypto.randomUUID)();
        const title = query.length > 30 ? query.substring(0, 30) + "..." : query;
        await db.insert(conversations).values({ id: convId, userId, title });
      } else {
        await db.execute(import_drizzle_orm3.sql`UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ${convId}`);
      }
      await db.insert(messages).values({ id: (0, import_crypto.randomUUID)(), conversationId: convId, role: "user", content: query });
      const chatHistoryResult = await db.execute(import_drizzle_orm3.sql`SELECT role, content FROM messages WHERE conversation_id = ${convId} ORDER BY timestamp ASC LIMIT 20`);
      const chatHistory = chatHistoryResult.rows || chatHistoryResult;
      const chatHistoryStr = chatHistory.map((m) => `${m.role === "user" ? "User" : "Cine Noir"}: ${m.content}`).join("\n\n");
      let response = await getRecommendations(user?.tasteDna || "", historyStr, query, chatHistoryStr);
      try {
        const parsed = JSON.parse(response);
        if (parsed.recommendations && Array.isArray(parsed.recommendations)) {
          for (let rec of parsed.recommendations) {
            const cleanRecTitle = (rec.title || "").replace(/\s*[\(\[\{]\d{4}[\)\]\}]\s*$/, "").trim();
            let m = (await db.execute(import_drizzle_orm3.sql`SELECT id, title, year, poster_url, rating FROM movies WHERE lower(title) = lower(${cleanRecTitle}) OR lower(title) = lower(${rec.title})`)).rows?.[0];
            if (!m || !m.poster_url) {
              const searched = await searchMovieAndSave(rec.title, rec.year);
              if (searched) {
                m = searched;
              }
            }
            if (m) {
              rec.movie_id = m.id;
              rec.poster_url = m.poster_url || m.posterUrl;
              if (m.title) rec.title = m.title;
              if (m.year) rec.year = m.year;
              if (m.rating) rec.rating = m.rating;
            }
          }
          response = JSON.stringify(parsed);
        }
      } catch (e) {
        console.error("Failed to parse recommendations", e);
      }
      await db.insert(messages).values({ id: (0, import_crypto.randomUUID)(), conversationId: convId, role: "ai", content: response });
      res.json({ response, conversationId: convId });
    } catch (error) {
      console.error("Chat endpoint error", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  return app2;
}
var app = createApp();
var app_default = app;
if (!process.env.VERCEL) {
  async function startLocalServer() {
    const { createServer: createViteServer } = await import("vite");
    const portRaw = process.env.PORT ?? "3000";
    const PORT = Number(portRaw);
    if (!Number.isInteger(PORT) || PORT <= 0) {
      throw new Error("PORT must be a positive integer.");
    }
    if (process.env.NODE_ENV !== "production") {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa"
      });
      app.use(vite.middlewares);
    } else {
      const { default: path } = await import("path");
      const distPath = path.join(process.cwd(), "dist");
      const { default: express2 } = await import("express");
      app.use(express2.static(distPath));
      app.get("*", (_req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    }
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
  startLocalServer().catch(console.error);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  app,
  createApp
});
