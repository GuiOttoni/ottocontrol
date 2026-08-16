import { Router } from "express";
import { readConfig, writeConfig, CONFIG_FILE } from "../lib/config.js";

const router = Router();

router.get("/", (req, res) => {
  res.json({ config: readConfig(), file: CONFIG_FILE });
});

router.put("/", (req, res) => {
  const partial = req.body ?? {};
  const next = writeConfig(partial);
  res.json({ ok: true, config: next });
});

export default router;
