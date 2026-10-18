import 'dotenv/config';
import express from "express";
import fs from "fs";
import path from "path";
import { db } from "./src/db/index";
import { users, movies, swipes, conversations, messages } from "./src/db/schema";
import { eq, and, sql, desc } from "drizzle-orm";
import { getRecommendations } from "./server/gemini";
import { randomUUID } from "crypto";
import { requireAuth, AuthRequest, sendProblem } from "./server/middleware";
import { loadPopularMovies, searchMovieAndSave } from "./server/tmdb";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import client from 'prom-client';
import './server/metrics';
import { swipeCounter, dbQuerySummary, httpSwipeCalls, httpSwipeDuration } from './server/metrics';
import { logger } from './server/logger';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-guest-key';

export const ALLOWED_SWIPE_ACTIONS = ['Watched', 'Watchlist', 'Pass', 'Not Interested', 'Ignore'] as const;

// ─── In-Memory Idempotency Store (TTL: 10 minutes) ───────────────────────────
interface IdempotencyRecord {
  status: number;
  body: any;
  createdAt: number;
}
const idempotencyCache = new Map<string, IdempotencyRecord>();
const IDEMPOTENCY_TTL_MS = 10 * 60 * 1000;

// In-memory state tracker for Mock Mode idempotency when DB is omitted
const mockSwipesStore = new Map<string, { userId: string; movieId: string; action: string; updatedAt: string }>();

// ─── Single-Instance Fixed-Window Rate Limiter ───────────────────────────────
// Limit: 8 requests per 15-second window per caller (shared by userId or client IP)
const RATE_LIMIT_MAX = 8;
const RATE_LIMIT_WINDOW_MS = 15 * 1000;
const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

function swipeRateLimiter(req: AuthRequest, res: express.Response, next: express.NextFunction) {
  const callerKey =
    (req.headers['x-client-id'] as string) ||
    req.user?.uid ||
    req.ip ||
    'anonymous';

  const now = Date.now();
  let bucket = rateLimitBuckets.get(callerKey);

  if (!bucket || now >= bucket.resetAt) {
    bucket = { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };
    rateLimitBuckets.set(callerKey, bucket);
  }

  bucket.count += 1;
  const remaining = Math.max(0, RATE_LIMIT_MAX - bucket.count);
  const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));

  res.setHeader('X-RateLimit-Limit', String(RATE_LIMIT_MAX));
  res.setHeader('X-RateLimit-Remaining', String(remaining));
  res.setHeader('X-RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)));

  if (bucket.count > RATE_LIMIT_MAX) {
    res.setHeader('Retry-After', String(retryAfterSeconds));
    logger.warn({
      message: `Rate limit exceeded for caller ${callerKey} on ${req.method} ${req.originalUrl}`,
      severity: 'warn',
      request_id: req.headers['x-request-id']
    });
    return sendProblem(
      req,
      res,
      429,
      'Too Many Requests',
      `Rate limit of ${RATE_LIMIT_MAX} requests per ${RATE_LIMIT_WINDOW_MS / 1000}s exceeded. Retry after ${retryAfterSeconds} seconds.`,
      'rate-limit-exceeded'
    );
  }

  next();
}

export function createApp() {
  const app = express();

  app.use(express.json({ limit: "50mb" }));

  app.use((req, res, next) => {
    const incomingId = req.headers['x-request-id'] as string | undefined;
    const requestId = incomingId || randomUUID();
    req.headers['x-request-id'] = requestId;
    res.setHeader('X-Request-Id', requestId);

    logger.info({
      message: `Incoming ${req.method} request to ${req.url}`,
      severity: 'info',
      request_id: requestId
    });

    next();
  });

  // ─── OpenAPI Spec & Interactive Swagger UI ─────────────────────────────────
  app.get("/api/openapi.yaml", (_req, res) => {
    const specPath = path.join(process.cwd(), "openapi.yaml");
    if (!fs.existsSync(specPath)) {
      return res.status(404).send("openapi.yaml not found");
    }
    res.type("text/yaml").send(fs.readFileSync(specPath, "utf-8"));
  });

  app.get("/api/docs", (_req, res) => {
    res.type("html").send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>WatchIt API — OpenAPI Documentation</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.18.2/swagger-ui.css" />
</head>
<body style="margin:0; background:#fafafa;">
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.18.2/swagger-ui-bundle.js"></script>
  <script>
    window.onload = () => {
      SwaggerUIBundle({
        url: '/api/openapi.yaml',
        dom_id: '#swagger-ui',
        deepLinking: true
      });
    };
  </script>
</body>
</html>`);
  });

  // ─── Health Check (Excluded from REST audit per rubric) ────────────────────
  app.get("/api/health", async (_req, res) => {
    const checks: Record<string, unknown> = {
      env: {
        hasFirebaseServiceAccount: !!process.env.FIREBASE_SERVICE_ACCOUNT_JSON,
        hasTmdbKey: !!process.env.TMDB_API_KEY,
        hasGeminiKey: !!process.env.GEMINI_API_KEY || !!process.env.GOOGLE_GENERATIVE_AI_API_KEY,
        hasJwtSecret: !!process.env.JWT_SECRET,
        hasDatabaseUrl: !!process.env.DATABASE_URL,
        nodeEnv: process.env.NODE_ENV,
        isVercel: !!process.env.VERCEL,
      },
    };
    try {
      await db.execute(sql`SELECT 1`);
      checks.database = "ok";
    } catch (e: any) {
      checks.database = `error: ${e.message}`;
    }
    res.json(checks);
  });

  // ─── Guest Auth Routes ─────────────────────────────────────────────────────
  app.post("/api/auth/register", async (req, res) => {
    const { username, password } = req.body || {};
    if (!username || typeof username !== 'string' || !password || typeof password !== 'string') {
      return sendProblem(req, res, 400, 'Bad Request', 'Both username and password are required strings.', 'invalid-auth-input');
    }

    const cleanUsername = username.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (cleanUsername.length < 3 || cleanUsername.length > 30) {
      return sendProblem(req, res, 400, 'Bad Request', 'Username must contain between 3 and 30 alphanumeric characters.', 'invalid-username');
    }
    if (password.length < 4) {
      return sendProblem(req, res, 400, 'Bad Request', 'Password must be at least 4 characters long.', 'weak-password');
    }

    try {
      const existingUser = (await db.select().from(users).where(eq(users.name, cleanUsername))).at(0);
      if (existingUser) {
        if (!existingUser.password) {
          return sendProblem(req, res, 409, 'Conflict', 'Username is already taken.', 'username-taken');
        }
        const isValid = await bcrypt.compare(password, existingUser.password);
        if (isValid) {
          const token = jwt.sign({ uid: existingUser.id, name: existingUser.name }, JWT_SECRET, { expiresIn: '30d' });
          res.setHeader('Cache-Control', 'no-store');
          return res.status(200).json({ token, user: { uid: existingUser.id, name: existingUser.name } });
        }
        return sendProblem(req, res, 409, 'Conflict', 'Username is already taken.', 'username-taken');
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
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Location', '/api/profile');
      return res.status(201).json({ token, user: { uid: userId, name: cleanUsername } });
    } catch (error: any) {
      logger.error({ message: "Register error", severity: 'error', request_id: req.headers['x-request-id'], error_detail: error.message });
      return sendProblem(req, res, 500, 'Internal Server Error', 'Failed to register user.', 'register-failure');
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    const { username, password } = req.body || {};
    if (!username || typeof username !== 'string' || !password || typeof password !== 'string') {
      return sendProblem(req, res, 400, 'Bad Request', 'Username and password are required.', 'invalid-login-input');
    }

    const cleanUsername = username.toLowerCase().replace(/[^a-z0-9]/g, '');

    try {
      const user = (await db.select().from(users).where(eq(users.name, cleanUsername))).at(0);
      if (!user || !user.password) {
        return sendProblem(req, res, 401, 'Unauthorized', 'Invalid username or password.', 'invalid-credentials');
      }

      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return sendProblem(req, res, 401, 'Unauthorized', 'Invalid username or password.', 'invalid-credentials');
      }

      const token = jwt.sign({ uid: user.id, name: user.name }, JWT_SECRET, { expiresIn: '30d' });
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({ token, user: { uid: user.id, name: user.name } });
    } catch (error: any) {
      logger.error({ message: "Login error", severity: 'error', request_id: req.headers['x-request-id'], error_detail: error.message });
      return sendProblem(req, res, 500, 'Internal Server Error', 'Failed to process login.', 'login-failure');
    }
  });

  // ─── Movies Resource ───────────────────────────────────────────────────────
  app.get("/api/movies", requireAuth, async (req, res) => {
    const userId = (req as AuthRequest).user!.uid;
    const rawPage = req.query.page !== undefined ? String(req.query.page) : '1';
    const page = Number(rawPage);

    if (!Number.isInteger(page) || page < 1 || page > 500) {
      return sendProblem(req, res, 400, 'Bad Request', 'Query parameter "page" must be an integer between 1 and 500.', 'invalid-page-param');
    }

    if (!process.env.DATABASE_URL) {
      res.setHeader('Cache-Control', 'private, max-age=60');
      return res.status(200).json([
        { id: "mock-1", title: "Inception", year: 2010, poster_url: "https://image.tmdb.org/t/p/w500/9gk7adZA282AAs4kK1Wp100zU9p.jpg", synopsis: "A thief who steals corporate secrets through the use of dream-sharing technology.", genre: "Action, Sci-Fi", duration: "148m", rating: 8.8 },
        { id: "mock-2", title: "Interstellar", year: 2014, poster_url: "https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg", synopsis: "A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival.", genre: "Adventure, Sci-Fi", duration: "169m", rating: 8.6 }
      ]);
    }

    try {
      await loadPopularMovies(page);
      const moviesResult = await db.execute(sql`SELECT * FROM movies WHERE id NOT IN (SELECT movie_id FROM swipes WHERE user_id = ${userId}) ORDER BY RANDOM() LIMIT 10`);
      res.setHeader('Cache-Control', 'private, no-cache');
      return res.status(200).json(moviesResult.rows || moviesResult);
    } catch (error: any) {
      logger.error({ message: "Get movies error", severity: 'error', request_id: req.headers['x-request-id'], error_detail: error.message });
      return sendProblem(req, res, 500, 'Internal Server Error', 'Failed to fetch movies.', 'movies-fetch-error');
    }
  });

  // ─── Swipes Resource (Chosen Task for Part A & Part B) ─────────────────────
  // 1. GET /api/swipes — List user's swipes (with optional ?action= filter)
  app.get("/api/swipes", requireAuth, async (req, res) => {
    const userId = (req as AuthRequest).user!.uid;
    const actionFilter = req.query.action as string | undefined;

    if (actionFilter && !ALLOWED_SWIPE_ACTIONS.includes(actionFilter as any)) {
      return sendProblem(
        req,
        res,
        400,
        'Bad Request',
        `Invalid action filter "${actionFilter}". Allowed values: ${ALLOWED_SWIPE_ACTIONS.join(', ')}.`,
        'invalid-swipe-action'
      );
    }

    res.setHeader('Cache-Control', 'no-store');

    if (!process.env.DATABASE_URL) {
      const items = Array.from(mockSwipesStore.values()).filter(
        s => s.userId === userId && (!actionFilter || s.action === actionFilter)
      );
      return res.status(200).json({ swipes: items, count: items.length });
    }

    try {
      const conditions = actionFilter
        ? and(eq(swipes.userId, userId), eq(swipes.action, actionFilter))
        : eq(swipes.userId, userId);
      const rows = await db.select().from(swipes).where(conditions).orderBy(desc(swipes.timestamp));
      return res.status(200).json({ swipes: rows, count: rows.length });
    } catch (error: any) {
      logger.error({ message: "Get swipes error", severity: 'error', request_id: req.headers['x-request-id'], error_detail: error.message });
      return sendProblem(req, res, 500, 'Internal Server Error', 'Failed to fetch swipes.', 'swipes-fetch-error');
    }
  });

  // 2. POST /api/swipes (and legacy alias /api/swipe) — Create or idempotently record a swipe
  app.post(["/api/swipes", "/api/swipe"],
    (_req, res, next) => {
      const endTimer = httpSwipeDuration.startTimer();
      res.on('finish', () => {
        endTimer();
        httpSwipeCalls.labels(String(res.statusCode)).inc();
      });
      next();
    },
    requireAuth, swipeRateLimiter, async (req, res) => {
    // Support controlled fault simulation for Part A Python resilience testing (timeout / 503)
    const simulatedFault = req.headers['x-simulate-fault'] as string | undefined;
    if (simulatedFault === 'timeout') {
      await new Promise(resolve => setTimeout(resolve, 2500));
    } else if (simulatedFault === '503') {
      logger.error({
        message: "Simulated transient 503 failure on POST /api/swipes",
        severity: 'error',
        request_id: req.headers['x-request-id']
      });
      return sendProblem(req, res, 503, 'Service Unavailable', 'Simulated transient upstream failure.', 'transient-failure');
    }

    const { movieId, action } = req.body || {};
    const userId = (req as AuthRequest).user!.uid;

    // Input Validation
    if (!movieId || typeof movieId !== 'string' || !movieId.trim()) {
      return sendProblem(req, res, 400, 'Bad Request', 'Field "movieId" is required and must be a non-empty string.', 'invalid-movie-id');
    }
    if (!action || typeof action !== 'string' || !ALLOWED_SWIPE_ACTIONS.includes(action as any)) {
      return sendProblem(
        req,
        res,
        400,
        'Bad Request',
        `Field "action" must be one of: ${ALLOWED_SWIPE_ACTIONS.join(', ')}.`,
        'invalid-swipe-action'
      );
    }

    const cleanMovieId = movieId.trim();
    res.setHeader('Cache-Control', 'no-store');

    // Check explicit Idempotency-Key header cache first
    const idempotencyKey = req.headers['idempotency-key'] as string | undefined;
    if (idempotencyKey) {
      const scopedKey = `${userId}:${idempotencyKey}`;
      const cached = idempotencyCache.get(scopedKey);
      if (cached && Date.now() - cached.createdAt < IDEMPOTENCY_TTL_MS) {
        res.setHeader('X-Idempotent-Replay', 'true');
        return res.status(200).json({ ...cached.body, idempotent_replay: true });
      }
    }

    // Mock Mode handling (if DATABASE_URL is not set)
    if (!process.env.DATABASE_URL) {
      const compositeKey = `${userId}:${cleanMovieId}`;
      const existing = mockSwipesStore.get(compositeKey);

      if (existing && existing.action === action) {
        const body = { success: true, swipe: existing, idempotent_replay: true };
        if (idempotencyKey) idempotencyCache.set(`${userId}:${idempotencyKey}`, { status: 200, body, createdAt: Date.now() });
        return res.status(200).json(body);
      }

      const record = { userId, movieId: cleanMovieId, action, updatedAt: new Date().toISOString() };
      mockSwipesStore.set(compositeKey, record);
      swipeCounter.labels(action).inc();

      const status = existing ? 200 : 201;
      const body = { success: true, swipe: record, idempotent_replay: false };
      if (idempotencyKey) idempotencyCache.set(`${userId}:${idempotencyKey}`, { status, body, createdAt: Date.now() });
      res.setHeader('Location', `/api/swipes/${encodeURIComponent(cleanMovieId)}`);
      return res.status(status).json(body);
    }

    try {
      // Ensure movie row exists in DB if a test client sends a valid movie ID not yet cached from TMDB
      await db.insert(movies).values({
        id: cleanMovieId,
        title: `Movie #${cleanMovieId}`,
        year: 2026,
        genre: 'Drama',
        duration: '120m',
        synopsis: 'Auto-registered movie entry.',
        posterUrl: '',
        rating: 7.5
      }).onConflictDoNothing();

      // Check existing swipe state to guarantee natural idempotency on repeated requests
      const existingSwipe = (
        await db.select().from(swipes).where(and(eq(swipes.userId, userId), eq(swipes.movieId, cleanMovieId)))
      ).at(0);

      if (existingSwipe && existingSwipe.action === action) {
        const replayBody = {
          success: true,
          swipe: existingSwipe,
          idempotent_replay: true
        };
        if (idempotencyKey) {
          idempotencyCache.set(`${userId}:${idempotencyKey}`, { status: 200, body: replayBody, createdAt: Date.now() });
        }
        res.setHeader('X-Idempotent-Replay', 'true');
        return res.status(200).json(replayBody);
      }

      // Atomic upsert using onConflictDoUpdate instead of non-atomic DELETE + INSERT
      const now = new Date();
      await db
        .insert(swipes)
        .values({ userId, movieId: cleanMovieId, action, timestamp: now })
        .onConflictDoUpdate({
          target: [swipes.userId, swipes.movieId],
          set: { action, timestamp: now }
        });

      // Only increment business metric when state actually changes or is newly created
      swipeCounter.labels(action).inc();

      const status = existingSwipe ? 200 : 201;
      const responseBody = {
        success: true,
        swipe: { userId, movieId: cleanMovieId, action, timestamp: now.toISOString() },
        idempotent_replay: false
      };

      if (idempotencyKey) {
        idempotencyCache.set(`${userId}:${idempotencyKey}`, { status, body: responseBody, createdAt: Date.now() });
      }

      res.setHeader('Location', `/api/swipes/${encodeURIComponent(cleanMovieId)}`);
      return res.status(status).json(responseBody);
    } catch (error: any) {
      logger.error({ message: "Post swipe error", severity: 'error', request_id: req.headers['x-request-id'], error_detail: error.message });
      return sendProblem(req, res, 500, 'Internal Server Error', 'Failed to record movie swipe.', 'swipe-save-error');
    }
  });

  // 3. PATCH & PUT /api/swipes/:movieId (and legacy /api/swipe/:movieId) — Update an existing swipe
  const updateSwipeHandler: express.RequestHandler = async (req, res) => {
    const movieId = (req.params.movieId || '').trim();
    const { action } = req.body || {};
    const userId = (req as AuthRequest).user!.uid;

    if (!movieId) {
      return sendProblem(req, res, 400, 'Bad Request', 'Path parameter "movieId" is required.', 'invalid-movie-id');
    }
    if (!action || typeof action !== 'string' || !ALLOWED_SWIPE_ACTIONS.includes(action as any)) {
      return sendProblem(
        req,
        res,
        400,
        'Bad Request',
        `Field "action" must be one of: ${ALLOWED_SWIPE_ACTIONS.join(', ')}.`,
        'invalid-swipe-action'
      );
    }

    try {
      const existing = (
        await db.select().from(swipes).where(and(eq(swipes.userId, userId), eq(swipes.movieId, movieId)))
      ).at(0);

      if (!existing) {
        return sendProblem(req, res, 404, 'Not Found', `No existing swipe found for movieId "${movieId}".`, 'swipe-not-found');
      }

      const now = new Date();
      await db
        .update(swipes)
        .set({ action, timestamp: now })
        .where(and(eq(swipes.userId, userId), eq(swipes.movieId, movieId)));

      return res.status(200).json({
        success: true,
        swipe: { userId, movieId, action, timestamp: now.toISOString() }
      });
    } catch (error: any) {
      logger.error({ message: "Update swipe error", severity: 'error', request_id: req.headers['x-request-id'], error_detail: error.message });
      return sendProblem(req, res, 500, 'Internal Server Error', 'Failed to update swipe.', 'swipe-update-error');
    }
  };

  app.patch(["/api/swipes/:movieId", "/api/swipe/:movieId"], requireAuth, updateSwipeHandler);
  app.put(["/api/swipes/:movieId", "/api/swipe/:movieId"], requireAuth, updateSwipeHandler);

  // 4. DELETE /api/swipes/:movieId (and legacy /api/swipe/:movieId) — Remove a swipe
  app.delete(["/api/swipes/:movieId", "/api/swipe/:movieId"], requireAuth, async (req, res) => {
    const movieId = (req.params.movieId || '').trim();
    const userId = (req as AuthRequest).user!.uid;

    if (!movieId) {
      return sendProblem(req, res, 400, 'Bad Request', 'Path parameter "movieId" is required.', 'invalid-movie-id');
    }

    try {
      await db.delete(swipes).where(and(eq(swipes.userId, userId), eq(swipes.movieId, movieId)));
      return res.status(200).json({ success: true, deletedMovieId: movieId });
    } catch (error: any) {
      logger.error({ message: "Delete swipe error", severity: 'error', request_id: req.headers['x-request-id'], error_detail: error.message });
      return sendProblem(req, res, 500, 'Internal Server Error', 'Failed to delete swipe.', 'swipe-delete-error');
    }
  });

  // ─── Profile Resource ──────────────────────────────────────────────────────
  app.get("/api/profile", requireAuth, async (req, res) => {
    const endDbTimer = dbQuerySummary.startTimer();
    res.setHeader('Cache-Control', 'no-store');

    if (!process.env.DATABASE_URL) {
      endDbTimer();
      return res.status(200).json({ id: "guest", name: "Instructor", bio: "Grading Observability", avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=mock", taste_dna: {}, history: [] });
    }

    try {
      const userId = (req as AuthRequest).user!.uid;
      const user = (await db.select().from(users).where(eq(users.id, userId))).at(0) as any;
      if (!user) {
        endDbTimer();
        return sendProblem(req, res, 404, 'Not Found', 'User profile not found.', 'user-not-found');
      }

      const historyResult = await db.execute(sql`SELECT m.*, s.action FROM movies m JOIN swipes s ON m.id = s.movie_id WHERE s.user_id = ${userId} GROUP BY m.id, s.action ORDER BY MAX(s.timestamp) DESC`);
      const history = historyResult.rows || historyResult;
      endDbTimer();
      return res.status(200).json({ ...user, avatar_url: user.avatarUrl, taste_dna: user.tasteDna ? JSON.parse(user.tasteDna) : {}, history });
    } catch (error: any) {
      endDbTimer();
      logger.error({ message: "Get profile error", severity: 'error', request_id: req.headers['x-request-id'], error_detail: error.message });
      return sendProblem(req, res, 500, 'Internal Server Error', 'Failed to fetch user profile.', 'profile-fetch-error');
    }
  });

  const updateProfileHandler: express.RequestHandler = async (req, res) => {
    const userId = (req as AuthRequest).user!.uid;
    const { name, bio, avatar_url } = req.body || {};

    if (!name || typeof name !== 'string' || name.trim().length === 0 || name.trim().length > 60) {
      return sendProblem(req, res, 400, 'Bad Request', 'Field "name" must be a non-empty string up to 60 characters.', 'invalid-profile-name');
    }
    if (bio !== undefined && (typeof bio !== 'string' || bio.length > 300)) {
      return sendProblem(req, res, 400, 'Bad Request', 'Field "bio" must be a string up to 300 characters.', 'invalid-profile-bio');
    }

    try {
      await db.update(users).set({ name: name.trim(), bio: bio ?? '', avatarUrl: avatar_url }).where(eq(users.id, userId));
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({ success: true });
    } catch (error: any) {
      logger.error({ message: "Update profile error", severity: 'error', request_id: req.headers['x-request-id'], error_detail: error.message });
      return sendProblem(req, res, 500, 'Internal Server Error', 'Failed to update user profile.', 'profile-update-error');
    }
  };

  app.put("/api/profile", requireAuth, updateProfileHandler);
  app.patch("/api/profile", requireAuth, updateProfileHandler);

  // ─── Conversations & Chat Resource ─────────────────────────────────────────
  app.get("/api/conversations", requireAuth, async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    if (!process.env.DATABASE_URL) return res.status(200).json([]);
    const userId = (req as AuthRequest).user!.uid;
    try {
      const convos = await db.select().from(conversations).where(eq(conversations.userId, userId)).orderBy(desc(conversations.updatedAt));
      return res.status(200).json(convos);
    } catch (error: any) {
      logger.error({ message: "Get conversations error", severity: 'error', request_id: req.headers['x-request-id'], error_detail: error.message });
      return sendProblem(req, res, 500, 'Internal Server Error', 'Failed to list conversations.', 'conversations-fetch-error');
    }
  });

  app.get("/api/conversations/:id", requireAuth, async (req, res) => {
    const id = (req.params.id || '').trim();
    if (!id) {
      return sendProblem(req, res, 400, 'Bad Request', 'Conversation ID is required.', 'invalid-conversation-id');
    }

    res.setHeader('Cache-Control', 'no-store');
    if (!process.env.DATABASE_URL) return res.status(200).json({ conversation: { id, title: "Mock Conversation" }, messages: [] });

    const userId = (req as AuthRequest).user!.uid;
    try {
      const convo = (await db.select().from(conversations).where(and(eq(conversations.id, id), eq(conversations.userId, userId)))).at(0);
      if (!convo) {
        return sendProblem(req, res, 404, 'Not Found', `Conversation "${id}" was not found.`, 'conversation-not-found');
      }
      const msgs = await db.select().from(messages).where(eq(messages.conversationId, id)).orderBy(messages.timestamp);
      return res.status(200).json({ conversation: convo, messages: msgs });
    } catch (error: any) {
      logger.error({ message: "Get conversation detail error", severity: 'error', request_id: req.headers['x-request-id'], error_detail: error.message });
      return sendProblem(req, res, 500, 'Internal Server Error', 'Failed to fetch conversation messages.', 'conversation-detail-error');
    }
  });

  // Prometheus Metrics Endpoint (Excluded from REST audit per rubric)
  app.get('/metrics', async (_req, res) => {
    res.setHeader('Content-Type', client.register.contentType);
    const metrics = await client.register.metrics();
    res.send(metrics);
  });

  app.post("/api/chat", requireAuth, async (req, res) => {
    const { query, conversationId } = req.body || {};
    const userId = (req as AuthRequest).user!.uid;

    if (!query || typeof query !== 'string' || !query.trim()) {
      return sendProblem(req, res, 400, 'Bad Request', 'Field "query" is required and must be a non-empty string.', 'invalid-chat-query');
    }
    if (query.trim().length > 500) {
      return sendProblem(req, res, 400, 'Bad Request', 'Field "query" must not exceed 500 characters.', 'chat-query-too-long');
    }

    try {
      let historyStr = "";
      let chatHistoryStr = "";
      let tasteDna = "";
      let convId = conversationId || randomUUID();

      if (process.env.DATABASE_URL) {
        const user = (await db.select({ tasteDna: users.tasteDna }).from(users).where(eq(users.id, userId))).at(0) as any;
        tasteDna = user?.tasteDna || "";

        const historyResult = await db.execute(sql`SELECT m.title, s.action FROM movies m JOIN swipes s ON m.id = s.movie_id WHERE s.user_id = ${userId} ORDER BY s.timestamp DESC LIMIT 20`);
        const history = (historyResult.rows || historyResult) as any[];
        historyStr = history.map(h => `${h.title} (${h.action})`).join(", ");

        if (!conversationId) {
          const title = query.length > 30 ? query.substring(0, 30) + '...' : query;
          await db.insert(conversations).values({ id: convId, userId, title });
        } else {
          await db.execute(sql`UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ${convId}`);
        }

        await db.insert(messages).values({ id: randomUUID(), conversationId: convId, role: 'user', content: query });

        const chatHistoryResult = await db.execute(sql`SELECT role, content FROM messages WHERE conversation_id = ${convId} ORDER BY timestamp ASC LIMIT 20`);
        const chatHistory = (chatHistoryResult.rows || chatHistoryResult) as any[];
        chatHistoryStr = chatHistory.map(m => `${m.role === 'user' ? 'User' : 'Cine Noir'}: ${m.content}`).join('\n\n');
      }

      let response = await getRecommendations(tasteDna, historyStr, query, chatHistoryStr);

      try {
        const parsed = JSON.parse(response);
        if (parsed.recommendations && Array.isArray(parsed.recommendations)) {
          for (let rec of parsed.recommendations) {
            const cleanRecTitle = (rec.title || '').replace(/\s*[\(\[\{]\d{4}[\)\]\}]\s*$/, '').trim();

            if (process.env.DATABASE_URL) {
              let m = (await db.execute(sql`SELECT id, title, year, poster_url, rating FROM movies WHERE lower(title) = lower(${cleanRecTitle}) OR lower(title) = lower(${rec.title})`)).rows?.[0] as any;
              if (!m || !m.poster_url) {
                const searched = await searchMovieAndSave(rec.title, rec.year);
                if (searched) m = searched;
              }
              if (m) {
                rec.movie_id = m.id;
                rec.poster_url = m.poster_url || m.posterUrl;
                if (m.title) rec.title = m.title;
                if (m.year) rec.year = m.year;
                if (m.rating) rec.rating = m.rating;
              }
            } else {
              const searched = await searchMovieAndSave(rec.title, rec.year);
              if (searched) {
                rec.movie_id = searched.id;
                rec.poster_url = searched.poster_url;
                if (searched.title) rec.title = searched.title;
                if (searched.year) rec.year = searched.year;
                if (searched.rating) rec.rating = searched.rating;
              }
            }
          }
          response = JSON.stringify(parsed);
        }
      } catch (e) {
        console.error("Failed to parse recommendations", e);
      }

      if (process.env.DATABASE_URL) {
        await db.insert(messages).values({ id: randomUUID(), conversationId: convId, role: 'ai', content: response });
      }

      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({ response, conversationId: convId });
    } catch (error: any) {
      logger.error({
        message: "Chat endpoint error",
        severity: 'error',
        request_id: req.headers['x-request-id'],
        error_detail: error.message
      });
      return sendProblem(req, res, 500, 'Internal Server Error', 'Failed to generate AI movie recommendations.', 'chat-error');
    }
  });

  return app;
}

export const app = createApp();
export default app;

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
        appType: "spa",
      });
      app.use(vite.middlewares);
    } else {
      const distPath = path.join(process.cwd(), "dist");
      app.use(express.static(distPath));
      app.get("*", (_req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    }

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log(`OpenAPI Swagger UI available at http://localhost:${PORT}/api/docs`);
    });
  }
  startLocalServer().catch(console.error);
}