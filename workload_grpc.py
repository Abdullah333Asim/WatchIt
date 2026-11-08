import grpc
import time
import threading
import statistics
import uuid
import swipes_pb2
import swipes_pb2_grpc

URL = 'localhost:8081'
RATE = 20               
DURATION = 15           

latencies = []
successes = 0
failures = 0
error_reasons = set()

def send_grpc_request(stub):
    global successes, failures
    req_id = str(uuid.uuid4())
    
    req = swipes_pb2.SwipeRequest(
        movie_id="123",
        action="Watched",
        request_id=req_id,
        user_id="baseline-test-user"
    )
    
    metadata = (('x-request-id', req_id),)
    start_time = time.time()
    try:
        stub.RecordSwipe(req, timeout=5.0, metadata=metadata)
        successes += 1
    except grpc.RpcError as e:
        failures += 1
        error_reasons.add(f"{e.code().name} - {e.details()}")
    except Exception as e:
        failures += 1
        error_reasons.add(str(e))
    finally:
        latencies.append(time.time() - start_time)

def main():
    print(f"🚀 Firing strictly at DIRECT CONTAINER ({URL})...")
    channel = grpc.insecure_channel(URL)
    stub = swipes_pb2_grpc.SwipeServiceStub(channel)
    
    start_test = time.time()
    threads = []
    
    for _ in range(RATE * DURATION):
        t = threading.Thread(target=send_grpc_request, args=(stub,))
        t.start()
        threads.append(t)
        time.sleep(1.0 / RATE)
        
    for t in threads:
        t.join()
        
    print("\n--- 📊 Part B & C gRPC Results ---")
    print(f"Requests Sent: {len(latencies)}")
    print(f"Successes: {successes} | Failures: {failures}")
    if error_reasons:
        print(f"\nErrors encountered: {error_reasons}")
    if latencies:
        p95 = statistics.quantiles(latencies, n=100)[94] if len(latencies) >= 2 else max(latencies)
        print(f"Client p95 Latency: {p95:.3f} seconds")

if __name__ == '__main__':
    main()