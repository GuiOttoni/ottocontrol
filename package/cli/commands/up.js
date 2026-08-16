import chalk from "chalk";
import ora from "ora";
import open from "open";
import { readPid, isRunning, savePid, waitForPort, spawnServer } from "../lib/process-manager.js";

const DEFAULT_PORT = 4310;

export async function cmdUp(options) {
  const port = Number(options?.port) || Number(process.env.OTTOCONTROL_PORT) || DEFAULT_PORT;

  const existingPid = readPid();
  if (existingPid && isRunning(existingPid)) {
    console.log(chalk.yellow("ottocontrol já está rodando."));
    console.log(chalk.dim(`  Dashboard → http://localhost:${port}`));
    return;
  }

  const spinner = ora("Iniciando ottocontrol...").start();

  const proc = spawnServer(port);
  proc.unref();

  const ready = await waitForPort(port, 10_000);
  if (!ready) {
    spinner.fail("ottocontrol não iniciou a tempo.");
    proc.kill();
    process.exit(1);
  }

  savePid(proc.pid);
  spinner.succeed(chalk.green("ottocontrol está no ar!"));

  console.log();
  console.log(`  ${chalk.bold("Dashboard")}  →  ${chalk.cyan(`http://localhost:${port}`)}`);
  console.log();
  console.log(chalk.dim("  Para parar: ottocontrol down"));
  console.log();

  await open(`http://localhost:${port}`);
}
