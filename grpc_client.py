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
    print("WATCHIT gRPC CLIENT TESTER (PART B)")
    print("=" * 60)

    # Open a persistent HTTP/2 channel to the gRPC server
    with grpc.insecure_channel('localhost:50051') as channel:
        stub = swipes_pb2_grpc.SwipeServiceStub(channel)
        
        # Test 1: Successful Request
        print("\n[TEST 1] Sending Valid Request")
        send_grpc_swipe(stub, movie_id=f"grpc-movie-{int(time.time())}", action="Watched", user_id="grpc-python-client")
        
        # Test 2: Invalid Input (Triggers grpc.status.INVALID_ARGUMENT)
        print("\n[TEST 2] Sending Invalid Input (Bad Action)")
        send_grpc_swipe(stub, movie_id="12345", action="SuperLike", user_id="grpc-python-client")

if __name__ == '__main__':
    main()