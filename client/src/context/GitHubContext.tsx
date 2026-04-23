import { createContext, useContext, useState, useEffect } from "react";

type GitHubContextType = {
  username: string | null;
  token: string | null;
  isConnected: boolean;
  repos: any[];
  fetchRepos: () => Promise<void>;
  connect: (username: string, token: string) => void;
  disconnect: () => void;
  exportToGitHub: (repoName: string, files: { path: string; content: string }[]) => Promise<{ success: boolean; url?: string; message?: string }>;
  importFromGitHub: (repoUrl: string) => Promise<{ success: boolean; files?: { path: string; content: string }[]; message?: string }>;
  modalOpen: boolean;
  setModalOpen: (open: boolean) => void;
};

const GitHubContext = createContext<GitHubContextType | null>(null);

export const GitHubProvider = ({ children }: { children: React.ReactNode }) => {
  const [username, setUsername] = useState<string | null>(localStorage.getItem("gh_username"));
  const [token, setToken] = useState<string | null>(localStorage.getItem("gh_token"));
  const [repos, setRepos] = useState<any[]>([]);
  const [modalOpen, setModalOpen] = useState(false);

  const isConnected = !!(username && token);

  const fetchRepos = async () => {
    if (!token) return;
    try {
      const response = await fetch("https://api.github.com/user/repos?sort=updated&per_page=100", {
        headers: { Authorization: `token ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setRepos(data);
      }
    } catch (err) {
      console.error("Failed to fetch repos", err);
    }
  };

  useEffect(() => {
    if (isConnected) fetchRepos();
  }, [isConnected]);

  const connect = (user: string, tok: string) => {
    localStorage.setItem("gh_username", user);
    localStorage.setItem("gh_token", tok);
    setUsername(user);
    setToken(tok);
  };

  const disconnect = () => {
    localStorage.removeItem("gh_username");
    localStorage.removeItem("gh_token");
    setUsername(null);
    setToken(null);
  };

  const exportToGitHub = async (repoName: string, files: { path: string; content: string }[]) => {
    if (!token || !username) return { success: false, message: "Not connected to GitHub" };

    try {
      // 1. Create repo if it doesn't exist (simplification: assume we create it or it exists)
      // For a robust implementation, we use the GitHub API to check and create.
      
      // We'll use the "create or update file contents" API one by one for simplicity, 
      // or a more advanced Git tree API for multiple files.
      // Let's use the simple one-by-one approach for now.

      // Check if repo exists
      const repoCheck = await fetch(`https://api.github.com/repos/${username}/${repoName}`, {
        headers: { Authorization: `token ${token}` },
      });

      if (!repoCheck.ok) {
        // Create repo
        const createRepo = await fetch(`https://api.github.com/user/repos`, {
          method: "POST",
          headers: {
            Authorization: `token ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name: repoName, private: false }),
        });
        if (!createRepo.ok) throw new Error("Failed to create repository");
      }

      // Upload files
      for (const file of files) {
        // Get SHA if file exists
        const fileCheck = await fetch(`https://api.github.com/repos/${username}/${repoName}/contents/${file.path}`, {
          headers: { Authorization: `token ${token}` },
        });
        
        let sha = "";
        if (fileCheck.ok) {
          const data = await fileCheck.json();
          sha = data.sha;
        }

        const upload = await fetch(`https://api.github.com/repos/${username}/${repoName}/contents/${file.path}`, {
          method: "PUT",
          headers: {
            Authorization: `token ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: `Update ${file.path} from Ropeli AI`,
            content: btoa(unescape(encodeURIComponent(file.content))), // Base64 encoding handle utf-8
            sha: sha || undefined,
          }),
        });

        if (!upload.ok) {
          console.error(`Failed to upload ${file.path}`);
        }
      }

      return { success: true, url: `https://github.com/${username}/${repoName}` };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  };

  const importFromGitHub = async (repoUrl: string) => {
    if (!token) return { success: false, message: "Not connected to GitHub" };

    try {
      // Extract owner and repo from URL
      let cleanUrl = repoUrl.replace("https://github.com/", "").replace(".git", "");
      const parts = cleanUrl.split("/");
      const owner = parts[0];
      const repo = parts[1];

      if (!owner || !repo) throw new Error("Invalid GitHub URL. Use format: https://github.com/owner/repo");

      // 1. Get repo details to find default branch
      const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
        headers: { Authorization: `token ${token}` },
      });
      if (!repoRes.ok) throw new Error("Repository not found or access denied");
      const repoData = await repoRes.json();
      const defaultBranch = repoData.default_branch || "main";

      // 2. Fetch file tree recursively for the default branch
      const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`, {
        headers: { Authorization: `token ${token}` },
      });

      if (!response.ok) throw new Error(`Failed to fetch repository tree for branch ${defaultBranch}`);

      const tree = await response.json();
      const files: { path: string; content: string }[] = [];

      // Only fetch files (blobs), ignore directories (they are implicitly created by paths)
      const fileEntries = tree.tree.filter((item: any) => item.type === "blob");

      for (const item of fileEntries) {
        const fileRes = await fetch(item.url, {
          headers: { Authorization: `token ${token}` },
        });
        const fileData = await fileRes.json();
        
        // GitHub API returns content in base64
        try {
          const content = decodeURIComponent(escape(atob(fileData.content.replace(/\n/g, ""))));
          files.push({
            path: item.path,
            content: content,
          });
        } catch (e) {
          console.warn(`Skipping binary or incompatible file: ${item.path}`);
        }
      }

      return { success: true, files };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  };

  return (
    <GitHubContext.Provider
      value={{
        username,
        token,
        isConnected,
        repos,
        fetchRepos,
        connect,
        disconnect,
        exportToGitHub,
        importFromGitHub,
        modalOpen,
        setModalOpen,
      }}
    >
      {children}
    </GitHubContext.Provider>
  );
};

export const useGitHub = () => {
  const ctx = useContext(GitHubContext);
  if (!ctx) throw new Error("useGitHub must be used inside GitHubProvider");
  return ctx;
};
