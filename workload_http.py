import urllib.request
import time
import threading
import statistics
import json
import uuid
import urllib.error

URL = "http://localhost:8080/api/swipes"
AUTH_URL = "http://localhost:8080/api/auth/register"
RATE = 20       
DURATION = 15   

# 1. Grab a valid auth token first
print("Fetching guest auth token...")
try:
    auth_data = json.dumps({
        "username": f"loadtest_{uuid.uuid4().hex[:8]}",
        "password": "loadtest_password"
    }).encode('utf-8')
    
    auth_req = urllib.request.Request(
        AUTH_URL, 
        data=auth_data, 
        headers={'Content-Type': 'application/json'}, 
        method='POST'
    )
    with urllib.request.urlopen(auth_req) as response:
        token = json.loads(response.read().decode())['token']
        print("Token acquired! Starting load test...\n")
except urllib.error.HTTPError as e:
    print(f"Failed to get token: HTTP {e.code} - {e.read().decode('utf-8')}")
    exit(1)
except Exception as e:
    print(f"Failed to get token: {e}")
    exit(1)

latencies = []
successes = 0
failures = 0
error_codes = set() # To track EXACTLY why requests are failing

def send_request():
    global successes, failures
    req_id = str(uuid.uuid4())
    data = json.dumps({"movieId": "123", "action": "Watched"}).encode('utf-8')
    
    req = urllib.request.Request(URL, data=data, headers={
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {token}', # Added the token!
        'X-Client-Id': req_id, 
        'X-Request-Id': req_id
    }, method='POST')
    
    start_time = time.time()
    try:
        with urllib.request.urlopen(req, timeout=5) as response:
            response.read()
            successes += 1
    except urllib.error.HTTPError as e:
        failures += 1
        error_codes.add(f"HTTP {e.code}")
    except Exception as e:
        failures += 1
        error_codes.add(str(e))
    finally:
        latencies.append(time.time() - start_time)

start_test = time.time()

threads = []
for _ in range(RATE * DURATION):
    t = threading.Thread(target=send_request)
    t.start()
    threads.append(t)
    time.sleep(1.0 / RATE)

for t in threads:
    t.join()

actual_duration = time.time() - start_test
print("--- 📊 Part B Baseline Results ---")
print(f"Requests Sent: {len(latencies)}")
print(f"Successes: {successes} | Failures: {failures}")
print(f"Actual Rate: {len(latencies) / actual_duration:.2f} req/sec")

if error_codes:
    print(f"Errors encountered: {error_codes}")

if latencies:
    p95 = statistics.quantiles(latencies, n=100)[94] if len(latencies) >= 2 else max(latencies)
    print(f"Client p95 Latency: {p95:.3f} seconds")