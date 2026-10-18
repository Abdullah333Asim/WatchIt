import grpc
import uuid
import time
import swipes_pb2
import swipes_pb2_grpc

def send_grpc_swipe(stub: swipes_pb2_grpc.SwipeServiceStub, movie_id: str, action: str, user_id: str):
    """Executes a Unary gRPC call to the server with trace correlation metadata and a deadline."""
    request_id = f"trace-{uuid.uuid4()}"
    print(f"\n--- Sending gRPC Request (Trace ID: {request_id}) ---")
    print(f"Input Data: movieId='{movie_id}', action='{action}'")

    # 1. Build the Protobuf Request Object
    req = swipes_pb2.SwipeRequest(
        movie_id=movie_id,
        action=action,
        request_id=request_id,
        user_id=user_id
    )
    
    # 2. Attach metadata (simulating HTTP headers for trace correlation)
    metadata = (('x-request-id', request_id),)
    
    try:
        # 3. Execute the call with a 2.0-second Deadline (Timeout)
        response = stub.RecordSwipe(req, timeout=5.0, metadata=metadata)
        print("[SUCCESS] gRPC Call Completed!")
        print(f"  Movie ID: {response.movie_id}")
        print(f"  Action: {response.action}")
        print(f"  Idempotent Replay: {response.idempotent_replay}")
    
    except grpc.RpcError as e:
        print("[FAILED] gRPC Call Rejected!")
        print(f"  gRPC Status Code: {e.code()}")
        print(f"  Error Details: {e.details()}")

def main():
    print("=" * 60)
    print("WATCHIT gRPC TRAFFIC GENERATOR (PART C)")
    print("=" * 60)

    with grpc.insecure_channel('localhost:50051') as channel:
        stub = swipes_pb2_grpc.SwipeServiceStub(channel)
        
        # Loop 20 times to generate dense metrics for Grafana
        for i in range(1, 21):
            print(f"\n[LOOP {i}/20]")
            # 1. Valid Request -> gRPC OK (0)
            send_grpc_swipe(stub, movie_id=f"grpc-movie-{int(time.time())}-{i}", action="Watched", user_id="grpc-python-client")
            # 2. Invalid Request -> gRPC INVALID_ARGUMENT (3)
            send_grpc_swipe(stub, movie_id="12345", action="SuperLike", user_id="grpc-python-client")
            time.sleep(0.5)

if __name__ == '__main__':
    main()