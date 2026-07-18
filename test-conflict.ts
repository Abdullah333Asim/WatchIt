import { db } from './src/db/index.ts';
import { users } from './src/db/schema.ts';

async function run() {
  try {
    await db.insert(users).values({
      id: 'test_uid_1',
      name: 'SameName',
      email: 'a@a.com',
    }).onConflictDoNothing();
    await db.insert(users).values({
      id: 'test_uid_2',
      name: 'SameName',
      email: 'b@b.com',
    }).onConflictDoNothing();
    console.log("Success");
  } catch (e) {
    console.error("Error:", e);
  } finally {
    process.exit(0);
  }
}
run();
