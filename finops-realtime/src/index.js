import express from 'express';
import http from 'http';
import cors from 'cors';
import { generateEvent, injectIncident } from './simulator.js';
import { insertEvent } from './db.js';
import { initWsServer, broadcastEvent } from './ws-server.js';
import { startAiPolling } from './ai-client.js';

const PORT = parseInt(process.env.PORT || '3000', 10);
const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.post('/simulator/inject-incident', (req, res) => {
  const { durationSeconds = 60, recoverySeconds = 30 } = req.body ?? {};
  injectIncident(Number(durationSeconds), Number(recoverySeconds));
  res.json({
    message: 'Incident mode activated',
    durationSeconds,
    recoverySeconds
  });
});

const server = http.createServer(app);

initWsServer(server);

startAiPolling();

function runSimulatorLoop() {
  const scheduleNext = () => {
    
    const delay = 1000 + Math.random() * 2000;
    setTimeout(async () => {
      try {
        const event = generateEvent();
        await insertEvent(event);
        broadcastEvent(event);
      } catch (err) {
        console.error('[simulator-loop] Error:', err);
        
      }
      scheduleNext();
    }, delay);
  };

  scheduleNext();
  console.log('[simulator-loop] Started — emitting events every 1-3s');
}

server.listen(PORT, () => {
  console.log(`[server] finops-realtime listening on port ${PORT}`);
  runSimulatorLoop();
});