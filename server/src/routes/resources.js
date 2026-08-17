import { Router } from "express";
import { getProcessSnapshot, getSystemInfo, getSelfUsage, getDockerContainerStats } from "../lib/resource-monitor.js";
import { asyncRoute } from "../lib/async-handler.js";

const router = Router();

router.get(
  "/",
  asyncRoute(async (req, res) => {
    const [snapshot, docker] = await Promise.all([getProcessSnapshot(), getDockerContainerStats()]);
    res.json({
      system: getSystemInfo(),
      self: getSelfUsage(),
      categories: snapshot.categories,
      processes: snapshot.processes,
      docker,
    });
  })
);

export default router;
