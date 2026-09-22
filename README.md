# WatchIt - Assignment 1: Observability

This repository contains the observability implementation for **WatchIt**, an AI-powered movie discovery application. This project was completed for Assignment 1: Observability (Enterprise Software Development).

## Prerequisites

To run this project locally, your machine must have:

- **Node.js** (v18+)
- **Docker Desktop** (running)
- **Git**

---

## Environment Setup (.env)

Create a `.env` file in the root directory with the following:

```env
# AI & External APIs (add your own keys)
GEMINI_API_KEY="your_gemini_api_key_here"
GROQ_API_KEY="your_groq_api_key_here"
CEREBRAS_API_KEY="your_cerebras_api_key_here"
TMDB_API_KEY="your_tmdb_api_key_here"

# Local database (matches the Docker container started in Step 2 below)
DATABASE_URL="postgres://myuser:mypassword@127.0.0.1:5433/mydb"
```

No other keys are required. Firebase login is optional — the app runs fully in guest mode without any Firebase configuration.

---

## 1. Setup and Installation

**Step 1: Clone the Repository**

```bash
git clone <your-repository-url>
cd <your-repository-folder>
git checkout assignment-1-observability
```

**Step 2: Start a Local PostgreSQL Container**

Spin up a local database using Docker. (Port `5433` is used, not the default `5432`, to avoid conflicting with any native local Postgres installation.)

```bash
docker run --name watchit-postgres -e POSTGRES_USER=myuser -e POSTGRES_PASSWORD=mypassword -e POSTGRES_DB=mydb -p 5433:5432 -d postgres:latest
```

**Step 3: Push the Database Schema**

```bash
npx drizzle-kit push
```

**Step 4: Start the Observability Stack**

In the project root, start the Docker containers for Prometheus, Grafana, Elasticsearch, Kibana, Filebeat, and Node Exporter:

```bash
docker-compose up -d
```

**Step 5: Start the Application**

In a second terminal, install dependencies and start the frontend and backend:

```bash
npm install
npm run dev
```

---

## 2. Using the Application

Once the Docker containers and the Node.js server are running:

- **WatchIt App:** [http://localhost:3000](http://localhost:3000)
  Continue as guest and use the chat interface to ask Cine Noir for a movie recommendation. This generates metrics and logs.

- **Grafana:** [http://localhost:3001](http://localhost:3001)
  Login: `admin` / Password: `admin`

- **Kibana:** [http://localhost:5601](http://localhost:5601)

---

## 3. Testing the Observability Tools

### Viewing Metrics (Grafana)

Two exported dashboard JSON files are provided in this repository:

1. `watchit-dashboard.json` — Custom application metrics: swipes, AI latency, active LLM requests, DB latency, AI race winners
2. `node-exporter-dashboard.json` — Hardware/machine metrics: CPU, RAM, network, disk

**To test:** In Grafana, go to **Dashboards → New → Import**, upload these JSON files, and select the local Prometheus data source. The dashboards will populate with data as you interact with the WatchIt app.

### Viewing Logs (Kibana)

All backend HTTP requests and errors are structured as JSON using Winston and written locally to `logs/app.log`. Filebeat reads this file and ships it to Elasticsearch.

**To test:**

1. Open Kibana and navigate to **Discover** (via the side menu).
2. Create a Data View with the index pattern `watchit-logs-*` and select `@timestamp` as the time field.
3. Filter logs by specific fields — for example, searching `severity: "error"` or tracking a specific `request_id`.

---

## 4. Troubleshooting

**"password authentication failed for user 'myuser'"**

This usually means the Node.js server connected to a pre-existing native PostgreSQL installation on your machine instead of the Docker container.

**The fix:** Confirm your `.env` uses `127.0.0.1:5433`, not `localhost:5432`, and that the Docker container was started with the `-p 5433:5432` flag.

---

## 5. Safe Clean Up

1. **Stop the App:** Press `Ctrl + C` in the terminal running the Node.js server.

2. **Destroy the Telemetry Stack:** Spin down the Docker containers and permanently wipe their attached data volumes:

   ```bash
   docker-compose down -v
   ```

3. **Destroy the Postgres Container:**

   ```bash
   docker rm -f watchit-postgres
   ```