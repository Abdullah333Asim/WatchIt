import json
import time
import uuid
import urllib.request
import urllib.error

BASE_URL = "http://localhost:3000"

# ─── Explicit Resilience Settings (Stated for Report) ─────────────────────────
REQUEST_TIMEOUT_SEC = 1.5       # Client timeout per HTTP attempt
MAX_RETRIES = 2                 # Max retries on transient failure (3 total attempts)
INITIAL_BACKOFF_SEC = 0.5       # Exponential backoff: 0.5s, then 1.0s
FAILURE_THRESHOLD = 3           # Consecutive failed calls before Circuit Breaker opens
RECOVERY_TIMEOUT_SEC = 3.0      # Cooldown period before Circuit Breaker enters HALF_OPEN


class CircuitBreakerOpenError(Exception):
    """Raised when the circuit breaker is OPEN and blocks outbound calls."""
    pass


class CircuitBreaker:
    def __init__(self, failure_threshold: int, recovery_timeout: float):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.state = "CLOSED"  # CLOSED -> OPEN -> HALF_OPEN -> CLOSED
        self.failure_count = 0
        self.opened_at = 0.0

    def before_call(self):
        if self.state == "OPEN":
            elapsed = time.time() - self.opened_at
            if elapsed >= self.recovery_timeout:
                self.state = "HALF_OPEN"
                print(f"  [CircuitBreaker] Cooldown ({self.recovery_timeout}s) elapsed -> State: HALF_OPEN (probing server)")
            else:
                remaining = self.recovery_timeout - elapsed
                raise CircuitBreakerOpenError(
                    f"Circuit Breaker is OPEN (fast-failing call; {remaining:.1f}s remaining in cooldown)"
                )

    def record_success(self):
        if self.state in ("OPEN", "HALF_OPEN") or self.failure_count > 0:
            print(f"  [CircuitBreaker] Call succeeded -> Resetting failure count to 0, State: CLOSED")
        self.failure_count = 0
        self.state = "CLOSED"

    def record_failure(self):
        self.failure_count += 1
        print(f"  [CircuitBreaker] Recorded failure #{self.failure_count}/{self.failure_threshold}")
        if self.state == "HALF_OPEN" or self.failure_count >= self.failure_threshold:
            self.state = "OPEN"
            self.opened_at = time.time()
            print(f"  [CircuitBreaker] Threshold reached! State -> OPEN for {self.recovery_timeout}s")


def raw_http_request(method: str, path: str, headers: dict, body: dict | None = None, timeout: float = REQUEST_TIMEOUT_SEC):
    url = f"{BASE_URL}{path}"
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req_headers = {"Content-Type": "application/json", "Accept": "application/json", **headers}
    req = urllib.request.Request(url, data=data, headers=req_headers, method=method)

    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read().decode("utf-8")
            return resp.status, dict(resp.headers), json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8")
        try:
            parsed = json.loads(raw)
        except Exception:
            parsed = {"raw": raw}
        return e.code, dict(e.headers), parsed


def get_guest_token() -> str:
    status, _, body = raw_http_request(
        "POST",
        "/api/auth/register",
        headers={},
        body={"username": "pythonservice", "password": "password123"},
        timeout=5.0  # <--- Added a 5-second timeout just for the auth step!
    )
    if status in (200, 201) and "token" in body:
        return body["token"]
    raise RuntimeError(f"Failed to obtain guest token: status={status}, body={body}")


def call_swipe_with_resilience(
    breaker: CircuitBreaker,
    token: str,
    movie_id: str,
    action: str,
    idempotency_key: str,
    simulate_fault_sequence: list[str | None] | None = None,
    client_id: str = "resilience-caller"
):
    """
    Calls POST /api/swipes with:
    1. Circuit Breaker check
    2. Per-attempt Timeout (1.5s)
    3. Limited Retry (max 2 retries) with Exponential Backoff (0.5s, 1.0s)
       Safe to retry because Idempotency-Key + deterministic (userId, movieId) upsert prevent duplicates.
    """
    breaker.before_call()

    attempt = 0
    while attempt <= MAX_RETRIES:
        fault_mode = None
        if simulate_fault_sequence and attempt < len(simulate_fault_sequence):
            fault_mode = simulate_fault_sequence[attempt]

        headers = {
            "Authorization": f"Bearer {token}",
            "Idempotency-Key": idempotency_key,
            "X-Client-Id": client_id,
            "X-Request-Id": str(uuid.uuid4())
        }
        if fault_mode:
            headers["X-Simulate-Fault"] = fault_mode

        attempt_num = attempt + 1
        print(f"  -> Attempt {attempt_num}/{MAX_RETRIES + 1} (Idempotency-Key={idempotency_key[:8]}..., fault={fault_mode or 'none'})")

        try:
            status, resp_headers, data = raw_http_request(
                "POST",
                "/api/swipes",
                headers=headers,
                body={"movieId": movie_id, "action": action},
                timeout=REQUEST_TIMEOUT_SEC
            )

            # Treat 5xx as transient server failures eligible for retry
            if status >= 500:
                raise RuntimeError(f"HTTP {status}: {data.get('detail', 'Server Error')}")

            # 2xx or 4xx (non-transient client error) completes without retry
            breaker.record_success()
            return status, resp_headers, data

        except Exception as exc:
            is_timeout = "timed out" in str(exc).lower()
            reason = f"Timeout (> {REQUEST_TIMEOUT_SEC}s)" if is_timeout else str(exc)
            print(f"     [!] Attempt {attempt_num} failed: {reason}")

            if attempt < MAX_RETRIES:
                backoff = INITIAL_BACKOFF_SEC * (2 ** attempt)
                print(f"     [~] Retrying in {backoff:.1f}s (safe due to Idempotency-Key)...")
                time.sleep(backoff)
                attempt += 1
            else:
                print(f"     [X] Exhausted all {MAX_RETRIES + 1} attempts.")
                breaker.record_failure()
                raise


def main():
    print("=" * 72)
    print("WATCHIT HTTP RESILIENCE & RATE-LIMIT CALLER (PART A)")
    print(f"Settings: Timeout={REQUEST_TIMEOUT_SEC}s | MaxRetries={MAX_RETRIES} | Backoff={INITIAL_BACKOFF_SEC}s*2^n")
    print(f"CircuitBreaker: FailureThreshold={FAILURE_THRESHOLD} | RecoveryPeriod={RECOVERY_TIMEOUT_SEC}s")
    print("=" * 72)

    token = get_guest_token()
    breaker = CircuitBreaker(failure_threshold=FAILURE_THRESHOLD, recovery_timeout=RECOVERY_TIMEOUT_SEC)

    # ── 1. Valid Request, Invalid Input, and Repeated Idempotent Request ─────
    print("\n[SCENARIO 1] Valid Request, Idempotent Repeat, and Invalid Input")
    idem_key = f"idem-{uuid.uuid4()}"
    unique_movie = f"movie-{int(time.time())}"

    status1, _, body1 = call_swipe_with_resilience(breaker, token, unique_movie, "Watched", idem_key)
    print(f"  1a) Valid New Swipe     -> HTTP {status1} | replay={body1.get('idempotent_replay')} | action={body1.get('swipe', {}).get('action')}")

    status2, _, body2 = call_swipe_with_resilience(breaker, token, unique_movie, "Watched", idem_key)
    print(f"  1b) Repeated Request    -> HTTP {status2} | replay={body2.get('idempotent_replay')} (No duplicate effect!)")

    status3, _, body3 = call_swipe_with_resilience(breaker, token, unique_movie, "InvalidActionName", f"idem-{uuid.uuid4()}")
    print(f"  1c) Invalid Input Test  -> HTTP {status3} | title={body3.get('title')} | detail={body3.get('detail')}")

    # ── 2. Transient Failure Retried & Succeeding ────────────────────────────
    print("\n[SCENARIO 2] Transient Failure (503 on Attempt 1 -> Retry with Backoff -> 200/201 on Attempt 2)")
    status4, _, body4 = call_swipe_with_resilience(
        breaker,
        token,
        "27205",
        "Watchlist",
        idempotency_key=f"idem-{uuid.uuid4()}",
        simulate_fault_sequence=["503", None]  # Fails 1st attempt, succeeds on 2nd attempt
    )
    print(f"  Result after retry -> HTTP {status4} | success={body4.get('success')}")

    # ── 3. Repeated Failures Tripping the Circuit Breaker (Timeout + 503) ────
    print("\n[SCENARIO 3] Repeated Failures -> Circuit Breaker Trips OPEN")
    fault_plans = [
        ["timeout", "timeout", "timeout"],  # Failure #1 (Timeout > 1.5s)
        ["503", "503", "503"],              # Failure #2 (Persistent 503)
        ["503", "503", "503"],              # Failure #3 (Persistent 503 -> Trips Breaker!)
    ]
    for idx, plan in enumerate(fault_plans, start=1):
        print(f"\n  --- Failing Call #{idx} ---")
        try:
            call_swipe_with_resilience(
                breaker,
                token,
                f"fail-movie-{idx}",
                "Pass",
                idempotency_key=f"idem-fail-{idx}",
                simulate_fault_sequence=plan,
                client_id=f"breaker-client-{idx}"  # Separate rate-limit bucket from demo 5
            )
        except Exception as e:
            print(f"  Call #{idx} final outcome: {e}")

    # ── 4. Calls Blocked While Circuit Breaker is OPEN, Then Recovery ────────
    print("\n[SCENARIO 4] Calls Blocked While Breaker is OPEN -> Cooldown -> Recovery")
    for blocked_idx in (1, 2):
        try:
            print(f"  Attempting call while breaker is {breaker.state}...")
            call_swipe_with_resilience(
                breaker, token, "27205", "Watched", idempotency_key=f"idem-blocked-{blocked_idx}"
            )
        except CircuitBreakerOpenError as cb_err:
            print(f"  [BLOCKED FAST] {cb_err}")

    print(f"\n  Waiting {RECOVERY_TIMEOUT_SEC + 0.2:.1f}s for Circuit Breaker recovery period...")
    time.sleep(RECOVERY_TIMEOUT_SEC + 0.2)

    status_rec, _, body_rec = call_swipe_with_resilience(
        breaker,
        token,
        "27205",
        "Watched",
        idempotency_key=f"idem-recovery-{uuid.uuid4()}",
        client_id="recovery-client"
    )
    print(f"  Recovered Call Outcome -> HTTP {status_rec} | Breaker State: {breaker.state}")

    # ── 5. Separate Rate Limiting Demonstration (8 req / 15s window) ─────────
    print("\n[SCENARIO 5] Separate Rate Limiting Demonstration (Limit: 8 requests per 15s window)")
    
    # 🏆 Fetch a BRAND NEW token so the server treats us as a fresh user
    # This guarantees our 15-second rate limit window starts exactly right now!
    fresh_token = get_guest_token()
    
    for i in range(1, 11):
        st, hdrs, bdy = raw_http_request(
            "POST",
            "/api/swipes",
            headers={
                "Authorization": f"Bearer {fresh_token}",
                "Idempotency-Key": f"rl-idem-{uuid.uuid4()}"
            },
            body={"movieId": f"rl-movie-{i}", "action": "Pass"}
        )
        
        rem = hdrs.get("X-RateLimit-Remaining", hdrs.get("x-ratelimit-remaining", "?"))
        retry_after = hdrs.get("Retry-After", hdrs.get("retry-after", "-"))
        
        if st == 429:
            print(f"  Request #{i:02d} -> HTTP {st} TOO MANY REQUESTS | Retry-After: {retry_after}s | detail: {bdy.get('detail')}")
        else:
            print(f"  Request #{i:02d} -> HTTP {st} ACCEPTED          | Remaining: {rem}")


if __name__ == "__main__":
    main()