import { Router } from "express";
import { listClaudeSessions, summarizeUsageByDay, getSessionDetail } from "../lib/sessions.js";
import { listAllSessions, getSessionDetailFor, UNSUPPORTED_SESSION_SOURCES } from "../lib/sessions-aggregate.js";

const router = Router();

router.get("/claude", async (req, res) => {
  const sessions = await listClaudeSessions();
  res.json({ sessions, byDay: summarizeUsageByDay(sessions) });
});

router.get("/claude/:project/:sessionId", async (req, res) => {
  const detail = await getSessionDetail(req.params.project, req.params.sessionId);
  if (!detail) return res.status(404).json({ error: "session not found" });
  res.json(detail);
});

router.get("/all", async (req, res) => {
  const sessions = await listAllSessions();
  res.json({ sessions, unsupported: UNSUPPORTED_SESSION_SOURCES });
});

router.get("/detail", async (req, res) => {
  const { provider, dir, file } = req.query;
  if (!provider || !dir) return res.status(400).json({ error: "missing ?provider= or ?dir=" });
  const detail = await getSessionDetailFor(provider, { dir, file });
  if (!detail) return res.status(404).json({ error: "session not found" });
  res.json(detail);
});

export default router;
