import { Runner } from "@chainlink/cre-sdk";
import { initWorkflow } from "./httpTriggers";
import type { Config } from "./types";

export async function main() {
  const runner = await Runner.newRunner<Config>();
  await runner.run(initWorkflow);
}
