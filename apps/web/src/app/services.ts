import { AIGateway } from '../ai/gateway';
import { firebaseConfigured } from '../ai/firebase';
import type { ModelPort } from '../ai/models';

/**
 * App-wide AI gateway. Firebase loads lazily on first model use. If this build
 * has no Firebase config, the gateway is null and every model task reports
 * unavailable (rules and manual review still work).
 */
let gateway: AIGateway | null | undefined;
let port: ModelPort | null = null;

export function getGateway(): AIGateway | null {
  if (gateway !== undefined) return gateway;
  if (!firebaseConfigured()) return (gateway = null);
  gateway = new AIGateway(() => {
    if (!port) throw new Error('Model port not ready');
    return port;
  });
  return gateway;
}

/** Loads the Firebase adapter (code-split) before the first model call. */
export async function ensureModelPort(): Promise<void> {
  if (port || !firebaseConfigured()) return;
  const { FirebaseModelPort } = await import('../ai/models');
  port = new FirebaseModelPort();
}
