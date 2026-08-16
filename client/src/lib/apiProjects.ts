export type ProjectType = "frontend" | "backend" | "fullstack" | "infra" | "unknown";

export type DetectedProject = {
  name: string;
  path: string;
  type: ProjectType;
  techHints: string[];
  hasGit: boolean;
  branch: string | null;
  remoteUrl: string | null;
};

export type ListProjectsResponse = {
  root: string;
  projects: DetectedProject[];
};

export type TreeNode = {
  name: string;
  type: "dir" | "file";
  children?: TreeNode[] | null;
};

export type Readme = { file: string; content: string } | null;

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}

export const apiProjects = {
  list: (root?: string) =>
    fetch(`/api/projects/list${root ? `?root=${encodeURIComponent(root)}` : ""}`).then((r) =>
      json<ListProjectsResponse>(r)
    ),

  tree: (path: string) =>
    fetch(`/api/projects/tree?path=${encodeURIComponent(path)}`).then((r) => json<{ tree: TreeNode[] }>(r)),

  readme: (path: string) =>
    fetch(`/api/projects/readme?path=${encodeURIComponent(path)}`).then((r) => json<{ readme: Readme }>(r)),

  openVSCode: (path: string) =>
    fetch("/api/projects/open-vscode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path }),
    }).then((r) => json<{ ok: boolean; error?: string }>(r)),

  openTerminal: (path: string) =>
    fetch("/api/projects/open-terminal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path }),
    }).then((r) => json<{ ok: boolean; error?: string }>(r)),
};
