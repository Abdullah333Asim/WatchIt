import 'dotenv/config';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';
import express from 'express';
import client from 'prom-client';
import { logger } from './server/logger';

client.register.setDefaultLabels({ replica_id: process.env.REPLICA_ID || 'A' });

const grpcCallsTotal = new client.Counter({
  name: 'watchit_grpc_calls_total',
  help: 'Total gRPC calls',
  labelNames: ['method', 'status']
});
const grpcDuration = new client.Histogram({
  name: 'watchit_grpc_duration_seconds',
  help: 'gRPC call duration',
  labelNames: ['method'],
  buckets: [0.1, 0.5, 1, 2, 3, 5]
});
const grpcInflight = new client.Gauge({
  name: 'watchit_grpc_inflight_requests',
  help: 'Active gRPC calls',
  labelNames: ['method']
});

const metricsApp = express();
metricsApp.get('/metrics', async (_req, res) => {
  res.setHeader('Content-Type', client.register.contentType);
  res.send(await client.register.metrics());
});
metricsApp.listen(9091, '0.0.0.0');

const PROTO_PATH = path.join(process.cwd(), 'proto', 'swipes.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true, longs: String, enums: String, defaults: true, oneofs: true
});
const watchit = (grpc.loadPackageDefinition(packageDefinition) as any).watchit.swipes.v1;

const recordSwipe: grpc.handleUnaryCall<any, any> = (call, callback) => {
  grpcInflight.labels('RecordSwipe').inc();
  const endTimer = grpcDuration.labels('RecordSwipe').startTimer();
  
  try {
    logger.info({
      message: `Incoming gRPC call`,
      severity: 'info',
      request_id: call.metadata.get('x-request-id')[0] || `grpc-${Date.now()}`,
      service_name: 'watchit-backend',
      replica_id: process.env.REPLICA_ID || 'A'
    });
  } catch (e) {}

  setTimeout(() => {
    endTimer();
    grpcInflight.labels('RecordSwipe').dec();
    grpcCallsTotal.labels('RecordSwipe', 'OK').inc();
    callback(null, { 
        success: true, 
        movie_id: call.request?.movie_id || "123", 
        action: call.request?.action || "Watched", 
        idempotent_replay: false 
    });
  }, 15); //process.env.REPLICA_ID === 'B' ? 500 : 15
};

function main() {
  const server = new grpc.Server();
  server.addService(watchit.SwipeService.service, { RecordSwipe: recordSwipe });
  server.bindAsync('0.0.0.0:50051', grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err) {
      console.error(err);
      return;
    }
    server.start(); 
    console.log(`🚀 gRPC Server ACTUALLY processing requests on port ${port}`);
  });
}
main();