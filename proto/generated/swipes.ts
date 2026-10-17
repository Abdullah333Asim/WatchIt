import type * as grpc from '@grpc/grpc-js';
import type { MessageTypeDefinition } from '@grpc/proto-loader';

import type { SwipeRequest as _watchit_swipes_v1_SwipeRequest, SwipeRequest__Output as _watchit_swipes_v1_SwipeRequest__Output } from './watchit/swipes/v1/SwipeRequest';
import type { SwipeResponse as _watchit_swipes_v1_SwipeResponse, SwipeResponse__Output as _watchit_swipes_v1_SwipeResponse__Output } from './watchit/swipes/v1/SwipeResponse';
import type { SwipeServiceClient as _watchit_swipes_v1_SwipeServiceClient, SwipeServiceDefinition as _watchit_swipes_v1_SwipeServiceDefinition } from './watchit/swipes/v1/SwipeService';

type SubtypeConstructor<Constructor extends new (...args: any) => any, Subtype> = {
  new(...args: ConstructorParameters<Constructor>): Subtype;
};

export interface ProtoGrpcType {
  watchit: {
    swipes: {
      v1: {
        SwipeRequest: MessageTypeDefinition<_watchit_swipes_v1_SwipeRequest, _watchit_swipes_v1_SwipeRequest__Output>
        SwipeResponse: MessageTypeDefinition<_watchit_swipes_v1_SwipeResponse, _watchit_swipes_v1_SwipeResponse__Output>
        SwipeService: SubtypeConstructor<typeof grpc.Client, _watchit_swipes_v1_SwipeServiceClient> & { service: _watchit_swipes_v1_SwipeServiceDefinition }
      }
    }
  }
}

