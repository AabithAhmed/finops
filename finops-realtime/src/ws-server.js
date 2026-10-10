import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage, Server } from 'http';
import { getRecentEvents } from './db.js';

let wss;

export function initWsServer(httpServer) {
  wss = new WebSocketServer({ server: httpServer, path: '/ws/events' });

  wss.on('connection', async (ws, req) => {
    const clientAddr = req.socket.remoteAddress;
    console.log(`[ws] Client connected: ${clientAddr}`);

    
    
    try {
      const recent = await getRecentEvents(20);
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'INITIAL_EVENTS', events: recent }));
      }
    } catch (err) {
      console.error('[ws] Failed to send initial events:', err);
    }

    ws.on('close', () => {
      console.log(`[ws] Client disconnected: ${clientAddr}`);
    });

    ws.on('error', (err) => {
      console.error(`[ws] Client error from ${clientAddr}:`, err.message);
    });
  });

  wss.on('error', (err) => {
    console.error('[ws] Server error:', err);
  });

  console.log('[ws] WebSocket server ready at /ws/events');
}

export function broadcastEvent(event) {
  if (!wss) return;

  const message = JSON.stringify({ type: 'NEW_EVENT', event });
  let sent = 0;

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
      sent++;
    }
  });

  if (sent > 0) {
    console.debug(`[ws] Broadcast to ${sent} client(s)`);
  }
}