import { NextResponse } from "next/server";

const CIRCLE_API = "https://api.circle.com/v1/w3s";

export async function GET() {
  const apiKey = process.env.ARC_API_KEY ?? "";
  const walletId = process.env.ARC_WALLET_ID_OPERATOR_VAULT ?? "";

  if (!apiKey || !walletId) {
    return NextResponse.json(
      {
        ok: false,
        error: "Missing ARC_API_KEY or ARC_WALLET_ID_OPERATOR_VAULT env var",
      },
      { status: 500 },
    );
  }

  try {
    const res = await fetch(`${CIRCLE_API}/wallets/${walletId}/balances`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      // Revalidate every request (no caching in serverless)
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { ok: false, error: `Circle API ${res.status}: ${text.slice(0, 300)}` },
        { status: 502 },
      );
    }

    const json = (await res.json()) as {
      data?: { tokenBalances?: { token: { symbol: string }; amount: string }[] };
    };

    const balances = json.data?.tokenBalances ?? [];
    const usdc = balances.find((b) => b.token.symbol === "USDC");
    const balance = usdc?.amount ?? null;

    return NextResponse.json({
      ok: true,
      balance,
      token: balance ? "USDC" : null,
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 },
    );
  }
}
