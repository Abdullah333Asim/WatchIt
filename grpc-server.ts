import 'dotenv/config';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';
import { db } from './src/db/index';
import { swipes, movies, users } from './src/db/schema';
import { eq, and } from 'drizzle-orm';
import { logger } from './server/logger';

const PROTO_PATH = path.join(process.cwd(), 'proto', 'swipes.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true, longs: String, enums: String, defaults: true, oneofs: true
});
const protoDescriptor = grpc.loadPackageDefinition(packageDefinition) as any;
const watchit = protoDescriptor.watchit.swipes.v1;

const recordSwipe: grpc.handleUnaryCall<any, any> = async (call, callback) => {
  const req = call.request;
  
  // 🏆 Trace Correlation: Extract request_id from gRPC metadata
  const md = call.metadata;
  const requestId = md.get('x-request-id')[0] as string || req.request_id || `grpc-${Date.now()}`;
  
  logger.info({
    message: `Incoming gRPC Unary call to RecordSwipe`,
    severity: 'info',
    request_id: requestId
  });

  const ALLOWED = ['Watched', 'Watchlist', 'Pass', 'Not Interested', 'Ignore'];
  if (!req.movie_id || !ALLOWED.includes(req.action)) {
    return callback({
      code: grpc.status.INVALID_ARGUMENT,
      details: `Field "action" must be one of: ${ALLOWED.join(', ')}`
    });
  }

  try {
    const now = new Date();
    
    if (process.env.DATABASE_URL) {
      // 1. Ensure user exists so foreign key constraint doesn't crash
      await db.insert(users).values({
        id: req.user_id,
        name: 'gRPC Client',
        email: 'grpc@watchit.local',
        bio: 'gRPC Tester',
        avatarUrl: '',
        tasteDna: '{}'
      }).onConflictDoNothing();

      // 2. Ensure movie exists
      await db.insert(movies).values({
        id: req.movie_id,
        title: `Movie #${req.movie_id}`,
        year: 2026,
        posterUrl: '',
        rating: 0
      }).onConflictDoNothing();

      const existing = (await db.select().from(swipes).where(and(eq(swipes.userId, req.user_id), eq(swipes.movieId, req.movie_id)))).at(0);
      if (existing && existing.action === req.action) {
         return callback(null, { success: true, movie_id: req.movie_id, action: req.action, idempotent_replay: true });
      }

      await db.insert(swipes).values({
         userId: req.user_id, movieId: req.movie_id, action: req.action, timestamp: now
      }).onConflictDoUpdate({
         target: [swipes.userId, swipes.movieId],
         set: { action: req.action, timestamp: now }
      });
    }

    callback(null, { success: true, movie_id: req.movie_id, action: req.action, idempotent_replay: false });

  } catch (error: any) {
     logger.error({ 
       message: "gRPC RecordSwipe error", 
       severity: 'error', 
       request_id: requestId, 
       error_detail: error.message 
     });
     callback({ 
       code: grpc.status.INTERNAL, 
       details: 'Internal server error while recording swipe.' 
     });
  }
};

function main() {
  const server = new grpc.Server();
  server.addService(watchit.SwipeService.service, { RecordSwipe: recordSwipe });
  server.bindAsync('0.0.0.0:50051', grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err) {
      console.error(err);
      return;
    }
    console.log(`gRPC server listening on http://0.0.0.0:${port}`);
  });
}

main();