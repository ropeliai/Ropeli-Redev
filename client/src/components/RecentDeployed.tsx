import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/recentDeployed.css";
import { supabase } from "../lib/supabase";


type Tab =  "saved" | "deployed" | "templates";

type Project = {
  id: string;
  name?: string;
  prompt?: string;
  files?: Array<{path:string;content:string}>;
  created_at?: string;
  updated_at?: string;
  thumbnail?: string;
};

/* ---------------- TEMPLATE DATA ---------------- */
const templateData: Project[] = [
  {
    id: "t0",
    name: "I phone Frontend",
    updated_at: "Modern and sleek iPhone frontend UI template.",
    thumbnail: "/I phone Frontend.png",
  },
  {
    id: "t1",
    name: "All in one AI-CRM Dashboards",
    updated_at: "AI-powered dashboard to manage customers, sales, and insights.",
    thumbnail:  "/ARC portfolios.jpg",
  },
  {
    id: "t2",
    name:"Travel apps like makemytrip",
    updated_at: "Complete travel booking app for flights, hotels, and trips.",
    thumbnail: "/travel website.png",
  },
 {
    id: "t3",
    name:"Inventory management portals",
    updated_at:  "Track inventory, orders, and stock in real time.",
    thumbnail: "/inventory management.png",
  },
   {
    id: "t4",
    name:"HRM tools",
    updated_at:"Manage employees, payroll, and HR workflows easily.",
    thumbnail: "/HRM.png",
  },
  {
    id: "t5",
    name: "E-commerce platforms",
    updated_at:"Online store with products, payments, and orders.",
    thumbnail:"/E-commerece.png",
  },
  {
    id: "t6",
    name: "Fitness trackers",
    updated_at:"Monitor workouts, health stats, and progress.",
    thumbnail: "/Fitness Tracker.webp",
  },
];

const initialData: Record<Tab, Project[]> = {
  saved: [], 
  deployed: [],
  templates: templateData,
};

export default function RecentDeployed() {
  const [activeTab, setActiveTab] = useState<Tab>("saved");
  const [projects, setProjects] = useState(initialData);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [modal, setModal] = useState<
    null | { type: "rename" | "share" | "invite"; project: Project }
  >(null);
  const [inputValue, setInputValue] = useState("");

  const menuRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const isGuest = !user;
/* SET TABS TO TEMPLATES IF GUEST USER */
useEffect(() => {
  if (isGuest) {
    setActiveTab("templates");
  }
}, [isGuest]);




useEffect(() => {
  if (!user) return;
  if (activeTab === "templates") return; // No need to fetch templates from DB

  const fetchProjects = async () => {
    const { data, error } = await supabase
      .from("generated_projects")
      .select("id,project_name,prompt,files,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      return;
    }

    //  KEY FIX: update ONLY the active tab
    setProjects((prev) => ({
      ...prev,
      [activeTab]: data || [],
    }));
  };

  fetchProjects();
}, [activeTab, user]);




  /* CLOSE MENU ON OUTSIDE CLICK */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpenId(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);




  /* ACTIONS */
  const openRename = (project: Project) => {
    setInputValue(project.name || "");
    setModal({ type: "rename", project });
    setMenuOpenId(null);
  };


  
 const saveRename = async () => {
  if (!modal || !inputValue.trim() || !user) return;

  const newName = inputValue.trim();

  const { error } = await supabase
    .from("generated_projects")
    .update({ project_name: newName })
    .eq("id", modal.project.id)
    .eq("user_id", user.id);

  if (error) {
    console.error("Rename failed:", error);
    return;
  }

  setProjects((prev) => ({
    ...prev,
    [activeTab]: prev[activeTab].map((p) =>
      p.id === modal.project.id ? { ...p, name: newName } : p
    ),
  }));

  setModal(null);
  setInputValue("");
};



const deleteProject = async (id: string) => {
  if (!user) return;
  const { error } = await supabase
    .from("generated_projects")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) {
    console.error("Delete failed:", error);
    return;
  }

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

  const [templateLoading, setTemplateLoading] = useState(false);

  const handleTemplateClick = async (template: Project) => {
    if (template.id === "t0") {
      try {
        setTemplateLoading(true);
        const response = await fetch("/api/templates/iphone/files");
        const result = await response.json();
        setTemplateLoading(false);
        if (result.success && result.files) {
          navigate("/builder", {
            state: {
              files: result.files,
              prompt: "iPhone Frontend Template",
            },
          });
        } else {
          alert("Failed to load iPhone template files. Please try again.");
        }
      } catch (error) {
        setTemplateLoading(false);
        console.error("Failed to load iPhone template:", error);
        alert("Failed to connect to template server.");
      }
    } else {
      navigate("/builder", {
        state: {
          generatedProjectId: template.id,
          files: template.files || [],
          prompt: template.name || "",
        },
      });
    }
  };




  return (
    <section className="rd-section">
      <div className="rd-card">
        {/* HEADER */}
        <div className="rd-tabs-header">
          <div className="rd-tabs-alt">
  <button
    className={activeTab === "templates" ? "active" : ""}
    onClick={() => setActiveTab("templates")}
  >
    Templates
  </button>

  {!isGuest && (
    <>
      <span className="rd-divider">|</span>

      <button
        className={activeTab === "saved" ? "active" : ""}
        onClick={() => setActiveTab("saved")}
      >
        My Projects
      </button>

      <span className="rd-divider">|</span>

      <button
        className={activeTab === "deployed" ? "active" : ""}
        onClick={() => setActiveTab("deployed")}
      >
        Deployed Apps
      </button>
    </>
  )}
</div>



          
        </div>
        {activeTab === "templates" && (
  <div className="rd-browse-wrapper">
    <button
      className="browse-all"
      onClick={() => navigate("/templates")}
    >
      Browse All
    </button>
  </div>
)}


        {/* ================= TABLE VIEW ================= */}
        {activeTab === "deployed" ? (
          <div className="rd-empty">Coming soon</div>
        ) : activeTab === "saved" ? (
          <div className="rd-table">
            <div className="rd-table-head">
              <span>ID</span>
              <span>Task</span>
              <span>Created at</span>
              <span></span>
            </div>

            {projects.saved.map((project) => (
              <div
                className="rd-table-row"
                key={project.id}
                onClick={() =>
                  navigate("/builder", {
                    state: {
                      generatedProjectId: project.id,
                      files: project.files || [],
                      prompt: project.prompt || "",
                    },
                  })
                }
              >
                <span className="rd-id">RPI-{project.id}</span>

               <div className="rd-task">
                <strong>
                    <span className="rd-task-prompt">
                      {project.name || project.prompt || "Untitled task"}
                    </span>

                </strong>
               </div>


                <span className="rd-modified"> {new Date(project.created_at || Date.now()).toLocaleString()}</span>


                <div className="rd-actions">
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

                  {menuOpenId === project.id && (
                    <div className="recent-menu" ref={menuRef}>
                      <button onClick={() => openRename(project)}> Rename</button>
                      <button
                        onClick={() =>
                          setModal({ type: "share", project })
                        }
                      >
                         Share
                      </button>
                      <button
                        onClick={() =>
                          setModal({ type: "invite", project })
                        }
                      >
                         Invite
                      </button>
                      <button
                        className="danger"
                        onClick={() => deleteProject(project.id)}
                      >
                         Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {activeTab === "templates" && (
          <div className="recent-grid templates-grid">
            {projects.templates.map((t) => (
              <div 
                key={t.id} 
                className="recent-card"
                onClick={() => handleTemplateClick(t)}
                style={{ cursor: 'pointer' }}
              >
                <img src={t.thumbnail} className="recent-thumb" />
                <div className="recent-info">
                  <strong>{t.name}</strong>
                  <span>{t.updated_at}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "saved" && projects.saved.length === 0 && (
          <div className="rd-empty">No projects yet</div>
         )}

      </div>

      {/* ================= MODAL ================= */}
      {modal && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                {modal.type === "rename"
                  ? "Rename project"
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
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
            />

            <div className="modal-actions">
              <button onClick={closeModal}>Cancel</button>
              <button className="primary" onClick={saveRename}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
