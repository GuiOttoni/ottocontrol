import { useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import Modal from "./Modal";

type TerminalModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  provider: string;
  sessionId: string;
  cwd?: string | null;
};

const XTERM_THEME = {
  background: "#180f28",
  foreground: "#d9c2f0",
  cursor: "#a855f7",
  selectionBackground: "#452a5c",
  black: "#180f28",
  brightBlack: "#5c4278",
  red: "#f87171",
  brightRed: "#fca5a5",
  green: "#4ade80",
  brightGreen: "#86efac",
  yellow: "#ffb000",
  brightYellow: "#fcd34d",
  blue: "#60a5fa",
  brightBlue: "#93c5fd",
  magenta: "#a855f7",
  brightMagenta: "#c084fc",
  cyan: "#22d3ee",
  brightCyan: "#67e8f9",
  white: "#d9c2f0",
  brightWhite: "#f5ecff",
};

export default function TerminalModal({ open, onClose, title, subtitle, provider, sessionId, cwd }: TerminalModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!open || !containerRef.current) return;

    const term = new Terminal({
      theme: XTERM_THEME,
      fontFamily: '"JetBrains Mono", Consolas, "Courier New", monospace',
      fontSize: 13,
      cursorBlink: true,
      convertEol: true,
    });
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(containerRef.current);
    try {
      fitAddon.fit();
    } catch (err) {
      console.error("[TerminalModal] fitAddon.fit() failed", err);
    }
    termRef.current = term;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const params = new URLSearchParams({ provider, sessionId });
    if (cwd) params.set("cwd", cwd);
    const wsUrl = `${protocol}//${window.location.host}/ws/terminal?${params}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "resize", cols: term.cols, rows: term.rows }));
    };
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.type === "data") term.write(msg.data);
      else if (msg.type === "exit") {
        term.write(`\r\n\x1b[2m[sessão encerrada — código ${msg.code}]\x1b[0m\r\n`);
      }
    };
    ws.onerror = (ev) => {
      console.error("[TerminalModal] ws error", ev);
      term.write("\r\n\x1b[31mErro de conexão com o terminal.\x1b[0m\r\n");
    };

    const dataSub = term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "input", data }));
    });

    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit();
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "resize", cols: term.cols, rows: term.rows }));
      }
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      dataSub.dispose();
      resizeObserver.disconnect();
      ws.close();
      term.dispose();
      termRef.current = null;
      wsRef.current = null;
    };
  }, [open, provider, sessionId, cwd]);

  return (
    <Modal open={open} onClose={onClose} title={title} subtitle={subtitle} widthClass="max-w-4xl">
      <div className="p-3">
        <div ref={containerRef} className="h-[480px] w-full overflow-hidden rounded-md border border-border" />
      </div>
    </Modal>
  );
}
