import { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

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

  // On mount: load GitHub credentials from Supabase if user is logged in
  useEffect(() => {
    const loadFromSupabase = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("github_connections")
        .select("github_username, github_token")
        .eq("user_id", user.id)
        .single();

      if (!error && data) {
        setUsername(data.github_username);
        setToken(data.github_token);
        localStorage.setItem("gh_username", data.github_username);
        localStorage.setItem("gh_token", data.github_token);
      }
    };

    loadFromSupabase();
  }, []);

  const isConnected = !!(username && token);

  const fetchRepos = async () => {
    if (!token) return;
    try {
      const response = await fetch("http://localhost:5000/api/github/proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: "https://api.github.com/user/repos?sort=updated&per_page=100",
          token
        })
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

  const connect = async (user: string, tok: string) => {
    localStorage.setItem("gh_username", user);
    localStorage.setItem("gh_token", tok);
    setUsername(user);
    setToken(tok);

    // Persist to Supabase
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        const { error } = await supabase
          .from("github_connections")
          .upsert({
            user_id: authUser.id,
            github_username: user,
            github_token: tok,
            updated_at: new Date().toISOString(),
          }, { onConflict: "user_id" });
        if (error) console.error("Failed to save GitHub connection to Supabase:", error.message);
      }
    } catch (err) {
      console.error("Supabase save error:", err);
    }
  };

  const disconnect = async () => {
    localStorage.removeItem("gh_username");
    localStorage.removeItem("gh_token");
    setUsername(null);
    setToken(null);

    // Remove from Supabase
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        await supabase
          .from("github_connections")
          .delete()
          .eq("user_id", authUser.id);
      }
    } catch (err) {
      console.error("Supabase delete error:", err);
    }
  };

  const exportToGitHub = async (repoName: string, files: { path: string; content: string }[]) => {
    if (!token || !username) return { success: false, message: "Not connected to GitHub" };

    try {
      const proxyUrl = "http://localhost:5000/api/github/proxy";

      // 1. Check if repo exists
      const repoCheck = await fetch(proxyUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: `https://api.github.com/repos/${username}/${repoName}`,
          token
        })
      });

      if (!repoCheck.ok) {
        // Create repo
        const createRepo = await fetch(proxyUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: `https://api.github.com/user/repos`,
            method: "POST",
            token,
            body: { name: repoName, private: false }
          })
        });
        if (!createRepo.ok) throw new Error("Failed to create repository");
      }

      // Upload files
      for (const file of files) {
        // Get SHA if file exists
        const fileCheck = await fetch(proxyUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: `https://api.github.com/repos/${username}/${repoName}/contents/${file.path}`,
            token
          })
        });
        
        let sha = "";
        if (fileCheck.ok) {
          const data = await fileCheck.json();
          sha = data.sha;
        }

        const upload = await fetch(proxyUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: `https://api.github.com/repos/${username}/${repoName}/contents/${file.path}`,
            method: "PUT",
            token,
            body: {
              message: `Update ${file.path} from Ropeli AI`,
              content: btoa(unescape(encodeURIComponent(file.content))), // Base64 encoding handle utf-8
              sha: sha || undefined,
            }
          })
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

      const proxyUrl = "http://localhost:5000/api/github/proxy"; // Use our new backend proxy

      // 1. Get repo details to find default branch
      const repoRes = await fetch(proxyUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            url: `https://api.github.com/repos/${owner}/${repo}`,
            token
        })
      });
      
      if (!repoRes.ok) throw new Error("Repository not found or access denied");
      const repoData = await repoRes.json();
      const defaultBranch = repoData.default_branch || "main";

      // 2. Fetch file tree recursively for the default branch
      const response = await fetch(proxyUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            url: `https://api.github.com/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`,
            token
        })
      });

      if (!response.ok) throw new Error(`Failed to fetch repository tree for branch ${defaultBranch}`);

      const tree = await response.json();
      const files: { path: string; content: string }[] = [];

      // Filter out unnecessary files and directories
      const fileEntries = tree.tree.filter((item: any) => {
        const path = item.path.toLowerCase();
        return (
          item.type === "blob" && 
          !path.includes("node_modules/") &&
          !path.includes(".git/") &&
          !path.includes("dist/") &&
          !path.includes("build/") &&
          !path.includes(".next/") &&
          !path.includes("package-lock.json") &&
          !path.includes("yarn.lock") &&
          !path.endsWith(".png") &&
          !path.endsWith(".jpg") &&
          !path.endsWith(".jpeg") &&
          !path.endsWith(".gif") &&
          !path.endsWith(".ico") &&
          !path.endsWith(".woff") &&
          !path.endsWith(".woff2") &&
          !path.endsWith(".ttf") &&
          !path.endsWith(".pdf")
        );
      });

      // Process in batches of 10 through the proxy
      for (let i = 0; i < fileEntries.length; i += 10) {
        const batch = fileEntries.slice(i, i + 10);
        const batchPromises = batch.map(async (item) => {
          try {
            const fileRes = await fetch(proxyUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    url: item.url,
                    token
                })
            });
            if (!fileRes.ok) return null;
            const fileData = await fileRes.json();
            const content = decodeURIComponent(escape(atob(fileData.content.replace(/\n/g, ""))));
            return { path: item.path, content };
          } catch (e) {
            console.warn(`Failed to fetch ${item.path}:`, e);
            return null;
          }
        });

        const results = await Promise.all(batchPromises);
        results.forEach(res => {
          if (res) files.push(res);
        });
      }

      if (files.length === 0) throw new Error("No readable files found in repository");

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
