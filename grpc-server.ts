import 'dotenv/config';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';
import express from 'express';
import client from 'prom-client';
import { db } from './src/db/index';
import { swipes, movies, users } from './src/db/schema';
import { eq, and } from 'drizzle-orm';
import { logger } from './server/logger';

// ─── Prometheus Metrics Setup (Part C) ──────────────────────────────────────
const grpcCallsTotal = new client.Counter({
  name: 'watchit_grpc_calls_total',
  help: 'Total gRPC calls by method and status',
  labelNames: ['method', 'status']
});

const grpcDuration = new client.Histogram({
  name: 'watchit_grpc_duration_seconds',
  help: 'gRPC call duration in seconds (measured at the server)',
  labelNames: ['method'],
  buckets: [0.1, 0.5, 1, 2, 3, 5, 8, 10, 15]
});

const grpcInflight = new client.Gauge({
  name: 'watchit_grpc_inflight_requests',
  help: 'Currently active gRPC calls',
  labelNames: ['method']
});

// Expose the metrics via a lightweight Express server on port 9091
const metricsApp = express();
metricsApp.get('/metrics', async (_req, res) => {
  res.setHeader('Content-Type', client.register.contentType);
  res.send(await client.register.metrics());
});
metricsApp.listen(9091, '0.0.0.0', () => {
  console.log(`gRPC Metrics endpoint listening on http://0.0.0.0:9091/metrics`);
});
// ────────────────────────────────────────────────────────────────────────────

const PROTO_PATH = path.join(process.cwd(), 'proto', 'swipes.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true, longs: String, enums: String, defaults: true, oneofs: true
});
const protoDescriptor = grpc.loadPackageDefinition(packageDefinition) as any;
const watchit = protoDescriptor.watchit.swipes.v1;

const recordSwipe: grpc.handleUnaryCall<any, any> = async (call, callback) => {
  const req = call.request;
  const md = call.metadata;
  const requestId = md.get('x-request-id')[0] as string || req.request_id || `grpc-${Date.now()}`;
  
  // 🏆 Start Metrics Tracking
  grpcInflight.labels('RecordSwipe').inc();
  const endTimer = grpcDuration.labels('RecordSwipe').startTimer();

  logger.info({
    message: `Incoming gRPC Unary call to RecordSwipe`,
    severity: 'info',
    request_id: requestId,
    service_name: 'watchit-grpc-server'
  });

  const ALLOWED = ['Watched', 'Watchlist', 'Pass', 'Not Interested', 'Ignore'];
  if (!req.movie_id || !ALLOWED.includes(req.action)) {
    endTimer();
    grpcInflight.labels('RecordSwipe').dec();
    grpcCallsTotal.labels('RecordSwipe', 'INVALID_ARGUMENT').inc();
    
    return callback({
      code: grpc.status.INVALID_ARGUMENT,
      details: `Field "action" must be one of: ${ALLOWED.join(', ')}`
    });
  }

  try {
    const now = new Date();
    if (process.env.DATABASE_URL) {
      await db.insert(users).values({
        id: req.user_id, name: 'gRPC Client', email: 'grpc@watchit.local', bio: 'gRPC Tester', avatarUrl: '', tasteDna: '{}'
      }).onConflictDoNothing();

      await db.insert(movies).values({
        id: req.movie_id, title: `Movie #${req.movie_id}`, year: 2026, posterUrl: '', rating: 0
      }).onConflictDoNothing();

      const existing = (await db.select().from(swipes).where(and(eq(swipes.userId, req.user_id), eq(swipes.movieId, req.movie_id)))).at(0);
      if (existing && existing.action === req.action) {
         endTimer();
         grpcInflight.labels('RecordSwipe').dec();
         grpcCallsTotal.labels('RecordSwipe', 'OK').inc();
         return callback(null, { success: true, movie_id: req.movie_id, action: req.action, idempotent_replay: true });
      }

      await db.insert(swipes).values({
         userId: req.user_id, movieId: req.movie_id, action: req.action, timestamp: now
      }).onConflictDoUpdate({
         target: [swipes.userId, swipes.movieId],
         set: { action: req.action, timestamp: now }
      });
    }

    endTimer();
    grpcInflight.labels('RecordSwipe').dec();
    grpcCallsTotal.labels('RecordSwipe', 'OK').inc();
    callback(null, { success: true, movie_id: req.movie_id, action: req.action, idempotent_replay: false });

  } catch (error: any) {
     endTimer();
     grpcInflight.labels('RecordSwipe').dec();
     grpcCallsTotal.labels('RecordSwipe', 'INTERNAL').inc();
     
     logger.error({ 
       message: "gRPC RecordSwipe error", 
       severity: 'error', 
       request_id: requestId, 
       error_detail: error.message 
     });
     callback({ code: grpc.status.INTERNAL, details: 'Internal server error while recording swipe.' });
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