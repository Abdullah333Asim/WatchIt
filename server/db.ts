import sqlite from 'better-sqlite3';
import path from 'path';

const db = sqlite(path.join(process.cwd(), 'cine-noir.db'));

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT,
    email TEXT,
    bio TEXT,
    avatar_url TEXT,
    taste_dna TEXT -- JSON blob of preferences
  );

  CREATE TABLE IF NOT EXISTS movies (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    year INTEGER,
    genre TEXT,
    duration TEXT,
    synopsis TEXT,
    poster_url TEXT,
    rating REAL
  );

  CREATE TABLE IF NOT EXISTS swipes (
    user_id TEXT NOT NULL,
    action TEXT CHECK(action IN ('Watched', 'Pass', 'Watchlist', 'Not Interested')),
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    movie_id TEXT NOT NULL,
    PRIMARY KEY(user_id, action, timestamp),
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(movie_id) REFERENCES movies(id)
  ) WITHOUT ROWID;

  CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    role TEXT CHECK(role IN ('user', 'ai')),
    content TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(conversation_id) REFERENCES conversations(id)
  );
`);

try { db.exec('ALTER TABLE users ADD COLUMN bio TEXT;'); } catch (e) {}
try { db.exec('ALTER TABLE users ADD COLUMN avatar_url TEXT;'); } catch (e) {}
try { db.exec('ALTER TABLE users ADD COLUMN password TEXT;'); } catch (e) {}

// Make sure existing user has bio and avatar
db.exec(`
  UPDATE users 
  SET bio = 'Cinematography Enthusiast • Member since 2023',
      avatar_url = 'https://lh3.googleusercontent.com/aida-public/AB6AXuCIt82W2GZJFZbpWzZdY2X3ER7_6qkzNy4sk2HEPEyl0HxBJj68_Qe4uN8tvz57BTwNl3D1TffunDYTzKR-fi1GpIAzbKQGv_oj4bdc6s36jxHsjP8Mz-ceoxqbOTh38HWIKKi1269tq191KhzH3TarrD3uKRcCyw4fv1VN8aa7I8TIWppe-BT4kbqH51ksxDLMaZ4hGvLTOcuqtlhqern2xwX8afDRtOid2RfkRXSowZVMyD0lj6OmkaOFGHt8O3A4n-L-GGORooiY'
  WHERE bio IS NULL OR avatar_url IS NULL;
`);

// Seed initial movies if empty
const movieCount = db.prepare('SELECT COUNT(*) as count FROM movies').get() as { count: number };
if (movieCount.count === 0) {
  const seedMovies = [
    {
      id: '1',
      title: 'Dune: Part Two',
      year: 2024,
      genre: 'Sci-Fi, Adventure',
      duration: '2h 46m',
      synopsis: 'Paul Atreides unites with Chani and the Fremen while on a warpath of revenge against the conspirators who destroyed his family.',
      poster_url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBpmOrwvlqn6EcFa9ikIkRpIEgFFbT8yySBdO7taM1Kl9jP4K1OKStS-8HfhYDm_5QEFx_GXL_oFKXnQZkvNlEdzHEFpAWp8enA71gdsV6dqHesb7S1IjaN2L0DNJFRmTczUfJqqcGMNfp-ElRjzH3my7mZM87wu20W608g97hhR-Wd7qldG-YRNaKhHrD52nm5JoDD-MZxMznt0NziY7qgNKqZjB_JesPg5nvQ9tlCnhqAVF1c8VRdVj0kpz_aIkl6EKu2iMBhUD_l',
      rating: 8.8
    },
    {
      id: '2',
      title: 'Neon Shadows',
      year: 2023,
      genre: 'Neo-Noir, Thriller',
      duration: '1h 58m',
      synopsis: 'A stark, minimalist exploration of a neon sign glowing in the rain against a pitch-black background.',
      poster_url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAGeNr_H2ow3byvuS9TLt0KTxnMQAMyisTPrS_FraapHZPEhiPLWPHOc-AXMMZsmwrnOzOOa0hjJiFd-AhO6fQ3sCfpwyuav9dU559ArG3xsnkV61uV1ncerS2k470eG9SSNZcMd3YB7AiAOR6wEwOQDpfye-009R9mVDgnPTFnasZXcg6nQ1_j2BqO7XJ1ArSLwLaxcGHkt42ASjRKgOvNRdSPbHktMVPBBSNECV75AH376pYFTDwTm4l-oppKFAbVqagURs_LecKJ',
      rating: 7.9
    },
    {
       id: '3',
       title: 'The Spire',
       year: 2022,
       genre: 'Sci-Fi, Dystopian',
       duration: '2h 15m',
       synopsis: 'Abstract cinematic art showing a distorted, low-angle view of futuristic skyscrapers stretching up into a dark, smog-filled sky.',
       poster_url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCDqahA0ql7koc5n-idsgX17qJ-x86PI_OqdjDNwApILRczKFxpk9i5Cb5IjkO1m4LM750w3BmMfUqeKIR0PEqPizDVRs5OPzHrgepW_hWe5ZtWvezZX0jyzp5h0UgAhqTIN_fUp68fONPmohVD46V1UPlhb7gZ0TE3SceKXWAj7jyroGFkvh0RC7sYgvv89rjZpynYEWzHpygsDBaxorm4yMMtjUip2rWG1FzaIwmv-TOqmdd_VW2MchJWeYZy9M2B6qcyTiiuYli9',
       rating: 8.2
    },
    {
      id: '4',
      title: 'Midnight in Paris',
      year: 2011,
      genre: 'Romance, Comedy',
      duration: '1h 34m',
      synopsis: 'While on a trip to Paris with his fiancée\'s family, a nostalgic screenwriter finds himself mysteriously going back to the 1920s every day at midnight.',
      poster_url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDZ-rYpsqxwWod7E3oAL1tvLSe180HW-I2dBYnBozYSNXCv0xyoFgsSaq0daZKfO16YFMBJ3j4gseB0AxUO8GsTRzlOa0-aYYwBaJ0U0lKqS-lufOe_8fHevzDiKlrwfj_QMxsRFKGVgZMUKXQ2K7K8V0gpJ0wdBzcbNB8fcgfTYGJaSDlcS8NGYihPc8mI2N0DyPJcp2qOWPM7GygnhateIedpoVkIIqtJBeFswMCipKZ4qCgXQteF-jLRDZn0Jxu5eL1Z_Mkth6Um',
      rating: 7.7
    },
    {
      id: '5',
      title: 'Her',
      year: 2013,
      genre: 'Sci-Fi, Romance',
      duration: '2h 6m',
      synopsis: 'In a near future, a lonely writer develops an unlikely relationship with an operating system designed to meet his every need.',
      poster_url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBA78IYJJgInBEG0_gdIhwn-okbmpmhcXPelN5w24QWUv_tes4fQvTfec-mevr_IB7MbtILWi95s65NFgLLZ86qvXx0DsR42usRPY8OP2MWsJdaH3O_rTYgPdSEc7zY21U19huRVoKBUVAF19yPXjivjCqa8HCuspQX6ejxRZo_1FFVTy5Vc3_akj_NwuVJpw03C_iXtLYgJJN2pC5FG5EYaurV7MuKozMAGrATiFTIyX2ml69z1-CHRcht-zBCkjHQE3cnF-faP3z0',
      rating: 8.0
    }
  ];

  const insert = db.prepare(`
    INSERT INTO movies (id, title, year, genre, duration, synopsis, poster_url, rating)
    VALUES (@id, @title, @year, @genre, @duration, @synopsis, @poster_url, @rating)
  `);

  for (const movie of seedMovies) {
    insert.run(movie);
  }

  // Seed a default user
  db.prepare(`
    INSERT INTO users (id, name, email, bio, avatar_url, taste_dna)
    VALUES ('default-user', 'Alex Vance', 'alex@example.com', 'Cinematography Enthusiast • Member since 2023', 'https://lh3.googleusercontent.com/aida-public/AB6AXuCIt82W2GZJFZbpWzZdY2X3ER7_6qkzNy4sk2HEPEyl0HxBJj68_Qe4uN8tvz57BTwNl3D1TffunDYTzKR-fi1GpIAzbKQGv_oj4bdc6s36jxHsjP8Mz-ceoxqbOTh38HWIKKi1269tq191KhzH3TarrD3uKRcCyw4fv1VN8aa7I8TIWppe-BT4kbqH51ksxDLMaZ4hGvLTOcuqtlhqern2xwX8afDRtOid2RfkRXSowZVMyD0lj6OmkaOFGHt8O3A4n-L-GGORooiY', @taste_dna)
  `).run({
    taste_dna: JSON.stringify({
      dominantGenres: ['Neo-Noir', 'Sci-Fi', 'High-Stakes Heists'],
      cinematicVibe: 'Gritty atmospheric tension with synth-heavy scores. Prefers practical effects over CGI overload.',
      matchAccuracy: 78
    })
  });
}

export default db;
