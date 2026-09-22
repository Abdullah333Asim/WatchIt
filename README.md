# WatchIt - Assignment 1: Observability

This repository contains the observability implementation for **WatchIt**, an AI-powered movie discovery application. This project was completed for Assignment 1: Observability (Enterprise Software Development).

## Prerequisites

To run this project locally, your machine must have:

- **Node.js** (v18+)
- **Docker Desktop** (running)

## Environment Setup (.env)

You must create a `.env` file in the root directory for the application to run.

**Instructor Note:** A fully populated `.env` file (containing the required Database URL, JWT Secret, and Firebase Admin credentials) has been submitted privately via Canvas. Please place that file in the root directory and add your own AI/TMDB API keys to it.

For reference, here is the `.env.example` structure required by the project:

```env
# AI & External APIs (Add your own keys)
GEMINI_API_KEY="your_gemini_api_key_here"
GROQ_API_KEY="your_groq_api_key_here"
CEREBRAS_API_KEY="your_cerebras_api_key_here"
TMDB_API_KEY="your_tmdb_api_key_here"

# Required Core Infrastructure (Backend & Auth)
DATABASE_URL="your_pooled_postgres_connection_string"
SQL_SSL="true"
SQL_SSL_REJECT_UNAUTHORIZED="false"
APP_URL="http://localhost:3000"
JWT_SECRET="your_jwt_secret"

# Frontend Firebase Config (public keys, safe to commit - see note below)
VITE_FIREBASE_API_KEY="your_firebase_api_key"
VITE_FIREBASE_AUTH_DOMAIN="your_project.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="your_project_id"
VITE_FIREBASE_STORAGE_BUCKET="your_project.firebasestorage.app"
VITE_FIREBASE_MESSAGING_SENDER_ID="your_sender_id"
VITE_FIREBASE_APP_ID="your_app_id"

# Backend Firebase Admin (SECRET - do not commit a real value)
FIREBASE_SERVICE_ACCOUNT_JSON='your_firebase_service_account_json_string'
```

> **Note on the `VITE_FIREBASE_*` keys:** these are safe to include because Vite bundles anything prefixed `VITE_` directly into the frontend JavaScript, so it's already visible to anyone who opens the browser's dev tools. Firebase's client config is designed to be public; access control is enforced through Firebase security rules, not by hiding these values. `FIREBASE_SERVICE_ACCOUNT_JSON` is different — it's a backend admin credential and should never be committed with a real value.

---

## 1. Starting the Project

**Step 1: Start the Observability Stack**

Open a terminal in the project root and spin up the Docker containers (Prometheus, Grafana, Elasticsearch, Kibana, Filebeat, and Node Exporter):

```bash
docker-compose up -d
```

**Step 2: Start the Application**

Open a second terminal, install the dependencies, and start the Vite frontend and Express backend:

```bash
npm install
npm run dev
```

---

## 2. Using the Application

Once both the Docker containers and the Node.js server are running, you can access the different interfaces via your browser:

- **WatchIt App:** [http://localhost:3000](http://localhost:3000)
  Log in (or continue as guest) and use the chat interface to ask Cine Noir for a movie recommendation. This will generate metrics and logs.

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
2. If prompted, create a Data View with the index pattern `watchit-logs-*` and select `@timestamp` as the time field.
3. Filter logs by specific fields — for example, searching `severity: "error"` or tracking a specific `request_id`.

---

## 4. Safe Clean Up

To gracefully stop the application and destroy the background monitoring containers and their temporary data, follow these steps:

1. **Stop the App:** Press `Ctrl + C` in the terminal running the Node.js server.
2. **Destroy the Telemetry Stack:** Run the following command to spin down the Docker containers and permanently wipe their attached data volumes (clearing the local Prometheus and Elasticsearch databases):

```bash
docker-compose down -v
```