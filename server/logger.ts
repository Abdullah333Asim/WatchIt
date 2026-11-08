import winston from 'winston';

// Grab the REPLICA_ID from the environment variables (defaults to 'local-dev' if not set)
const replicaId = process.env.REPLICA_ID || 'local-dev';

export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({ alias: 'time' }), // Fulfills "time" requirement
    winston.format.json()
  ),
  // Add the replica_id to EVERY log message automatically
  defaultMeta: { 
    service_name: 'watchit-backend',
    replica_id: replicaId 
  }, 
  transports: [
    // Writes all logs to the folder Filebeat is watching
    new winston.transports.File({ filename: 'logs/app.log' }),
    // Also prints to your terminal so you can see them while coding
    new winston.transports.Console() 
  ],
});