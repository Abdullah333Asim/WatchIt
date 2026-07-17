import fs from 'fs';

let code = fs.readFileSync('server.ts', 'utf-8');

const reviewsIndex = code.indexOf('  app.get("/api/movies/:id/reviews", requireAuth, async (req, res) => {');

const topPart = `import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { db } from "./src/db/index.ts";
import { users, movies, swipes, conversations, messages } from "./src/db/schema.ts";
import { eq, and, sql, notInArray, desc } from "drizzle-orm";
import { getRecommendations } from "./server/gemini.ts";
import { randomUUID, createHash } from "crypto";
import { requireAuth, AuthRequest } from "./server/middleware.ts";
import { loadPopularMovies, searchMovieAndSave } from "./server/tmdb.ts";

async function startServer() {
  const app = express();
  const PORT = 3000;
  
  app.use(express.json({ limit: "50mb" }));

  // API Routes
`;

code = topPart + code.substring(reviewsIndex);

fs.writeFileSync('server.ts', code);
