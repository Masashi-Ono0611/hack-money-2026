export interface ChainPrice {
  chain: string;
  label: string;
  price: number | null;
  tick: number | null;
  utilization: number | null;
  fee: string | null;
  feeBps: number | null;
  error: string | null;
}

export interface PriceDataPoint {
  timestamp: number;
  priceA: number | null;
  priceB: number | null;
  spreadBps: number;
}
