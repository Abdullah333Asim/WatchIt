# Assignment 1: Observability Report

## Part A: WatchIt

**The Problem:** 
Finding the right movie is often overwhelming due to endless scrolling on streaming platforms, fragmented watchlists, and generic recommendations that fail to account for a user's specific viewing history. 

**Intended Users:** 
Movie enthusiasts and casual viewers who want an interactive, streamlined way to discover new films, manage their personal watchlists, and receive highly personalized curation.

**The Solution:** 
WatchIt is a premium, AI-powered movie recommendation and discovery Single Page Application (SPA). It provides an interactive, Tinder-style swiping interface allowing users to categorize movies as Watched, Watchlist, Pass, or Ignore. The core feature is "Cine Noir," a sophisticated AI chat assistant powered by a high-concurrency race between Gemini, Groq, and Cerebras APIs. The AI acts as a virtual film curator, analyzing the user's PostgreSQL database of swiped movies to deliver rapid, contextual recommendations. 

**What Works:** 
The interactive swipe matcher (including desktop keyboard navigation), dynamic TMDB metadata backfilling, personalized dashboard filtering, Firebase authentication, and the full AI chat curator are fully functional and integrated with the Drizzle ORM/PostgreSQL backend.

**How to Try It:** 
The live production build is deployed at: https://watchit.up.railway.app/

To run the observability environment locally for this assignment:
1. Clone the repository and switch to the `assignment-1-observability` branch.
2. Run `npm install` to install frontend (React/Vite) and backend (Node.js/Express) dependencies.
3. Configure your local `.env` file with your PostgreSQL connection string and required API keys (TMDB, Gemini/Groq/Cerebras).
4. Start the application servers using `npm run dev`.
5. Start the local monitoring infrastructure by running `docker compose up -d` to spin up Prometheus and Grafana.

## Part B: Metrics

I successfully instrumented my Node.js/Express backend with a Prometheus client and exposed a `/metrics` endpoint. 

| Metric Name | Purpose | Type | Unit | Labels | Code Location | Grafana Query |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `watchit_movie_swipes_total` | Tracks user movie intent (Business Metric) | Counter | Swipes | `action` | `app.ts` - inside `/api/swipe` POST route | `sum(watchit_movie_swipes_total) by (action)` |
| `watchit_active_ai_requests` | Monitors active AI generations (App Metric) | Gauge | Requests | None | `gemini.ts` - wraps `Promise.any` AI race | `watchit_active_ai_requests` |
| `watchit_ai_generation_duration_seconds` | AI API latency tracking (App Metric) | Histogram | Seconds | `le` (buckets) | `gemini.ts` - times the LLM network request | `histogram_quantile(0.95, sum(rate(watchit_ai_generation_duration_seconds_bucket[5m])) by (le))` |
| `watchit_db_query_duration_seconds` | Tracks PostgreSQL latency (App Metric) | Summary | Seconds | `quantile` | `app.ts` - inside `/api/profile` GET route | `watchit_db_query_duration_seconds{quantile="0.95"}` |

### Grafana Charts Explanation
*   **Swipes (Counter):** Shows the total count of user interactions, grouped by the label `action` (e.g., comparing "Watched" vs "Pass" intent).
*   **Active Requests (Gauge):** A real-time tracker that spikes when multiple users are concurrently asking the AI for recommendations and drops to 0 when idle.
*   **AI Latency p95 (Histogram):** The query uses `histogram_quantile` to calculate the 95th percentile of AI response times over a 5-minute rolling window, ensuring we see the worst-case delays.
*   **DB Latency p95 (Summary):** Directly queries the pre-calculated 95th percentile from the Prometheus client to monitor database health.