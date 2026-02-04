# Tech Stack Recommendations for Speed & Impact

In a hackathon, **Setup Time is Technical Debt**. Choose tools that work out of the box.

## 1. The Scaffold (Choose One)
*   **Scaffold-ETH 2**: *Highly Recommended*. Comes with RainbowKit, Wagmi, Viem, Next.js, and Hardhat/Foundry. Best for "general" EVM projects.
    *   `npx create-eth@latest`
*   **Move Scaffold (for Sui)**: If targeting Sui.
    *   `Sui Move` + `Mysten Typescript SDK`.

## 2. Frontend & Design
*   **V0.dev / Antigravity**: Use AI to generate the initial components. Don't hand-code CSS buttons.
*   **Shadcn/UI**: Clean, accessible components.
*   **Framer Motion**: *Essential* for the "Wow" factor. Add simple entrance animations (`<motion.div initial={{opacity:0}} animate={{opacity:1}} ...>`) to everything.

## 3. Smart Contracts & Interaction
*   **Wagmi / Viem**: Standard for EVM frontend interaction.
*   **Foundry**: For EVM development (Solidity). Faster tests/deploy than Hardhat.
*   **Uniswap v4 Templates**: Use the official Uniswap v4 template repo to start. Do not write a hook from scratch without the template.

## 4. Sponsor Specific SDKs
*   **LI.FI**: Use their Widget for the easiest integration if "UI" is the focus. Use SDK if "Agent" is the focus.
*   **Yellow**: Check their specific docs for the "Yellow SDK" and "Nitrolite" testnet connection.
*   **Circle (Arc)**: Use the Programmable Wallets SDK for "Agent" use cases (server-side signing).

## 5. Development Strategy
1.  **Day 1 (Night)**: Hello World on all Sponsor chains. Get the tokens (faucets are often broken/slow, do this FIRST). Deploy a blank contract.
2.  **Day 2 (Morning)**: Core Logic / Smart Contracts.
3.  **Day 2 (Afternoon)**: Frontend integration.
4.  **Day 2 (Night)**: Polish & "Happy Path" dummy data.
5.  **Day 3 (Morning)**: Video recording & Submission page.
