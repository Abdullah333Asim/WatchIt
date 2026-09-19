import winston from 'winston';

export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({ alias: 'time' }), // Fulfills "time" requirement
    winston.format.json()
  ),
  defaultMeta: { service_name: 'watchit-backend' }, // Fulfills "service" requirement
  transports: [
    // Writes all logs to the folder Filebeat is watching
    new winston.transports.File({ filename: 'logs/app.log' }),
    // Also prints to your terminal so you can see them while coding
    new winston.transports.Console() 
  ],
});