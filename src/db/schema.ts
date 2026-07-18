import { pgTable, text, integer, real, timestamp, primaryKey } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  name: text('name'),
  email: text('email'),
  bio: text('bio'),
  avatarUrl: text('avatar_url'),
  tasteDna: text('taste_dna'),
  password: text('password')
});

export const movies = pgTable('movies', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  year: integer('year'),
  genre: text('genre'),
  duration: text('duration'),
  synopsis: text('synopsis'),
  posterUrl: text('poster_url'),
  rating: real('rating')
});

export const swipes = pgTable('swipes', {
  userId: text('user_id').notNull().references(() => users.id),
  movieId: text('movie_id').notNull().references(() => movies.id),
  action: text('action'),
  timestamp: timestamp('timestamp').defaultNow()
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.movieId] })
}));

export const conversations = pgTable('conversations', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  title: text('title'),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const messages = pgTable('messages', {
  id: text('id').primaryKey(),
  conversationId: text('conversation_id').notNull().references(() => conversations.id),
  role: text('role'),
  content: text('content'),
  timestamp: timestamp('timestamp').defaultNow()
});
