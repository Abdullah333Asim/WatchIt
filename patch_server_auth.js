import fs from 'fs';

let code = fs.readFileSync('server.ts', 'utf-8');

code = code.replace(
  'import { randomUUID, createHash } from "crypto";',
  'import { randomUUID, createHash } from "crypto";\nimport { requireAuth, AuthRequest } from "./server/middleware.ts";'
);

// Remove existing auth middleware
code = code.replace(
  /app\.use\("\/api", async \(req, res, next\) => \{[\s\S]*?next\(\);\n  \}\);/,
  ''
);

// Remove existing login/register
code = code.replace(
  /app\.post\("\/api\/login"[\s\S]*?\}\);/g,
  ''
);
code = code.replace(
  /app\.post\("\/api\/register"[\s\S]*?\}\);/g,
  ''
);

// Add requireAuth to all endpoints
const endpoints = [
  '"/api/movies/:id/reviews"',
  '"/api/movies"',
  '"/api/swipe"',
  '"/api/swipe/:movieId"',
  '"/api/profile"',
  '"/api/conversations"',
  '"/api/conversations/:id"',
  '"/api/chat"'
];

for (const ep of endpoints) {
  code = code.replace(`app.get(${ep}, async (req, res) => {`, `app.get(${ep}, requireAuth, async (req, res) => {`);
  code = code.replace(`app.post(${ep}, async (req, res) => {`, `app.post(${ep}, requireAuth, async (req, res) => {`);
  code = code.replace(`app.delete(${ep}, async (req, res) => {`, `app.delete(${ep}, requireAuth, async (req, res) => {`);
  code = code.replace(`app.put(${ep}, async (req, res) => {`, `app.put(${ep}, requireAuth, async (req, res) => {`);
}

// Replace userId
code = code.replace(
  /const userId = \(req\.headers\["x-user-id"\] as string\) \|\| "default-user";/g,
  'const userId = (req as AuthRequest).user!.uid;'
);
code = code.replace(
  /const userId = req\.headers\["x-user-id"\] \|\| "default-user";/g,
  'const userId = (req as AuthRequest).user!.uid;'
);

fs.writeFileSync('server.ts', code);
