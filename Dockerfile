FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# Expose HTTP, gRPC, and gRPC Metrics ports
EXPOSE 3000
EXPOSE 50051
EXPOSE 9091
# Start BOTH servers in the background
CMD ["npm", "run", "start:services"]