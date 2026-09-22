# Assignment 1: Observability Report

## Part A: WatchIt

**The Problem:**
Finding the right movie to watch is often a hassle. You end up scrolling endlessly on streaming platforms, your watchlists are scattered across different apps, and the recommendations you get are generic instead of based on what you actually like.

**Intended Users:**
Movie fans and casual viewers who want an easier, more interactive way to find new films, keep track of what they want to watch, and get recommendations that are actually personalized to them.

**The Solution:**
WatchIt is an AI-powered movie recommendation app (a Single Page Application). It has a doom-scrolling swiping interface where users can mark movies as Watched, Watchlist, Pass, or Ignore. The main feature is "Cine Noir," an AI chat assistant that sends the same request to three different AI providers (Gemini, Groq, and Cerebras) at once and uses whichever one replies first. It looks at the user's swipe history stored in PostgreSQL to give recommendations that fit their taste.

**What Works:**
The swipe interface (including keyboard controls on desktop), automatic movie info fetching from TMDB, a filterable personal dashboard, login through Firebase, and the full AI chat feature all work and are connected to the PostgreSQL database through Drizzle ORM.

**How to Try It:**
The live version is deployed here: https://watch-it-rn.vercel.app/

To run the observability setup locally for this assignment:
1. Clone the repository and switch to the `assignment-1-observability` branch.
2. Run `npm install` to install the frontend (React/Vite) and backend (Node.js/Express) dependencies.
3. Set up your local `.env` file with your PostgreSQL connection string and the required API keys (TMDB, Gemini/Groq/Cerebras).
4. Start the app with `npm run dev`.
5. Start the monitoring tools with `docker compose up -d`, which spins up Prometheus and Grafana.

## Part B: Metrics

I added a Prometheus client to my Node.js/Express backend and exposed a `/metrics` endpoint that Prometheus can read.

| Metric Name | Purpose | Type | Unit | Labels | Code Location | Grafana Query |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `watchit_movie_swipes_total` | Tracks what users do with movies (business metric) | Counter | Swipes | `action` | `app.ts` - inside the `/api/swipe` POST route | `sum(watchit_movie_swipes_total) by (action)` |
| `watchit_active_ai_requests` | Tracks how many AI requests are running right now (app metric) | Gauge | Requests | None | `gemini.ts` - wraps the `Promise.any` AI race | `watchit_active_ai_requests` |
| `watchit_ai_generation_duration_seconds` | Tracks how long the AI takes to respond (app metric) | Histogram | Seconds | `le` (buckets) | `gemini.ts` - times the LLM network request | `histogram_quantile(0.90, sum(rate(watchit_ai_generation_duration_seconds_bucket[1m])) by (le))` |
| `watchit_db_query_duration_seconds` | Tracks how long PostgreSQL queries take (app metric) | Summary | Seconds | `quantile` | `app.ts` - inside the `/api/profile` GET route | `watchit_db_query_duration_seconds{quantile="0.95"}` |
| `watchit_ai_wins_total` | Tracks which AI provider is the fastest (business metric) | Counter | Wins | `provider` | `gemini.ts` - inside the `Promise.any` race helper | `sum(watchit_ai_wins_total) by (provider)` |

### Grafana Charts Explained
*   **Swipes (Counter):** Shows the total number of user actions, split by the `action` label (for example, comparing how many movies were marked "Watched" versus "Pass").
*   **Active Requests (Gauge):** Shows in real time how many AI requests are running. It goes up when multiple users ask for recommendations at once and drops back to 0 when things are idle.
*   **AI Latency p95 (Histogram):** Uses `histogram_quantile` to work out the 90th percentile of AI response times over the last minute, so we can see how slow the worst-case requests get.
*   **DB Latency p95 (Summary):** Uses the base Summary metric so Grafana can automatically pull and label the p50, p90, and p95 lines to keep an eye on database performance over time.
*   **AI Race Winners (Pie Chart):** Uses our new counter to display exactly which AI provider (Gemini, Groq, or Cerebras) is currently answering user prompts the fastest.

### Machine Metrics (Node Exporter)

Alongside the app's own metrics, I added Node Exporter to the Docker Compose setup to track the health of the machine the app runs on. Prometheus scrapes Node Exporter's `:9100` endpoint every 5 seconds, the same as it does for the app's `/metrics` endpoint, and every metric from it is labelled `machine="HP-ZBook-Local"` so it's clear which machine the numbers belong to.

Rather than building the CPU/memory/disk/network panels by hand, I imported Grafana's official **Node Exporter Full** community dashboard (dashboard ID `1860`) and pointed it at my Prometheus data source. This gave me a full dashboard covering:
*   **CPU usage** — per-core and overall CPU utilization.
*   **Memory usage** — used vs. available RAM.
*   **Disk usage** — free vs. used space, and disk I/O.
*   **Network traffic** — bytes sent and received per second.

All panels are automatically scoped to the `HP-ZBook-Local` machine label set in `prometheus.yml`. This is separate from the app metrics above — it's tracking the health of the underlying machine rather than anything about WatchIt itself — but it's useful for spotting cases where the app looks slow because the host machine is under load, not because of a bug in the app.

<img width="1862" height="862" alt="image" src="https://github.com/user-attachments/assets/0b9239a2-7ea5-4a13-9c8b-3b9a1cc9e08a" />

## Part C: Logs

**1. What I log, why, and where:**
I log every incoming HTTP request and any API errors using the `winston` library in Node.js. Requests are logged through a global middleware in `app.ts`, which attaches a unique `request_id` so I can trace a single request as it moves through the app. Logs are written locally to `logs/app.log` in JSON format. I mapped the service name to the field `service_name` instead of `service` to avoid a naming conflict with Elasticsearch's built-in schema.

**2. How Filebeat Collects and Parses Logs:**
Filebeat runs in Docker and watches the log file through a `filestream` input mapped to a read-only volume (`/app-logs`). It reads each line as `ndjson` and sends it straight to Elasticsearch. I turned off Filebeat's default data streams and used a custom index template (`watchit-logs-*`) instead, since the default one was clashing with other local projects.

**3. Where Logs Live and How Long They Last:**
Logs are stored in a local Elasticsearch container. I search them in Kibana using the `watchit-logs-*` data view. Because this is a local development setup, old logs are completely deleted whenever the Docker containers are spun down without persistent volumes (docker compose down -v). In a production environment, Index Lifecycle Management (ILM) would be configured in Elasticsearch to automatically delete daily index patterns (like watchit-logs-*) older than 30 days.

**4. Searching in Kibana:**
To trace a specific request or debug a problem, I use the KQL search bar in the Discover tab. For example:
`severity: "error" and request_id: "36fcadd0-04a3-43fc-a22d-3945387cd478"`

**Sample Stored Log:**
```json
{
  "level": "info",
  "message": "Incoming POST request to /api/swipe",
  "time": "2026-09-19T15:08:42.919Z",
  "service_name": "watchit-backend",
  "severity": "info",
  "request_id": "47c63250-9b44-4ac1-92ab-adffc6701751"
}
```

## Part D: System Design

### 1. Architecture Diagram

<img width="1600" height="948" alt="Architecture Diagram" src="https://github.com/user-attachments/assets/a4e1208d-6a4e-4cbc-b382-1daac2642fc5" />

**What each part does, and how they talk to each other**
*   **React 19 SPA (browser):** The frontend, built with Vite. It calls the backend's `/api/*` routes over HTTPS, and I separately open the Grafana and Kibana pages to check dashboards and logs.
*   **Node.js 22 / Express 4 backend (runs on the host machine, not in Docker):** `app.ts` has all the app's routes, the Winston logger, and the `prom-client` metrics setup that serves `GET /metrics`. It runs directly on the host on port 3000 instead of in Docker so I keep hot-reloading while developing.
*   **PostgreSQL (external, hosted):** The only place all app data is permanently stored — users, movies, swipes, conversations, messages — reached through a SQL connection via Drizzle ORM using `DATABASE_URL`.
*   **TMDB / Gemini / Groq / Cerebras APIs (external):** TMDB supplies movie details; the three AI providers are called at the same time with `Promise.any()` in `server/gemini.ts`, and only the fastest response is actually used.
*   **Filebeat (container):** Watches `logs/app.log` through a read-only Docker volume mount (`./logs -> /app-logs`), reads each line as NDJSON, and sends the parsed entries to Elasticsearch over HTTP. Filebeat is the one that pushes the data — it starts the connection as soon as new lines show up.
*   **Elasticsearch (container):** Stores and indexes the logs Filebeat sends it, under a index that rotates daily: `watchit-logs-YYYY.MM.dd`.
*   **Kibana (container):** Lets me search and filter logs stored in Elasticsearch using the `watchit-logs-*` index pattern.
*   **Prometheus (container):** Every 5 seconds, it checks two endpoints: the backend's `GET /metrics` (reached through `host.docker.internal:3000` since the backend isn't inside Docker) and Node Exporter's `:9100`.
*   **Node Exporter (container):** Reports hardware stats (CPU, memory, disk, network) for the machine running Docker, labelled `machine="HP-ZBook-Local"` in Prometheus.
*   **Grafana (container):** Runs PromQL queries against Prometheus whenever a dashboard is opened or refreshed, and draws the charts I look at in the browser.

**Where data is stored, and why**
*   **PostgreSQL** holds the only permanent copy of the app's data. It was already being used for the live version on Vercel, so reusing it locally means I only need to maintain one schema and one connection string instead of two.
*   **`logs/app.log`** is a plain file on disk, not a database. This keeps things simple: Winston writes to it directly, it survives app restarts, and it's exactly the kind of file Filebeat is built to watch.
*   **Elasticsearch** holds a searchable copy of the logs, not the only copy — `app.log` on disk is still the original. I didn't set up a named Docker volume for it, so its data is wiped if I run `docker compose down -v`. That's fine for a personal project: the index can just be rebuilt from the log file if needed.
*   **Prometheus's storage** works the same way — it's local to the container and can be safely lost, since it just refills itself from the next scrape. It's a monitoring cache, not somewhere I need to keep data long-term.

**What happens if a part stops working**

| Component | Impact if it goes down |
| :--- | :--- |
| **PostgreSQL** | Every `/api/*` route that touches the database returns a 500 error. Login still works, but the user's data can't be saved or read. This is the only part of the monitoring setup that would actually be noticeable to users. |
| **TMDB API** | Movie discovery falls back to whatever's already in the database; new movies stop being added, and poster/rating info on AI recommendations is just skipped. |
| **One of Gemini / Groq / Cerebras** | No real impact — `Promise.any()` just uses whichever of the other two responds first. Chat only breaks if all three are down, in which case the code tries Gemini one more time before giving up and returning a 500. |
| **Prometheus** | No new metrics get collected while it's down, so Grafana shows a gap for that time. The app itself keeps running fine — `/metrics` is still there, just nobody's reading it. |
| **Grafana** | Dashboards become unreachable, but Prometheus keeps collecting and storing data in the background. Nothing is lost, it's just not viewable until Grafana comes back. |
| **Node Exporter** | System stats like CPU, memory, disk, and network stop updating. App metrics aren't affected since they come from a different source. |
| **Filebeat** | Logs keep piling up safely in `app.log` on disk. Nothing gets sent to Elasticsearch until Filebeat is back up, and then it picks up from where it left off. |
| **Elasticsearch** | Filebeat's requests fail and it keeps retrying; Kibana stops working since it has nothing to search. The app's own logging to `app.log` isn't affected at all. |
| **Kibana** | Log search becomes unavailable, but the data in Elasticsearch is safe and untouched; the app itself is unaffected. |

Basically, the entire monitoring setup (Prometheus, Grafana, Node Exporter, Filebeat, Elasticsearch, Kibana) can go down without the app itself breaking for users — it's purely there to watch what's happening. The only things that actually matter to users if they go down are PostgreSQL, and, for the chat feature, all three AI providers failing at the same time.

### 2. Following a Metric and a Log

**Following a metric: `watchit_ai_generation_duration_seconds`**
This histogram tracks how long the AI chat takes to come back with a recommendation — basically the time spent waiting on the `Promise.any()` race between Gemini, Groq, and Cerebras.

*   **Step 1 — The code updates it:** In `server/gemini.ts`, a timer starts right before the race begins and stops as soon as it finishes:
    ```typescript
    const endTimer = aiLatencyHistogram.startTimer();
    const result = await Promise.any([
      fetchCerebras(prompt), fetchGroq(prompt), fetchGemini(prompt)
    ]);
    endTimer(); // records how long it took, into the right bucket
    ```
    The histogram is set up in `server/metrics.ts` with buckets at [0.5, 1, 2, 4, 8] seconds. So if a chat request takes 1.3 seconds, `endTimer()` adds 1 to the count for the 2s, 4s, and 8s buckets (since 1.3s fits under all of those), and also adds 1 to `watchit_ai_generation_duration_seconds_count` and 1.3 to `..._sum`.

*   **Step 2 — Prometheus collects and stores it:** Every 5 seconds (`scrape_interval: 5s` in `prometheus.yml`), Prometheus sends a GET request to `host.docker.internal:3000/metrics` and reads the current bucket counts as plain text, for example:
    ```text
    watchit_ai_generation_duration_seconds_bucket{le="0.5"} 12
    watchit_ai_generation_duration_seconds_bucket{le="1"} 12
    watchit_ai_generation_duration_seconds_bucket{le="2"} 34
    watchit_ai_generation_duration_seconds_bucket{le="4"} 40
    watchit_ai_generation_duration_seconds_bucket{le="8"} 41
    watchit_ai_generation_duration_seconds_bucket{le="+Inf"} 41
    watchit_ai_generation_duration_seconds_sum 58.7
    watchit_ai_generation_duration_seconds_count 41
    ```
    Prometheus saves this snapshot with a timestamp in its own storage. Each scrape adds a new data point instead of replacing the old one, so over time a full history builds up.

*   **Step 3 — Grafana queries and shows it:** A Grafana panel runs this PromQL query against Prometheus whenever the dashboard loads or refreshes:
    ```promql
    histogram_quantile(0.90, sum(rate(watchit_ai_generation_duration_seconds_bucket[1m])) by (le))
    ```
    `rate(...[1m])` converts the raw bucket counts into a per-second rate over the last 1 minute, and `histogram_quantile(0.90, ...)` estimates the value under which 90% of AI response times fall. The panel draws this as a line over time, so if Gemini and Groq both slow down and only Cerebras stays fast, that shows up right away as the p90 line climbing.

**Following a log: the incoming-request log line**
This is the log that gets written for every single HTTP request the backend receives.

*   **Step 1 — The code writes it:** In `app.ts`, a middleware that runs before every route generates a request ID and logs the request:
    ```typescript
    app.use((req, res, next) => {
      const requestId = randomUUID();
      req.headers['x-request-id'] = requestId;
      logger.info({
        message: `Incoming ${req.method} request to ${req.url}`,
        severity: 'info',
        request_id: requestId
      });
      next();
    });
    ```
    Winston (`server/logger.ts`) adds a `time` timestamp and a fixed `service_name: "watchit-backend"` field, turns the whole thing into one JSON object, and appends it as one line to `logs/app.log`. For a real `POST /api/swipe` request, the line saved to disk looks like this:
    ```json
    {
      "level": "info",
      "message": "Incoming POST request to /api/swipe",
      "time": "2026-09-19T15:08:42.919Z",
      "service_name": "watchit-backend",
      "severity": "info",
      "request_id": "47c63250-9b44-4ac1-92ab-adffc6701751"
    }
    ```

*   **Step 2 — Filebeat picks it up and parses it:** Filebeat's `filestream` input is watching `/app-logs/*.log` (the read-only mount of `./logs`) and picks up the new line as soon as it's written. Its `ndjson` parser reads the line as JSON, and because `target: ""` is set in `filebeat.yml`, it puts every field directly at the top level instead of nesting it. Filebeat then sends the parsed entry to Elasticsearch at `elasticsearch:9200`, into the index `watchit-logs-2026.09.19` (the date is added automatically, as set up in `filebeat.yml`).

*   **Step 3 — Elasticsearch stores it:** The entry is stored with the same fields it arrived with, plus a few extra fields Filebeat/Elasticsearch add on their own (`@timestamp`, `agent`, `host`, etc.). One thing worth pointing out: both the app's own `time` field and Filebeat's `@timestamp` field end up in the stored document — Kibana uses `@timestamp` by default for its time filter. I also had to name the field `service_name` instead of `service`, because Elasticsearch's built-in schema reserves `service` for something else, and using it caused 400 errors when the logs were first being ingested.

*   **Step 4 — Kibana finds it:** In Kibana, I select the `watchit-logs-*` index pattern and search `request_id: "47c63250-9b44-4ac1-92ab-adffc6701751"`. This returns exactly that one log entry, showing the fields — `time`, `service_name`, `severity`, `message`, and `request_id` — as separate, searchable fields instead of one block of text. Searching `severity: "error"` instead would show every error log across the whole app, like the ones written by the `/api/chat` error handler, each still carrying its own `request_id` so I can trace it back to the exact request that caused it.

## Part E: Experiments

### 1. Reproducing a Problem

**Problem Chosen:** A slow upstream AI response causing requests to pile up.

**1. Normal behavior**
I set up a repeatable test using a browser console script that sent a logged-in `POST` request to `/api/chat` every 3 seconds:
```javascript
const aiTraffic = setInterval(async () => {
  fetch("http://localhost:3000/api/chat", { /* headers/body omitted for brevity */ });
}, 3000);

```

Under normal conditions (using a mock delay of 2000ms to stand in for a typical AI response time), the app handled requests fine. Grafana showed a steady baseline latency of around ~3 seconds (2s mock delay plus some network overhead), using a 1-minute rate window. The Active AI Requests gauge went back down to 0 after each request finished.

*Query used:* `histogram_quantile(0.95, sum(rate(watchit_ai_generation_duration_seconds_bucket[1m])) by (le))`

<img width="1405" height="581" alt="WhatsApp Image 2026-09-20 at 5 54 39 PM" src="https://github.com/user-attachments/assets/0539e641-7268-47d4-9194-acf51f362b97" />


**2. Prediction**
If I add an artificial 8000ms delay into the route handler, I'd expect the `histogram_quantile` chart to jump to around ~9 seconds. Since the 8-second delay is longer than the 3-second gap between requests, requests will start overlapping. So the Active AI Requests gauge should climb to 2 or 3 and stay there instead of dropping to 0. The logs won't show any `500` errors, since the requests still succeed eventually — they're just slow — but the gap between when a request comes in and when it finishes will get noticeably wider.

**3. Introducing the problem**
I added `await new Promise(resolve => setTimeout(resolve, 8000));` into `server/gemini.ts` and restarted the backend. As expected, the p95 latency line in Grafana jumped sharply to around 9 seconds, and the gauge climbed to 3 concurrent requests, clearly showing the backlog building up.

<img width="1359" height="408" alt="WhatsApp Image 2026-09-20 at 6 24 00 PM" src="https://github.com/user-attachments/assets/296ff6d7-da8c-41be-bec8-6004dc0cfd9b" />


**4. Cause and effect**
This is basically what would happen if an upstream provider like Gemini or Groq had network problems or was just slow to respond. From a user's point of view, the app would seem to freeze for over 8 seconds every time they interacted with it — a pretty bad experience. Since no `500` errors are thrown, normal error logging wouldn't catch this at all, which is exactly why having latency histograms and in-flight request gauges matters.

**5. Recovery**
I removed the 8000ms delay from the code, restarted the backend to clear out the stuck requests, and let the traffic script keep running. Within about a minute (matching the `[1m]` rate window in the query), the p95 latency dropped back down to the 3-second baseline, and the gauge cleared out and went back to 0.

<img width="1363" height="390" alt="WhatsApp Image 2026-09-20 at 6 28 16 PM" src="https://github.com/user-attachments/assets/d662586a-5be5-4985-85b1-f66ce7558c91" />


### 2. Cardinality Explosion

A cardinality explosion happens when a metric label has too many different possible values (like a unique ID), which forces Prometheus to create a separate time series for every single value — way more than it can handle well.

**1. The Experiment**
I added a `request_id` label to a test counter called `watchit_cardinality_test_total`. Then I added a loop to the `/api/chat` route that generates 100 unique `randomUUID()` values and increments the counter once for each one.

```typescript
for (let i = 0; i < 100; i++) {
  badCardinalityCounter.labels({ request_id: randomUUID() }).inc();
}

```

**2. Series Growth**
After triggering the route once from the UI, I checked Prometheus to see how many separate time series had been created.
*Query used:* `count(watchit_cardinality_test_total)`
The result was exactly `100`. So instead of incrementing one counter 100 times, Prometheus had actually created 100 completely separate time series from a single request.

<img width="1370" height="863" alt="image" src="https://github.com/user-attachments/assets/75af6275-dcd1-4212-85a1-692e7b512a4e" />


**3. Cleanup**
I removed the request_id label from the code, deleted the loop, and restarted the application. After waiting for the next 5-second Prometheus scrape, I triggered the chat route again. Running the count() query confirmed that the number of time series remained completely static at 100 and did not grow, proving the explosion was halted.

**4. Why this matters at a larger scale**
If this happened at a production scale of, say, 10,000 requests a minute, tagging metrics with a unique `request_id` would create 10,000 brand new time series in memory every single minute. That would quickly eat up CPU and memory and could crash the Prometheus server. The fix is to only use labels with a small, fixed set of values (like HTTP method or status code). Anything unique per-request, like a `request_id`, belongs in the logs instead — Elasticsearch is built to handle searching through high-cardinality data like that, Prometheus isn't.