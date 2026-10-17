// Original file: proto/swipes.proto

import type * as grpc from '@grpc/grpc-js'
import type { MethodDefinition } from '@grpc/proto-loader'
import type { SwipeRequest as _watchit_swipes_v1_SwipeRequest, SwipeRequest__Output as _watchit_swipes_v1_SwipeRequest__Output } from '../../../watchit/swipes/v1/SwipeRequest';
import type { SwipeResponse as _watchit_swipes_v1_SwipeResponse, SwipeResponse__Output as _watchit_swipes_v1_SwipeResponse__Output } from '../../../watchit/swipes/v1/SwipeResponse';

export interface SwipeServiceClient extends grpc.Client {
  RecordSwipe(argument: _watchit_swipes_v1_SwipeRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_watchit_swipes_v1_SwipeResponse__Output>): grpc.ClientUnaryCall;
  RecordSwipe(argument: _watchit_swipes_v1_SwipeRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_watchit_swipes_v1_SwipeResponse__Output>): grpc.ClientUnaryCall;
  RecordSwipe(argument: _watchit_swipes_v1_SwipeRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_watchit_swipes_v1_SwipeResponse__Output>): grpc.ClientUnaryCall;
  RecordSwipe(argument: _watchit_swipes_v1_SwipeRequest, callback: grpc.requestCallback<_watchit_swipes_v1_SwipeResponse__Output>): grpc.ClientUnaryCall;
  recordSwipe(argument: _watchit_swipes_v1_SwipeRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_watchit_swipes_v1_SwipeResponse__Output>): grpc.ClientUnaryCall;
  recordSwipe(argument: _watchit_swipes_v1_SwipeRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_watchit_swipes_v1_SwipeResponse__Output>): grpc.ClientUnaryCall;
  recordSwipe(argument: _watchit_swipes_v1_SwipeRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_watchit_swipes_v1_SwipeResponse__Output>): grpc.ClientUnaryCall;
  recordSwipe(argument: _watchit_swipes_v1_SwipeRequest, callback: grpc.requestCallback<_watchit_swipes_v1_SwipeResponse__Output>): grpc.ClientUnaryCall;
  
}

export interface SwipeServiceHandlers extends grpc.UntypedServiceImplementation {
  RecordSwipe: grpc.handleUnaryCall<_watchit_swipes_v1_SwipeRequest__Output, _watchit_swipes_v1_SwipeResponse>;
  
}

export interface SwipeServiceDefinition extends grpc.ServiceDefinition {
  RecordSwipe: MethodDefinition<_watchit_swipes_v1_SwipeRequest, _watchit_swipes_v1_SwipeResponse, _watchit_swipes_v1_SwipeRequest__Output, _watchit_swipes_v1_SwipeResponse__Output>
}
