# WatchIt - Assignment 3: Load Balancing and Observability

This branch deploys the WatchIt application in a containerized, multi-replica architecture. It introduces an Envoy Proxy to act as a Layer 7 ingress gateway, distributing HTTP and gRPC traffic across three backend replicas (A, B, and C) using a Round Robin load-balancing policy.

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

# Local database 
DATABASE_URL="postgres://myuser:mypassword@127.0.0.1:5433/mydb"
```

---

## 1. Setup & Booting the Infrastructure

**Step 1: Clone the repository**

```bash
git clone [https://github.com/Abdullah333Asim/WatchIt.git](https://github.com/Abdullah333Asim/WatchIt.git)
cd WatchIt
git checkout assignment-3-loadbalancing
```

**Step 2: Install dependencies**

```bash
npm install
pip install requests grpcio grpcio-tools protobuf
```

**Step 3: Start a local PostgreSQL container**
Port `5433` is used to avoid clashing with a native Postgres install.

```bash
docker run --name watchit-postgres -e POSTGRES_USER=myuser -e POSTGRES_PASSWORD=mypassword -e POSTGRES_DB=mydb -p 5433:5432 -d postgres:latest
```

**Step 4: Boot the Docker Stack**
Run the following command to build the Docker images and start the full environment (Envoy proxy, 3 Application Replicas, Prometheus, Grafana, and the ELK stack):

```bash
docker-compose up --build -d
```

**Step 5: Push the database schema**
Initialize the tables in your PostgreSQL database:

```bash
npx drizzle-kit push
```

---

## 2. Accessing the Application

* **WatchIt Web UI (via Envoy):** `http://localhost:8080`
* **Envoy Admin Portal:** `http://localhost:9901`
* **Grafana Dashboards:** `http://localhost:3001` (login: `admin` / `admin`)
* **Kibana Logs:** `http://localhost:5601`

---

## 3. Testing & Workloads

### A. Manual Interactive Testing (UI)

You can test the load balancer manually by using the actual application:

1. Open a web browser and go to `http://localhost:8080`.
2. Register as a guest and start swiping on movies.
3. Because the UI is served through Envoy, your manual swipes are routed across Replicas A, B, and C. You can watch the **HTTP Request Rate** panels in Grafana update in real-time as you interact with the app.

### B. Automated Load Testing (Python)

To generate the 300-request bursts required for the assignment baseline, use the provided Python workload scripts.

**HTTP Workload (20 req/s for 15s):**

```bash
python workload_http.py
```

**gRPC Workload (20 req/s for 15s):**

```bash
python workload_grpc.py
```

---

## 4. Observability Verification

### Grafana Dashboards

Navigate to `http://localhost:3001`, import `watchit-dashboard.json`, and open the **WatchIt Observability** dashboard to inspect:

* **HTTP / gRPC Request Rate & Share:** Validates the traffic distribution across Replicas A, B, and C.
* **Error Rates:** Verifies zero error responses across backends.
* **Latency Distribution:** Evaluates p50 and p95 latency histograms.

### Distributed Tracing in Kibana

1. Open `http://localhost:5601` and navigate to **Discover**.
2. Select the `watchit-logs-*` data view.
3. In the query bar, search for a specific Trace ID across proxy and backend fields:

```text
   request_id: "<UUID>" OR trace_id: "<UUID>"
```

---

## 5. Clean up

To safely spin down all containers, networks, and volumes (this will wipe the local Postgres database):

```bash
docker-compose down -v
docker rm -f watchit-postgres
```