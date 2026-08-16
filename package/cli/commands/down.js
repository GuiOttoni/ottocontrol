import chalk from "chalk";
import { readPid, isRunning, killProcess, clearPid } from "../lib/process-manager.js";

export function cmdDown() {
  const pid = readPid();
  if (!pid || !isRunning(pid)) {
    console.log(chalk.yellow("ottocontrol não está rodando."));
    clearPid();
    return;
  }

  killProcess(pid);
  clearPid();
  console.log(chalk.green("ottocontrol parado."));
}
