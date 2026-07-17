import fs from 'fs';

let code = fs.readFileSync('server.ts', 'utf-8');

code = code.replace(
  "await db.insert(messages).values({ id: randomUUID(), convId, 'user', query, conversationId: $2, role: $3, content: $4 });",
  "await db.insert(messages).values({ id: randomUUID(), conversationId: convId, role: 'user', content: query });"
);

code = code.replace(
  "await db.insert(messages).values({ id: randomUUID(), convId, 'ai', response, conversationId: $2, role: $3, content: $4 });",
  "await db.insert(messages).values({ id: randomUUID(), conversationId: convId, role: 'ai', content: response });"
);

fs.writeFileSync('server.ts', code);
