# WatchIt - Assignment 2: HTTP APIs, gRPC, and Metrics

[![Assignment 2 Walkthrough Video](https://markdown-videos-api.jorgenkh.no/youtube/ssPIzA-R0bM)](https://youtu.be/ssPIzA-R0bM)

This branch adds a cleaned-up HTTP swipe API (`POST /api/swipes`), a separate gRPC swipe service, and Prometheus and Grafana metrics for both. It builds on the Assignment 1 observability setup.

## Prerequisites

- **Node.js** (v18+)
- **Python** (3.10+)
- **Docker Desktop** (running)
- **Git**

## Environment Setup (.env)

Create a `.env` file in the root directory:

```env
# AI & External APIs (add your own keys)
GEMINI_API_KEY="your_gemini_api_key_here"
OPENROUTER_API_KEY="your_openrouter_api_key_here"
TMDB_API_KEY="your_tmdb_api_key_here"

# Local database (matches the Docker container started in Step 3 below)
DATABASE_URL="postgres://myuser:mypassword@127.0.0.1:5433/mydb"
```

No other keys are required. Firebase login is optional. The app runs fully in guest mode.

---

## 1. Run

**Step 1: Clone the repository**

```bash
git clone https://github.com/Abdullah333Asim/WatchIt.git
cd WatchIt
git checkout assignment-2-apis-grpc
```

**Step 2: Install dependencies**

```bash
npm install
pip install --upgrade grpcio grpcio-tools
```

**Step 3: Start a local PostgreSQL container**

Port `5433` is used to avoid clashing with a native Postgres install.

```bash
docker run --name watchit-postgres -e POSTGRES_USER=myuser -e POSTGRES_PASSWORD=mypassword -e POSTGRES_DB=mydb -p 5433:5432 -d postgres:latest
```

**Step 4: Push the database schema**

```bash
npx drizzle-kit push
```

**Step 5: Start Prometheus, Grafana and the logging stack**

```bash
docker-compose up -d
```

**Step 6: Start the HTTP server (port 3000)**

```bash
npm run dev
```

**Step 7: Start the gRPC server (port 50051, metrics on port 9091)**

In a second terminal:

```bash
npx tsx grpc-server.ts
```

**Generate the Python gRPC code (optional)**

`swipes_pb2.py` and `swipes_pb2_grpc.py` are already in the repository. To create them again from `proto/swipes.proto`:

```bash
python -m grpc_tools.protoc -I proto --python_out=. --grpc_python_out=. proto/swipes.proto
```

**Where things are**

- Swagger UI (OpenAPI docs): http://localhost:3000/api/docs
- HTTP metrics: http://localhost:3000/metrics
- gRPC metrics: http://localhost:9091/metrics
- Prometheus: http://localhost:9090 (Status → Targets: `watchit-backend` and `watchit-grpc-server` should be `UP`)
- Grafana: http://localhost:3001 (login `admin` / `admin`)
- Kibana: http://localhost:5601

---

## 2. Test

Both servers (Steps 6 and 7) must be running.

**Swagger UI.** Open http://localhost:3000/api/docs. Get a guest token with `POST /api/auth/register`, click **Authorize**, and paste it. Then try `POST /api/swipes`:

- A valid swipe, for example `{"movieId": "27209", "action": "Watched"}`: `201 Created`
- The same request again: `200 OK` with `"idempotent_replay": true`
- An action that isn't allowed, for example `"SuperLike"`: `400 Bad Request`
- More than 8 requests within 15 seconds: `429 Too Many Requests` with a `Retry-After` header

**Python HTTP caller** (timeout, retry with backoff, circuit breaker):

```bash
python http_client.py
```

Scenario 5 prints how many requests are left in the rate limit window and may not reach a `429`, so use Swagger UI to see the `429`. If you run the script twice, wait about 15 seconds between runs.

**Python gRPC client** (20 valid and 20 invalid calls, 5 second deadline):

```bash
python grpc_client.py
```

**Grafana.** Go to **Dashboards → New → Import**, upload `watchit-dashboard.json`, and choose the Prometheus data source. After running the two scripts, set the time range to the last 15 minutes. The gRPC and HTTP panels will fill with data.

**Logs (request ID across HTTP and gRPC).** In Kibana, create a Data View for `watchit-logs-*` (time field `@timestamp`). Copy the `trace-...` ID printed by `grpc_client.py` and search for it as `request_id`. Search `service_name: "watchit-grpc-server"` to see only the gRPC server.

---

## 3. Troubleshooting

- **`StatusCode.UNAVAILABLE` from `grpc_client.py`:** the gRPC server isn't running. Start it (Step 7).
- **`No module named 'swipes_pb2'`:** run the Python scripts from the project root.
- **"The grpc package installed is at version ...":** run `pip install --upgrade grpcio grpcio-tools`.
- **"password authentication failed for user 'myuser'":** the app connected to a native Postgres install. Make sure `.env` uses `127.0.0.1:5433` and the container was started with `-p 5433:5432`.
- **`TimeoutError` on the very first run of `http_client.py`:** This is a normal "cold start" delay. When the Express server boots up, compiling the TypeScript and establishing the initial database connection pool can take longer than the strict timeout in the test script. Just run the script a second time; the server will be "warm" and execute instantly.

## 4. Clean up

Stop both servers with `Ctrl + C`, then:

```bash
docker-compose down -v
docker rm -f watchit-postgres
```

**Optional: keep the database but remove only the test movies**

If you do not want to destroy the Postgres container but want to clean the UI for grading, open Drizzle Studio:

```bash
npx drizzle-kit studio
```

Open the local studio link, navigate to the **SQL Console**, and run these two queries in this exact order (because swipes are tied to movies):

```sql
DELETE FROM swipes WHERE movie_id IN (SELECT id FROM movies WHERE title LIKE 'Movie #%');
DELETE FROM movies WHERE title LIKE 'Movie #%';
```