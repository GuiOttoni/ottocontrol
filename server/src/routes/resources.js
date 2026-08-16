import { Router } from "express";
import { getProcessSnapshot, getSystemInfo, getSelfUsage, getDockerContainerStats } from "../lib/resource-monitor.js";

const router = Router();

router.get("/", async (req, res) => {
  const [snapshot, docker] = await Promise.all([getProcessSnapshot(), getDockerContainerStats()]);
  res.json({
    system: getSystemInfo(),
    self: getSelfUsage(),
    categories: snapshot.categories,
    processes: snapshot.processes,
    docker,
  });
});

export default router;
