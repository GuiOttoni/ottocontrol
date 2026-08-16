export type SystemInfo = {
  totalMemBytes: number;
  freeMemBytes: number;
  cpuCount: number;
  cpuModel: string | null;
  platform: string;
};

export type SelfUsage = { pid: number; rssBytes: number; heapUsedBytes: number };

export type ResourceCategory = {
  category: string;
  label: string;
  count: number;
  cpuPercent: number;
  memoryBytes: number;
};

export type ResourceProcess = {
  pid: number;
  name: string;
  category: string;
  commandLine: string | null;
  cpuPercent: number;
  memoryBytes: number;
};

export type DockerContainer = {
  id: string;
  name: string;
  cpuPercent: number;
  memUsage: string;
  memPercent: number;
};

export type ResourcesResponse = {
  system: SystemInfo;
  self: SelfUsage;
  categories: ResourceCategory[];
  processes: ResourceProcess[];
  docker: { available: boolean; containers: DockerContainer[] };
};

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}

export const apiResources = {
  get: () => fetch("/api/resources").then((r) => json<ResourcesResponse>(r)),
};
