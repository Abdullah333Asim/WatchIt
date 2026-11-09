# WatchIt - Assignment 3: Load Balancing and Observability

This branch deploys the WatchIt application in a containerized, multi-replica architecture. It introduces an Envoy Proxy to act as a Layer 7 ingress gateway, distributing HTTP and gRPC traffic across three backend replicas (A, B, and C).

## Prerequisites

* **Node.js** (v18+)
* **Python** (3.10+)
* **Docker Desktop** (running)
* **Git**

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
git clone https://github.com/Abdullah333Asim/WatchIt.git
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
Build the images and start the full environment (Envoy proxy, 3 Application Replicas, Prometheus, Grafana, and the ELK stack):

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

## 3. Running the Experiments

By default, the repository is configured for **Part C / Experiment 3**: standard `ROUND_ROBIN` load balancing across all three replicas with active health checks enabled and no artificial delays.

To generate load for any of the experiments below, execute the Python workload scripts in a separate terminal:

```bash
python workload_http.py
python workload_grpc.py
```

### Experiment 1: Weighted Round Robin

To test custom endpoint weights (2:1:1 ratio):

1. Open `envoy.yaml`.
2. Uncomment the `load_balancing_weight: 2` line under `replica-a`, and the `load_balancing_weight: 1` lines under `replica-b` and `replica-c` for **both** the HTTP and gRPC clusters.
3. Restart Envoy to apply the new routing table:
```bash
docker-compose restart envoy
```

4. Run the Python workloads and observe Grafana to see Replica A taking 50% of the traffic.
5. *Recovery:* Re-comment the weight lines in `envoy.yaml` and restart Envoy to restore equal distribution.

### Experiment 2: Least Request

To test intelligent load balancing under degraded backend performance:

1. Open `app.ts` and uncomment the 500ms delay at **line 330**:
`if (process.env.REPLICA_ID === 'B') await new Promise(r => setTimeout(r, 500));`
2. Open `grpc-server.ts` and uncomment the 500ms delay at **line 65**:
`}, process.env.REPLICA_ID === 'B' ? 500 : 15);`
3. Rebuild the application containers to apply the delay:
```bash
docker-compose up --build -d
```

4. Run the workloads under the default `ROUND_ROBIN` policy and observe the severe p95 latency degradation in the terminal.
5. Open `envoy.yaml` and change `lb_policy: ROUND_ROBIN` to `lb_policy: LEAST_REQUEST` in both clusters.
6. Restart Envoy:
```bash
docker-compose restart envoy
```


7. Re-run the workloads. Envoy will dynamically route traffic away from Replica B, restoring fast client p95 latency.
8. *Recovery:* Re-comment the delay lines in the `.ts` files, revert to `lb_policy: ROUND_ROBIN`, and run `docker-compose up --build -d` followed by `docker-compose restart envoy`.

### Experiment 3: Failure and Recovery (Active Health Checks)

Ensure the repository is in its default state (Round Robin, no delays, health checks enabled in `envoy.yaml`).

1. Execute the HTTP or gRPC Python workload (which runs for 15 seconds).
2. Wait 2–3 seconds, then abruptly kill Replica B in another terminal:
```bash
docker stop replica-b
```
3. Wait another 3–4 seconds (while the workload is still actively running), and start Replica B back up:
```bash
docker start replica-b
```
4. Observe the client terminal. You will see roughly 30–60 `HTTP 503` or `gRPC 111 Connection Refused` errors. This happens because Envoy takes 6 seconds (3s interval $\times$ 2 thresholds) to detect the failure before ejecting B.
5. Check Grafana to see the full lifecycle on a single graph: Replicas A and C absorb the traffic during the outage, and Replica B successfully rejoins the pool at the very end after passing 1 successful health check (3 seconds).


---

## 4. Observability Verification

### Grafana Dashboards

Navigate to `http://localhost:3001`, import `watchit-dashboard.json`, and open the **WatchIt Observability** dashboard to inspect:

* **HTTP / gRPC Request Rate & Share:** Validates the traffic distribution across Replicas A, B, and C.
* **Error Rates:** Verifies zero error responses across backends during baseline testing, and captures the expected 503s during Chaos testing.
* **Latency Distribution:** Evaluates p50 and p95 latency histograms based on internal execution time.

### Distributed Tracing in Kibana

1. Open `http://localhost:5601` and navigate to **Discover**.
2. Select the `watchit-logs-*` data view.
3. In the query bar, search for a specific Trace ID across proxy and backend fields to track a request's full journey:
```text
request_id: "<UUID>" OR trace_id: "<UUID>"
```


---

## 5. Clean up

To safely spin down all containers, networks, and volumes (this will wipe the local Postgres database and Elasticsearch indices):

```bash
docker-compose down -v
docker rm -f watchit-postgres
```