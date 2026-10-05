import { EngineWsServer } from './ws-server';
import { SentinelService } from './services/sentinel';
import { ENV } from './config';

console.log(`[Engine] Starting Local Trading Daemon...`);
const wsServer = new EngineWsServer();
const sentinel = new SentinelService(wsServer);

sentinel.start();

console.log(`[Engine] WebSocket Server listening on ws://localhost:${ENV.PORT}`);

// Simulation loop for UI demonstration
setInterval(() => {
  wsServer.broadcastLog({
    timestamp: Date.now(),
    type: 'ALERT',
    message: `Simulation heartbeat slot ${Math.floor(Math.random() * 1000000)}`
  });
}, 15000);
