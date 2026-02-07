---
marp: true
theme: gaia
paginate: true
backgroundColor: "#0f172a"
color: "#f8fafc"
size: 16:9
html: true
header: ''
style: |
  /* Custom Palette */
  :root {
    --highlight: #38bdf8;
    --accent: #a855f7;
    --bg-dark: #0f172a;
    --card-bg: rgba(30, 41, 59, 0.85);
  }
  
  /* Global Resets */
  section {
    font-family: 'Inter', system-ui, sans-serif;
    letter-spacing: -0.01em;
    font-size: 28px;
    padding: 30px 50px;
  }
  
  h1, h2, h3 {
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 0.5em;
  }
  
  h1 {
    background: linear-gradient(135deg, var(--highlight), var(--accent));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    font-size: 2.5em;
  }
  
  strong {
    color: var(--highlight);
    font-weight: 700;
  }
  
  /* Tables */
  table {
    width: 100%;
    font-size: 0.8em;
    border-collapse: separate;
    border-spacing: 0 8px;
  }
  th, td {
    padding: 12px 20px;
    border: none;
    background: rgba(255, 255, 255, 0.05);
  }
  th {
    background: rgba(255, 255, 255, 0.1);
    color: var(--highlight);
    text-align: left;
    border-radius: 8px 8px 0 0;
  }
  tr td:first-child { border-radius: 8px 0 0 8px; }
  tr td:last-child { border-radius: 0 8px 8px 0; }
  
  /* Layouts */
  section.split {
    display: grid;
    grid-template-columns: 48% 48%;
    gap: 4%;
    align-items: center;
  }
  section.split-3 {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
    align-content: center;
  }
  
  /* Components */
  div.card {
    background: var(--card-bg);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 16px;
    padding: 1.5rem;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    height: 100%;
    box-sizing: border-box;
  }
  div.card h3 {
    margin-top: 0;
    color: var(--highlight);
    font-size: 1.1em;
    border-bottom: 1px solid rgba(255,255,255,0.1);
    padding-bottom: 0.5em;
  }

  /* Flowchart CSS (CSS only, no JS) */
  .flow-container {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 15px;
    margin-top: 2rem;
  }
  .flow-node {
    background: rgba(30, 41, 59, 0.95);
    border: 2px solid var(--highlight);
    border-radius: 12px;
    padding: 1rem;
    text-align: center;
    flex: 1;
    font-size: 0.85em;
    color: #fff;
    box-shadow: 0 4px 15px rgba(0,0,0,0.4);
    display: flex;
    flex-direction: column;
    justify-content: center;
    min-height: 120px;
  }
  .flow-arrow {
    font-size: 2em;
    color: var(--highlight);
    opacity: 0.8;
  }
  
  /* Utilities */
  .text-center { text-align: center; }
  .small { font-size: 0.75em; opacity: 0.8; font-weight: 400; display: block; margin-top: 0.5rem; }
  
  /* Vertical Center Class */
  section.vertical-center {
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

---

<!-- _class: lead -->

# Zombie L2 Clearinghouse
## Turning "Dead" Compute into Revenue

**ETH Global HackMoney 2026**
*Uniswap v4 × Yellow × Arc*

![bg opacity:0.3 blur:8px](https://images.unsplash.com/photo-1639322537228-f710d846310a?auto=format&fit=crop&w=1920&q=80)

---

<!-- _class: split -->

<div class="card">

### 💀 The Crisis
**"L2s are bleeding."**

*   **No Users** = Zero Revenue
*   **Fixed Costs** (Sequencers, Nodes) remain monthly
*   **Result**: Chains die before finding Product-Market Fit

</div>

<div class="card">

### 💎 The Opportunity
**"Idle Compute is an Asset."**

*   Low activity chains offer **Record Low Fees**
*   We tokenize this capacity into **Compute Tokens (CPT)**
*   We arbitrage it for stable profit

</div>

---

# <!-- fit --> The Solution: **Financialize L2 Compute**

## Zombie L2 Clearinghouse creates a market where:

1.  **L2s** mint idle capacity as **Compute Tokens (CPT)**.
2.  **Uniswap v4** prices CPT dynamically based on utilization.
3.  **Bots** arbitrage price gaps across chains via **Yellow**.
4.  **Profits** are settled in **USDC** via **Arc** to fund L2 ops.

> "Don't just scale Ethereum. **Survive.**"

---

<!-- _class: split-3 -->

<div class="card text-center">

### 1. Price
**Uniswap v4**
<br>
CPT / USDC Pools
<br><br>
<span class="small">Dynamic fees via Hooks adjust spread/fees based on L2 utilization signals.</span>

</div>

<div class="card text-center">

### 2. Execute
**Yellow Network**
<br>
State Channels
<br><br>
<span class="small">Gasless, high-frequency arbitrage sessions between liquidity pools.</span>

</div>

<div class="card text-center">

### 3. Settle
**Arc + Circle**
<br>
USDC Vaults
<br><br>
<span class="small">Real revenue settled in stablecoins to cover operational expenses.</span>

</div>

---

<!-- _class: vertical-center -->

## Token Flow Architecture

<div class="flow-container">
  
  <div class="flow-node">
    <strong>Supply & Demand</strong>
    <span class="small">L2 Operators (Mint)<br/>Traders (Speculate)</span>
  </div>

  <div class="flow-arrow">➜</div>

  <div class="flow-node" style="border-color: #ff007a;">
    <strong>Uniswap v4</strong>
    <span class="small">Pricing Pool<br/>(Discovery)</span>
  </div>

  <div class="flow-arrow">➜</div>

  <div class="flow-node" style="border-color: #facc15; color: #facc15;">
    <strong>Yellow</strong>
    <span class="small">Gasless Session<br/>(Execution)</span>
  </div>

  <div class="flow-arrow">➜</div>
  
  <div class="flow-node" style="border-color: #3b82f6;">
    <strong>Arc + Circle</strong>
    <span class="small">Settlement<br/>(Value Capture)</span>
  </div>
  
  <div class="flow-arrow">➜</div>

  <div class="flow-node">
    <strong>Vault</strong>
    <span class="small">Revenue<br/>(L2 Ops Fund)</span>
  </div>

</div>

---

<div class="card">

## Why Tokenize Compute?
**From "Cloud" to "Commodity"**

Just like oil or wheat, **blockspace** is a resource. <br/> Standardizing it as **CPT (1M Gas Units)** enables:

*   **For Devs**: Pre-purchase budget (Hedging)
*   **For Traders**: Short/Long congestion
*   **For L2s**: Monetize empty blocks immediately

</div>


---

## The Tech Stack (HackMoney Stack)

<div class="card">

| Component | Technology | Role |
| :--- | :--- | :--- |
| **Pricing** | **Uniswap v4 Hooks** | Adjusts spread/fees based on real-time chain utilization. |
| **Execution** | **Yellow SDK** | Off-chain "Sessions" for 1000x faster, gas-free arbitrage. |
| **Settlement** | **Arc + CCTP** | Cross-chain USDC finality to consolidate revenue. |
| **Targets** | **Base / WorldCoin** | Deploying CPT contracts on sepola testnets. |

</div>

---

<!-- _class: lead -->

## ⚡️ Demo Scenario

1.  **Base Sepolia** gets busy (High Usage) → **CPT ↑ Price Up**
2.  **WorldCoin** is empty (Low Usage) → **CPT ↓ Price Down**
3.  **Yellow Bot** detects gap & executes arb cycle
4.  **USDC Profit** lands in the Operator Vault

---

# Impact

<div class="card">

## For L2 Operators
*   **Immediate Revenue** from idle hardware.
*   Extends runway during "Zombie" phases.
*   Turns fixed costs into variable assets.

</div>

---

# Impact

<div class="card">

## For Ethereum
*   Prevents L2 centralization/death.
*   Creates a decentralized compute market.
*   **Values Diversity** over raw throughput.

</div>

---

<!-- _class: lead -->
<!-- _footer: "ETH Global HackMoney 2026" -->

# Thank You
