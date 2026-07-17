import fs from 'fs';

let code = fs.readFileSync('server.ts', 'utf-8');

code = code.replace(
  'let user = db.prepare("SELECT * FROM users WHERE name = ? COLLATE NOCASE").get(username) as any;',
  'let user = (await db.select().from(users).where(sql`lower(name) = lower(${username})`)).at(0) as any;'
);

fs.writeFileSync('server.ts', code);
