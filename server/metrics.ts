import client from 'prom-client';

client.collectDefaultMetrics();

export const swipeCounter = new client.Counter({
  name: 'watchit_movie_swipes_total',
  help: 'Total number of movie swipes categorizing user intent',
  labelNames: ['action']
});

export const activeAiRequests = new client.Gauge({
  name: 'watchit_active_ai_requests',
  help: 'Number of AI chat recommendations currently being processed'
});

export const aiLatencyHistogram = new client.Histogram({
  name: 'watchit_ai_generation_duration_seconds',
  help: 'Time taken for AI APIs to generate a response',
  buckets: [0.1, 0.5, 1, 2, 3, 5, 8, 10, 15]
});

export const dbQuerySummary = new client.Summary({
  name: 'watchit_db_query_duration_seconds',
  help: 'Time taken to fetch data from PostgreSQL',
  percentiles: [0.5, 0.9, 0.95, 0.99]
});