import { NextResponse } from "next/server";
import {
  getBalance,
  getWalletAddress,
  transfer,
  waitForTransaction,
} from "@/lib/arc-api";

type AutoSettleRequest = {
  sessionId?: string;
  dryRun?: boolean;
  profitUsdc?: number;
};

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as AutoSettleRequest;
  const sessionId = body.sessionId ?? "demo-session-001";
  const dryRun = body.dryRun === true;
  const profitUsdc = body.profitUsdc ?? 3; // default mock profit

  const sourceWalletId = process.env.ARC_WALLET_ID_SOURCE ?? "";
  const vaultWalletId = process.env.ARC_WALLET_ID_OPERATOR_VAULT ?? "";
  const tokenSymbol = "USDC";

  if (!sourceWalletId || !vaultWalletId) {
    return NextResponse.json(
      { ok: false, error: "Missing ARC_WALLET_ID_SOURCE or ARC_WALLET_ID_OPERATOR_VAULT" },
      { status: 500 },
    );
  }

  try {
    // 1. Check source wallet balance
    const sourceBalances = await getBalance(sourceWalletId);
    const usdcToken = sourceBalances.find((b) => b.token.symbol === tokenSymbol);

    if (!usdcToken) {
      return NextResponse.json({
        ok: true, success: false, dryRun, sessionId,
        profit: String(profitUsdc), transferAmount: null, transactionId: null,
        error: `${tokenSymbol} not found in source wallet`,
      });
    }

    const available = parseFloat(usdcToken.amount);
    const settleAmount = Math.min(profitUsdc, available);

    if (settleAmount <= 0) {
      return NextResponse.json({
        ok: true, success: false, dryRun, sessionId,
        profit: String(profitUsdc), transferAmount: null, transactionId: null,
        error: `Insufficient balance: available=${available}`,
      });
    }

    // 2. Vault balance before
    const vaultBefore = await getBalance(vaultWalletId);
    const vaultUsdcBefore = vaultBefore.find((b) => b.token.symbol === tokenSymbol)?.amount ?? "0";

    // 3. Resolve vault address
    const vaultAddress = await getWalletAddress(vaultWalletId);

    // 4. Dry-run guard
    if (dryRun) {
      return NextResponse.json({
        ok: true, success: true, dryRun: true, sessionId,
        profit: String(profitUsdc),
        transferAmount: String(settleAmount),
        transactionId: null,
        vaultBalanceBefore: vaultUsdcBefore,
        vaultAddress,
      });
    }

    // 5. Execute transfer
    const initResult = await transfer({
      tokenId: usdcToken.token.id,
      amount: String(settleAmount),
      destinationAddress: vaultAddress,
    });

    if (!initResult.success || !initResult.transactionId) {
      return NextResponse.json({
        ok: true, success: false, dryRun, sessionId,
        profit: String(profitUsdc), transferAmount: String(settleAmount),
        transactionId: null, error: `Transfer failed: ${initResult.error}`,
      });
    }

    // 6. Wait for confirmation
    const finalResult = await waitForTransaction(initResult.transactionId);

    // 7. Vault balance after
    const vaultAfter = await getBalance(vaultWalletId);
    const vaultUsdcAfter = vaultAfter.find((b) => b.token.symbol === tokenSymbol)?.amount ?? "0";

    return NextResponse.json({
      ok: true,
      success: finalResult.success,
      dryRun: false,
      sessionId,
      profit: String(profitUsdc),
      transferAmount: String(settleAmount),
      transactionId: finalResult.txHash ?? initResult.transactionId,
      vaultBalanceBefore: vaultUsdcBefore,
      vaultBalanceAfter: vaultUsdcAfter,
      error: finalResult.success ? undefined : finalResult.error,
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 },
    );
  }
}
