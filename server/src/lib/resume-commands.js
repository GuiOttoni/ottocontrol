// Only allow safe identifiers through into a shell command string —
// session IDs are attacker-controllable in theory (they come from a
// WebSocket query param), so this is the injection guard.
const SAFE_ID = /^[a-zA-Z0-9._-]+$/;

const SHELL = process.platform === "win32" ? "powershell.exe" : "bash";

function shellArgs(command) {
  return process.platform === "win32"
    ? ["-NoExit", "-Command", command]
    : ["-lc", `${command}; exec bash`];
}

// Builds the { file, args } to hand to node-pty for resuming a session in
// its own CLI, plus an optional `note` shown in the terminal first (e.g.
// when the provider can't resume by our stored session ID).
export function buildResumeCommand(provider, sessionId) {
  if (!SAFE_ID.test(sessionId ?? "")) {
    return { file: SHELL, args: shellArgs(""), note: "ID de sessão inválido." };
  }

  if (provider === "claude") {
    return { file: SHELL, args: shellArgs(`claude --resume ${sessionId}`) };
  }
  if (provider === "copilot") {
    return { file: SHELL, args: shellArgs(`copilot --resume=${sessionId}`) };
  }
  if (provider === "gemini") {
    // Gemini CLI's --resume only accepts "latest" or a numeric index, not
    // a session ID — there's no reliable way to map our ID to its index,
    // so we open a fresh session in the same project and let the user
    // resume from Gemini's own picker if they want to.
    return {
      file: SHELL,
      args: shellArgs("gemini"),
      note: 'Gemini CLI não retoma por ID de sessão diretamente — abrindo uma nova sessão neste projeto. Use "/chat resume" dentro do Gemini se quiser escolher uma sessão anterior.',
    };
  }

  return { file: SHELL, args: shellArgs(""), note: `Retomar sessão não é suportado para "${provider}".` };
}
