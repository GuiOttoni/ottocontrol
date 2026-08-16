#!/usr/bin/env node
import { Command } from "commander";
import { cmdUp } from "./commands/up.js";
import { cmdDown } from "./commands/down.js";
import { cmdStatus } from "./commands/status.js";

const program = new Command();

program
  .name("ottocontrol")
  .description("Central de controle local para desenvolvedores — instruções de agentes IA, projetos, sessões e monitor de recursos.")
  .version("0.1.0");

program
  .command("up")
  .description("Inicia o ottocontrol")
  .option("-p, --port <port>", "porta a usar (padrão 4310)")
  .action(async (options) => {
    await cmdUp(options);
  });

program
  .command("down")
  .description("Para o ottocontrol")
  .action(() => {
    cmdDown();
  });

program
  .command("status")
  .description("Exibe o status do ottocontrol")
  .option("-p, --port <port>", "porta a usar (padrão 4310)")
  .action((options) => {
    cmdStatus(options);
  });

program.parse();
