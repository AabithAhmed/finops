import { useEffect, useRef, useState, useCallback } from 'react';


const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3000';








/**
 * Custom hook wrapping a WebSocket connection to Node.js /ws/events.
 *
 * Features:
 * - Auto-reconnect on drop with exponential backoff (Render free tier sleeps)
 * - Visible connection status ('reconnecting...') instead of silent failure
 * - On connect: receives INITIAL_EVENTS payload (last 20 events from DB)
 * - Then streams NEW_EVENT messages in real time
 * - Keeps a capped buffer of the last 50 events for the live feed
 */
export function useEventStream(maxEvents = 50) {
  const [events, setEvents] = useState([]);
  const [status, setStatus] = useState('connecting');
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const retryDelayRef = useRef(1000); // Start with 1s, doubles each retry

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setStatus('connecting');
    const ws = new WebSocket(`${WS_URL}/ws/events`);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus('connected');
      retryDelayRef.current = 1000; // Reset backoff on successful connect
    };

    ws.onmessage = (msg) => {
      try {
        const data = JSON.parse(msg.data);

        if (data.type === 'INITIAL_EVENTS') {
          // Replace current list with the history from DB
          setEvents(data.events.slice(0, maxEvents));
        } else if (data.type === 'NEW_EVENT') {
          // Prepend new event, keep buffer capped at maxEvents
          setEvents((prev) => [data.event, ...prev].slice(0, maxEvents));
        }
      } catch (e) {
        console.warn('[useEventStream] Failed to parse message:', e);
      }
    };

    ws.onclose = () => {
      setStatus('reconnecting');
      // Exponential backoff, capped at 30s
      const delay = Math.min(retryDelayRef.current, 30_000);
      retryDelayRef.current = delay * 2;
      reconnectTimeoutRef.current = setTimeout(connect, delay);
    };

    ws.onerror = () => {
      ws.close(); // triggers onclose which handles reconnect
    };
  }, [maxEvents]);

  useEffect(() => {
    connect();
    return () => {
      // Cleanup on unmount
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return { events, status };
}