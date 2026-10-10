import { v4 as uuidv4 } from 'uuid';

let mode = {
  incident: false,
  startedAt: 0,
  durationMs: 0,
  recoveryMs: 30_000
};

export function injectIncident(durationSeconds = 60, recoverySeconds = 30) {
  mode = {
    incident: true,
    startedAt: Date.now(),
    durationMs: durationSeconds * 1000,
    recoveryMs: recoverySeconds * 1000
  };
  console.log(`[simulator] Incident mode ON for ${durationSeconds}s (recovery ${recoverySeconds}s)`);
}

function getProfile() {
  if (!mode.incident) {
    return { failureRate: 0.02, minLatency: 100, maxLatency: 400 };
  }

  const elapsed = Date.now() - mode.startedAt;

  if (elapsed < mode.durationMs) {
    
    return { failureRate: 0.5, minLatency: 3000, maxLatency: 9000 };
  }

  const recovery = elapsed - mode.durationMs;
  if (recovery >= mode.recoveryMs) {
    
    mode.incident = false;
    console.log('[simulator] Incident mode ended, back to normal');
    return { failureRate: 0.02, minLatency: 100, maxLatency: 400 };
  }

  
  const t = recovery / mode.recoveryMs; 
  const failureRate = 0.5 * (1 - t) + 0.02 * t;
  const minLatency = Math.round(3000 * (1 - t) + 100 * t);
  const maxLatency = Math.round(9000 * (1 - t) + 400 * t);
  return { failureRate, minLatency, maxLatency };
}

export function generateEvent() {
  const profile = getProfile();
  const rand = Math.random();

  let eventType;
  if (rand < profile.failureRate * 0.7) {
    eventType = 'PAYMENT_FAILED';
  } else if (rand < profile.failureRate) {
    eventType = 'PAYMENT_TIMEOUT';
  } else {
    eventType = 'PAYMENT_SUCCESS';
  }

  const latencyMs = Math.round(
    profile.minLatency + Math.random() * (profile.maxLatency - profile.minLatency)
  );

  return {
    eventId: uuidv4(),
    eventType,
    paymentId: `PAY-${uuidv4().slice(0, 8).toUpperCase()}`,
    amount: parseFloat((Math.random() * 9900 + 100).toFixed(2)),
    currency: 'INR',
    gateway: Math.random() < 0.5 ? 'stripe_simulated' : 'razorpay_simulated',
    latencyMs,
    occurredAt: new Date().toISOString()
  };
}

export { mode };