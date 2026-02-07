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
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    return NextResponse.json(
      {
        ok: false,
        error: error.message,
        raw:
          typeof err === "object" && err !== null && "stdout" in err
            ? String((err as { stdout?: string; stderr?: string }).stdout ?? (err as { stderr?: string }).stderr ?? "").slice(-500)
            : "",
      },
      { status: 500 },
    );
  }
}
