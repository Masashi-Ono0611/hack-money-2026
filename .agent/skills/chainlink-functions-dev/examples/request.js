// This script typically runs in a Hardhat/Foundry environment to simulate the request.
// It requires the @chainlink/functions-toolkit package.

const { simulateScript, decodeResult } = require("@chainlink/functions-toolkit");
const path = require("path");
const fs = require("fs");

async function main() {
  const source = fs.readFileSync(path.resolve(__dirname, "source.js")).toString();
  const args = ["1"]; // Fetch Luke Skywalker

  console.log("Simulating Chainlink Functions request...");

  const { responseBytesHexstring, errorString, capturedTerminalOutput } = await simulateScript({
    source: source,
    args: args,
    bytesArgs: [], // Bytes arguments - default empty
    secrets: {}, // Secrets - default empty
  });

  console.log("\nCaptured Terminal Output from Simulation:");
  console.log(capturedTerminalOutput);

  if (responseBytesHexstring) {
    console.log(
      `\nSimulation successful! Response: ${decodeResult(responseBytesHexstring, "string")}`
    );
  } else if (errorString) {
    console.log(`\nSimulation failed: ${errorString}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
