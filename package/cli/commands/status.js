import chalk from "chalk";
import { readPid, isRunning } from "../lib/process-manager.js";

const DEFAULT_PORT = 4310;

export function cmdStatus(options) {
  const port = Number(options?.port) || Number(process.env.OTTOCONTROL_PORT) || DEFAULT_PORT;
  const pid = readPid();

  console.log();
  console.log(chalk.bold("ottocontrol status"));
  console.log();

  if (pid && isRunning(pid)) {
    console.log(`  ${chalk.green("●")} rodando  →  http://localhost:${port}  (PID ${pid})`);
  } else {
    console.log(`  ${chalk.red("●")} parado`);
  }
  console.log();
}
