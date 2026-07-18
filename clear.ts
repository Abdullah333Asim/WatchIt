import { db } from './src/db/index.ts';
import { sql } from 'drizzle-orm';

async function clearData() {
  try {
    console.log('Clearing messages...');
    await db.execute(sql`DELETE FROM messages;`);
    console.log('Clearing conversations...');
    await db.execute(sql`DELETE FROM conversations;`);
    console.log('Clearing swipes...');
    await db.execute(sql`DELETE FROM swipes;`);
    console.log('Clearing movies...');
    await db.execute(sql`DELETE FROM movies;`);
    console.log('Clearing users...');
    await db.execute(sql`DELETE FROM users;`);
    console.log('All data cleared successfully.');
  } catch (err) {
    console.error('Error clearing data:', err);
  } finally {
    process.exit(0);
  }
}

clearData();
