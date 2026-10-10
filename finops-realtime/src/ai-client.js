import { getEventWindow } from './db.js';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8001';
const INTERVAL_MS = 5000; 

export function startAiPolling() {
  setInterval(async () => {
    try {
      const events = await getEventWindow(60);
      if (events.length === 0) return; 

      const response = await fetch(`${AI_SERVICE_URL}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events }),
        signal: AbortSignal.timeout(10_000) 
      });

      if (!response.ok) {
        console.warn(`[ai-client] /analyze returned ${response.status}`);
      } else {
        console.debug('[ai-client] Analysis complete');
      }
    } catch (err) {
      
      console.warn('[ai-client] Failed to reach AI service:', err?.message ?? err);
    }
  }, INTERVAL_MS);

  console.log(`[ai-client] Polling AI service at ${AI_SERVICE_URL}/analyze every ${INTERVAL_MS / 1000}s`);
}