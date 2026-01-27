import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/recentDeployed.css";
import { supabase } from "../lib/supabase";


type Tab = "recent" | "deployed" | "templates";

type Project = {
  id: string;
  taskNo?: number;
  name?: string;
  prompt?: string;
  lastEdited: string;
  thumbnail: string;
};

/* ---------------- TEMPLATE DATA ---------------- */
const templateData: Project[] = [
  {
    id: "t1",
    name: "All in one AI-CRM Dashboards",
    lastEdited: "AI-powered dashboard to manage customers, sales, and insights.",
    thumbnail:  "/ARC portfolios.jpg",
  },
  {
    id: "t2",
    name:"Travel apps like makemytrip",
    lastEdited: "Complete travel booking app for flights, hotels, and trips.",
    thumbnail: "/travel website.png",
  },
 {
    id: "t3",
    name:"Inventory management portals",
    lastEdited:  "Track inventory, orders, and stock in real time.",
    thumbnail: "/inventory management.png",
  },
   {
    id: "t4",
    name:"HRM tools",
    lastEdited:"Manage employees, payroll, and HR workflows easily.",
    thumbnail: "/HRM.png",
  },
  {
    id: "t5",
    name: "E-commerce platforms",
    lastEdited:"Online store with products, payments, and orders.",
    thumbnail:"/E-commerece.png",
  },
  {
    id: "t6",
    name: "Fitness trackers",
    lastEdited:"Monitor workouts, health stats, and progress.",
    thumbnail: "/Fitness Tracker.webp",
  },
];

const initialData: Record<Tab, Project[]> = {
  recent: [
    /*{
      id: "8d72c6",
      name: "smart-class-demo",
      lastEdited: "3 days ago",
      thumbnail: "",
    },
    {
      id: "5bae65",
      name: "luxury-soles-12",
      lastEdited: "3 days ago",
      thumbnail: "",
    },
    {
      id: "e8deec",
      name: "warm-treats-2",
      lastEdited: "5 days ago",
      thumbnail: "",
    },*/
  ],
  deployed: [],
  templates: templateData,
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

  const fetchProjects = async () => {
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      return;
    }

    setProjects((prev) => ({
      ...prev,
      recent: data.filter(p => p.status === "recent"),
      deployed: data.filter(p => p.status === "deployed"),
    }));
  };

  fetchProjects();
}, [user]);



/*  BUILDER prompt to task 
useEffect(() => {
  const stored = JSON.parse(
    localStorage.getItem("recentTasks") || "[]"
  );

  const formatted = stored.map(
    (item: any, index: number) => ({
      id: item.id,
      taskNo: index + 1,
      prompt: item.prompt,
      lastEdited: "Just now",
      thumbnail: "",
    })
  );

  setProjects((prev) => ({
    ...prev,
    recent: formatted,
  }));
}, []);*/


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
  if (!modal || !inputValue.trim()) return;

  const newName = inputValue.trim();

  // 1️⃣ Update database
  const { error } = await supabase
    .from("projects")
    .update({
      name: newName,
      updated_at: new Date(),
    })
    .eq("id", modal.project.id);

  if (error) {
    console.error("Rename failed:", error);
    return;
  }

  // 2️⃣ Update UI instantly
  setProjects((prev) => ({
    ...prev,
    [activeTab]: prev[activeTab].map((p) =>
      p.id === modal.project.id
        ? { ...p, name: newName }
        : p
    ),
  }));

  // 3️⃣ Close modal
  setModal(null);
  setInputValue("");
};



const deleteProject = async (id: string) => {
  // 1) Delete from DB
  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Delete failed:", error);
    return;
  }

  // 2) Update UI
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
        className={activeTab === "recent" ? "active" : ""}
        onClick={() => setActiveTab("recent")}
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
        {activeTab !== "templates" && (
          <div className="rd-table">
            <div className="rd-table-head">
              <span>ID</span>
              <span>Task</span>
              <span>Last modified</span>
              <span></span>
            </div>

            {projects[activeTab].map((project) => (
              <div className="rd-table-row" key={project.id}>
                <span className="rd-id">EMT-{project.id}</span>

               <div className="rd-task">
                <strong>
                 {project.taskNo ?? "-"}.{" "}
                    <span className="rd-task-prompt">
                      {project.name || project.prompt || "Untitled task"}
                    </span>

                </strong>
               </div>


                <span className="rd-modified">{project.lastEdited}</span>

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
        )}

        {/* ================= TEMPLATES GRID ================= */}
        {activeTab === "templates" && (
          <div className="recent-grid templates-grid">
            {projects.templates.map((t) => (
              <div key={t.id} className="recent-card">
                <img src={t.thumbnail} className="recent-thumb" />
                <div className="recent-info">
                  <strong>{t.name}</strong>
                  <span>{t.lastEdited}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {projects[activeTab].length === 0 && (
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
