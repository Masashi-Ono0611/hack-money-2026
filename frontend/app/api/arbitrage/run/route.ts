import { NextResponse } from "next/server";
import { execSync } from "child_process";
import path from "path";

const ROOT = path.resolve(process.cwd(), "..");

export async function POST() {
  try {
    const cmd = `set -a && source .env && set +a && npx tsx scripts/demo/run-demo.ts 2>&1`;

    const out = execSync(cmd, {
      cwd: ROOT,
      timeout: 120_000,
      encoding: "utf-8",
      shell: "/bin/zsh",
    });

    const spreadMatch = out.match(/Spread:\s*([\d.]+)\s*bps/);
    const directionMatch = out.match(/Direction:\s*(\w+)/);
    const profitMatch = out.match(/Profit:\s*([-\d.]+)\s*USDC/);
    const sessionMatch = out.match(/Session:\s*([\w-]+)/);
    const txMatch = out.match(/Tx Hash:\s*(0x[\da-fA-F]+)/);
    const vaultBeforeMatch = out.match(/Vault before:\s*([\d.]+)/);
    const vaultAfterMatch = out.match(/Vault after:\s*([\d.]+)/);
    const priceAMatch = out.match(/Price:\s*\$([\d.]+)\s*USDC\/CPT/);
    const priceBMatch = out.match(
      /Price:\s*\$([\d.]+)\s*USDC\/CPT[\s\S]*?Price:\s*\$([\d.]+)\s*USDC\/CPT/,
    );

    const steps = [];

    // Parse steps from output
    const stepRegex =
      /Step (\d+): ([\w\s]+?)(?:\s*—\s*(.+?))?(?:\n|$)/g;
    let match;
    while ((match = stepRegex.exec(out)) !== null) {
      const stepNum = parseInt(match[1]);
      const label = match[2].trim();
      const detail = match[3]?.trim() ?? "";
      const line = out.substring(
        Math.max(0, match.index - 5),
        match.index + match[0].length,
      );
      const status = line.includes("✅")
        ? "done"
        : line.includes("❌")
          ? "failed"
          : "skipped";
      steps.push({ step: stepNum, label, status, detail });
    }

    const profit = profitMatch ? parseFloat(profitMatch[1]) : 0;

    return NextResponse.json({
      ok: true,
      steps,
      spreadBps: spreadMatch ? parseFloat(spreadMatch[1]) : null,
      direction: directionMatch?.[1] ?? null,
      profit,
      sessionId: sessionMatch?.[1] ?? null,
      txHash: txMatch?.[1] ?? null,
      vaultBefore: vaultBeforeMatch?.[1] ?? null,
      vaultAfter: vaultAfterMatch?.[1] ?? null,
      priceA: priceAMatch ? parseFloat(priceAMatch[1]) : null,
      priceB: priceBMatch ? parseFloat(priceBMatch[2]) : null,
      raw: out.slice(-2000),
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    const raw =
      typeof err === "object" && err !== null && "stdout" in err
        ? String(
            (err as { stdout?: string; stderr?: string }).stdout ??
              (err as { stderr?: string }).stderr ??
              "",
          ).slice(-2000)
        : "";
    return NextResponse.json(
      { ok: false, error: error.message, raw },
      { status: 500 },
    );
  }
}
