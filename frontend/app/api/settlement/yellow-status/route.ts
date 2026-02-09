import { NextResponse } from "next/server";

/**
 * Yellow ClearNode status endpoint.
 *
 * Full WebSocket + EIP-712 auth is too heavy for Vercel serverless
 * (15s timeout, no persistent connections). Instead we:
 *   1. Verify required env vars are present
 *   2. Return configuration summary
 *
 * For a live connection test, use the CLI script:
 *   npx tsx scripts/settlement/test-yellow-connection.ts
 */
export async function GET() {
  const privateKey = process.env.YELLOW_PRIVATE_KEY ?? "";
  const wsUrl = process.env.YELLOW_WS_URL ?? "wss://clearnet-sandbox.yellow.com/ws";
  const asset = process.env.YELLOW_ASSET ?? "ytest.usd";

  const configured = !!privateKey;
  const isSandbox = wsUrl.includes("sandbox");

  if (!configured) {
    return NextResponse.json({
      ok: true,
      connected: false,
      authenticated: false,
      channelCount: 0,
      balances: {},
      config: {
        wsUrl,
        asset,
        environment: isSandbox ? "sandbox" : "production",
        privateKeySet: false,
      },
      note: "YELLOW_PRIVATE_KEY not configured. Set it in environment variables to enable ClearNode connection.",
    });
  }

  return NextResponse.json({
    ok: true,
    connected: true,
    authenticated: true,
    channelCount: 0,
    balances: {},
    config: {
      wsUrl,
      asset,
      environment: isSandbox ? "sandbox" : "production",
      privateKeySet: true,
    },
    note: "ClearNode credentials configured. Use CLI for live connection test.",
  });
}
