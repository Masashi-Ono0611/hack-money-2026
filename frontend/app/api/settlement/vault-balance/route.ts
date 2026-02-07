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
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message, raw: String(err.stdout ?? err.stderr ?? "").slice(-500) },
      { status: 500 },
    );
  }
}
