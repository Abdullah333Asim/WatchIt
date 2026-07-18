import { db } from './src/db/index.ts';
import { sql } from 'drizzle-orm';

async function clearUsersData() {
  try {
    console.log('Clearing messages...');
    await db.execute(sql`DELETE FROM messages;`);
    console.log('Clearing conversations...');
    await db.execute(sql`DELETE FROM conversations;`);
    console.log('Clearing swipes...');
    await db.execute(sql`DELETE FROM swipes;`);
    console.log('Clearing users...');
    await db.execute(sql`DELETE FROM users;`);
    console.log('User data cleared successfully.');
  } catch (err) {
    console.error('Error clearing data:', err);
  } finally {
    process.exit(0);
  }
}
clearUsersData();
