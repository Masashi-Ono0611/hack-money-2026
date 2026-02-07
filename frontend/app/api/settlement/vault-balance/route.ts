import { NextResponse } from "next/server";
import { execSync } from "child_process";
import path from "path";

const ROOT = path.resolve(process.cwd(), "..");

export async function GET() {
  try {
    const out = execSync(
      'set -a && source .env && set +a && npx tsx scripts/settlement/check-vault-balance.ts 2>&1',
      { cwd: ROOT, timeout: 15_000, encoding: "utf-8", shell: "/bin/zsh" },
    );

    const balanceMatch = out.match(/Balance:\s*([\d.]+)\s*(\w+)/);
    const balance = balanceMatch ? balanceMatch[1] : null;
    const token = balanceMatch ? balanceMatch[2] : null;

    return NextResponse.json({
      ok: true,
      balance,
      token,
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
