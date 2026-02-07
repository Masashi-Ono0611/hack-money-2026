import { NextResponse } from "next/server";
import { execSync } from "child_process";
import path from "path";

const ROOT = path.resolve(process.cwd(), "..");

export async function GET() {
  try {
    const out = execSync(
      'set -a && source .env && set +a && npx tsx scripts/settlement/test-yellow-connection.ts 2>&1',
      { cwd: ROOT, timeout: 30_000, encoding: "utf-8", shell: "/bin/zsh" },
    );

    const connected = out.includes("Connected to ClearNode");
    const authenticated = out.includes("Authenticated");

    const channelsMatch = out.match(/Channels:\s*(\d+)/);
    const channelCount = channelsMatch ? Number(channelsMatch[1]) : 0;

    const balanceLines = [...out.matchAll(/\s+(\S+):\s+(\S+)/g)];
    const balances: Record<string, string> = {};
    let capture = false;
    for (const line of out.split("\n")) {
      if (line.includes("Balances:")) { capture = true; continue; }
      if (capture) {
        const m = line.match(/^\s+(\S+):\s+(.+)$/);
        if (m) balances[m[1]] = m[2].trim();
        else capture = false;
      }
    }

    return NextResponse.json({
      ok: true,
      connected,
      authenticated,
      channelCount,
      balances,
      raw: out.slice(-500),
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message, raw: String(err.stdout ?? err.stderr ?? "").slice(-500) },
      { status: 500 },
    );
  }
}
