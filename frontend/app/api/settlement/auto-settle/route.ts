import { NextResponse } from "next/server";
import { execSync } from "child_process";
import path from "path";

const ROOT = path.resolve(process.cwd(), "..");

type AutoSettleRequest = {
  sessionId?: string;
  dryRun?: boolean;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as AutoSettleRequest;
    const sessionId = body.sessionId ?? "demo-session-001";
    const dryRun = body.dryRun !== false;

    const flags = dryRun ? "--dry-run" : "";
    const cmd = `set -a && source .env && set +a && npx tsx scripts/settlement/auto-settle.ts --session ${sessionId} ${flags} 2>&1`;

    const out = execSync(cmd, {
      cwd: ROOT,
      timeout: 60_000,
      encoding: "utf-8",
      shell: "/bin/zsh",
    });

    const profitMatch = out.match(/Net profit:\s*([\d.]+)\s*USDC/);
    const transferMatch = out.match(/Transfer.*?(\d[\d.]*)\s*USDC/i);
    const txMatch = out.match(/Transaction ID:\s*(\S+)/);
    const success = out.includes("Settlement complete") || out.includes("DRY-RUN");

    return NextResponse.json({
      ok: true,
      success,
      dryRun,
      sessionId,
      profit: profitMatch?.[1] ?? null,
      transferAmount: transferMatch?.[1] ?? null,
      transactionId: txMatch?.[1] ?? null,
      raw: out.slice(-1000),
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    return NextResponse.json(
      {
        ok: false,
        error: error.message,
        raw: typeof err === "object" && err !== null && "stdout" in err
          ? String((err as { stdout?: string; stderr?: string }).stdout ?? (err as { stderr?: string }).stderr ?? "").slice(-1000)
          : "",
      },
      { status: 500 },
    );
  }
}
