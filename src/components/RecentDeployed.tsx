{/*import { useState } from "react";
import "../styles/recentDeployed.css";

type Tab = "recent" | "deployed";

const RecentDeployed = () => {
  const [activeTab, setActiveTab] = useState<Tab>("recent");

  // 🔹 For now empty, later you can fill from API
  const recentTasks: any[] = [];
  const deployedApps: any[] = [];

  const isEmpty =
    activeTab === "recent"
      ? recentTasks.length === 0
      : deployedApps.length === 0;

  return (
    <section className="rd-section">
      <div className="rd-card">
        {/* Tabs *
        <div className="rd-tabs">
          <button
            className={activeTab === "recent" ? "active" : ""}
            onClick={() => setActiveTab("recent")}
          >
            🗂 Recent Tasks
          </button>
          <span className="divider">|</span>
          <button
            className={activeTab === "deployed" ? "active" : ""}
            onClick={() => setActiveTab("deployed")}
          >
            🌐 Deployed Apps
          </button>
        </div>

        {/* Content *
        <div className="rd-content">
          {isEmpty ? (
            <div className="rd-empty">
              <div className="rd-empty-icon">
                {activeTab === "recent" ? "🗂" : "🌐"}
              </div>
              <h3>
                {activeTab === "recent"
                  ? "No recent tasks"
                  : "0 apps deployed"}
              </h3>
              <p>
                {activeTab === "recent"
                  ? "Your recent builds and prompts will appear here."
                  : "Deploy your application to a production-ready environment."}
              </p>

              {activeTab === "deployed" && (
                <span className="rd-badge">
                  Deployment costs <b>50 credits/month</b>
                </span>
              )}
            </div>
          ) : (
            <div className="rd-list">
              {/* Later map recentTasks / deployedApps here *
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default RecentDeployed;
*/}







import { useState, useEffect, useRef } from "react";
import "../styles/recentDeployed.css";

type Tab = "recent" | "deployed" | "templates";

type Project = {
  id: string;
  name: string;
  lastEdited: string;
  thumbnail: string;
};

const initialData: Record<Tab, Project[]> = {
  recent: [
    {
      id: "1",
      name: "ai-verified-haven",
      lastEdited: "Viewed 4 minutes ago",
      thumbnail: "/public/Vite.svg",
    },
    {
      id: "2",
      name: "hi",
      lastEdited: "Edited 3 months ago",
      thumbnail: "/public/Vite.svg",
    },
  ],
  deployed: [],
  templates: [],
};

export default function RecentDeployed() {
  const [activeTab, setActiveTab] = useState<Tab>("recent");
  const [projects, setProjects] = useState(initialData);

  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [modal, setModal] = useState<
    null | { type: "rename" | "share" | "invite"; project: Project }
  >(null);
  const [inputValue, setInputValue] = useState("");

  const menuRef = useRef<HTMLDivElement | null>(null);

  /* =========================
     CLOSE MENU ON OUTSIDE CLICK
     ========================= */
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node)
      ) {
        setMenuOpenId(null);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () =>
      document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  /* =========================
     ACTIONS
     ========================= */

  const openRename = (project: Project) => {
    setInputValue(project.name);
    setModal({ type: "rename", project });
    setMenuOpenId(null);
  };

  const saveRename = () => {
    if (!modal) return;

    setProjects((prev) => ({
      ...prev,
      [activeTab]: prev[activeTab].map((p) =>
        p.id === modal.project.id ? { ...p, name: inputValue } : p
      ),
    }));

    closeModal();
  };

  const deleteProject = (id: string) => {
    setProjects((prev) => ({
      ...prev,
      [activeTab]: prev[activeTab].filter((p) => p.id !== id),
    }));
    setMenuOpenId(null);
  };

  const closeModal = () => {
    setModal(null);
    setInputValue("");
  };

  /* =========================
     RENDER
     ========================= */

  return (
    <section className="rd-section">
      <div className="rd-card">
        {/* TABS */}
        <div className="rd-tabs">
          {(["recent", "deployed", "templates"] as Tab[]).map((tab) => (
            <button
              key={tab}
              className={activeTab === tab ? "active" : ""}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* GRID */}
        <div className="recent-grid">
          {projects[activeTab].map((project) => (
            <div className="recent-card" key={project.id}>
              <img
                src={project.thumbnail}
                alt={project.name}
                className="recent-thumb"
              />

              {/* MENU BUTTON */}
              <button
                className="recent-menu-btn"
                onClick={() =>
                  setMenuOpenId(
                    menuOpenId === project.id ? null : project.id
                  )
                }
              >
                ⋯
              </button>

              {/* MENU */}
              {menuOpenId === project.id && (
                <div className="recent-menu" ref={menuRef}>
                  <button onClick={() => openRename(project)}>
                    ✏ Rename
                  </button>
                  <button
                    onClick={() =>
                      setModal({ type: "share", project })
                    }
                  >
                    🔗 Share
                  </button>
                  <button
                    onClick={() =>
                      setModal({ type: "invite", project })
                    }
                  >
                    👤 Invite
                  </button>
                  <button
                    className="danger"
                    onClick={() => deleteProject(project.id)}
                  >
                    🗑 Delete
                  </button>
                </div>
              )}

              {/* INFO */}
              <div className="recent-info">
                <strong>{project.name}</strong>
                <div className="recent-meta">
                  <div className="avatar">P</div>
                  <span>{project.lastEdited}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* EMPTY STATE */}
        {projects[activeTab].length === 0 && (
          <div className="rd-empty">
            No {activeTab} projects yet
          </div>
        )}
      </div>

      {/* MODAL */}
      {modal && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3>
                {modal.type === "rename"
                  ? "Rename task"
                  : modal.type === "share"
                  ? "Share project"
                  : "Invite collaborator"}
              </h3>
              <button className="close-btn" onClick={closeModal}>
                ✕
              </button>
            </div>

            <input
              autoFocus
              placeholder={
                modal.type === "rename"
                  ? "Enter new name"
                  : "Enter email address"
              }
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
            />

            <div className="modal-actions">
              <button onClick={closeModal}>Cancel</button>
              <button
                className="primary"
                onClick={
                  modal.type === "rename" ? saveRename : closeModal
                }
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
