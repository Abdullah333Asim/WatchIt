const { spawn } = require('child_process');

console.log('🚀 Starting WatchIt Services natively...');

const httpProcess = spawn('npx', ['tsx', 'app.ts'], { stdio: 'inherit' });
const grpcProcess = spawn('npx', ['tsx', 'grpc-server.ts'], { stdio: 'inherit' });

httpProcess.on('close', (code) => console.log(`HTTP server exited with code ${code}`));
grpcProcess.on('close', (code) => console.log(`gRPC server exited with code ${code}`));