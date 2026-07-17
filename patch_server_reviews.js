import fs from 'fs';

let code = fs.readFileSync('server.ts', 'utf-8');

const reviewsEndpoint = `
  app.get("/api/movies/:id/reviews", async (req, res) => {
    const { id } = req.params;
    const TMDB_API_KEY = process.env.TMDB_API_KEY;
    if (!TMDB_API_KEY) {
      return res.json([]);
    }
    try {
      const resp = await fetch(\`https://api.themoviedb.org/3/movie/\${id}/reviews?api_key=\${TMDB_API_KEY}&language=en-US&page=1\`);
      if (!resp.ok) return res.json([]);
      const data = await resp.json();
      if (data.results && data.results.length > 0) {
        // Return up to 2 reviews
        const reviews = data.results.slice(0, 2).map((r: any) => ({
          author: r.author,
          content: r.content.length > 300 ? r.content.substring(0, 300) + '...' : r.content
        }));
        return res.json(reviews);
      }
      res.json([]);
    } catch (e) {
      console.error("Error fetching reviews", e);
      res.json([]);
    }
  });
`;

if (!code.includes('/api/movies/:id/reviews')) {
    code = code.replace(
        '  app.get("/api/movies", async (req, res) => {',
        reviewsEndpoint + '\n  app.get("/api/movies", async (req, res) => {'
    );
}

fs.writeFileSync('server.ts', code);
