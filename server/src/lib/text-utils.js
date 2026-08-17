// Shared by the session parsers (sessions.js, copilot-sessions.js,
// gemini-sessions.js) to cap how much of a tool call/result/thinking block
// gets sent to the client — full payloads can be megabytes for large file
// reads or diffs.
export function truncate(str, max) {
  return str.length > max ? str.slice(0, max) + "\n… (truncado)" : str;
}
