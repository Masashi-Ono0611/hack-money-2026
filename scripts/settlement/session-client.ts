import type { SessionResult } from './types.js';

// ---------------------------------------------------------------------------
// SessionClient – retrieves Yellow session results
//
// MVP: returns mock data. Replace with real Yellow SDK / API call when ready.
// ---------------------------------------------------------------------------

export class SessionClient {
  async getResult(sessionId: string): Promise<SessionResult> {
    // TODO: Replace with real Yellow SDK call:
    //   const session = await yellowSdk.getSession(sessionId);
    //   return { sessionId, ... };

    console.log(`[SessionClient] Fetching result for session: ${sessionId}`);

    // Mock: simulate a completed session with a small profit
    return {
      sessionId,
      chainA: 'base-sepolia',
      chainB: 'worldcoin-sepolia',
      netProfitUsdc: '3',
      timestamp: Date.now(),
      status: 'COMPLETED',
    };
  }
}
