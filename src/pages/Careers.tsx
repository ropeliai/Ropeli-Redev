import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "../styles/careers.css";

type Job = {
  id: string;
  title: string;
  level?: string;
  location?: string;
  description: string;
};

const JOBS: Job[] = [
  {
    id: "ai-intern",
    title: "AI Intern",
    level: "Intern",
    location: "Remote",
    description: "Work with our ML team on model fine-tuning, data pipelines and experiments.",
  },
  {
    id: "fullstack-intern",
    title: "Full Stack Intern",
    level: "Intern",
    location: "Remote",
    description: "Build features across frontend and backend; work with React, Supabase and Node.",
  },
  {
    id: "frontend-intern",
    title: "Frontend Intern",
    level: "Intern",
    location: "Remote",
    description: "Ship UI components, improve accessibility and performance in our React app.",
  },
  {
    id: "uiux-designer",
    title: "UI/UX Designer",
    level: "Mid",
    location: "Remote",
    description: "Design product flows, prototypes and collaborate with engineers to ship delightful UX.",
  },
  {
    id: "graphic-designer",
    title: "Graphic Designer",
    level: "Contract",
    location: "Remote",
    description: "Create marketing assets, illustrations and visual brand assets for product and growth.",
  },
];

const Careers = () => {
  return (
    <>
      <Navbar />
      <main className="careers">
        <section className="careers-header">
          <h1>Careers</h1>
          <p className="subtitle">Join Ropeli — small team, big impact.</p>
        </section>

        <section className="jobs-grid">
          {JOBS.map((job) => (
            <article className="job-card" key={job.id}>
              <div className="job-card-inner">
                <div className="job-meta">
                  <h3>{job.title}</h3>
                  <span className="job-badge">{job.level}</span>
                </div>
                <p className="job-location">{job.location}</p>
                <p className="job-desc">{job.description}</p>
                <div className="job-actions">
                  <a
                    className="apply-btn"
                    href={`mailto:info@ropeliai?subject=Application%20-%20${encodeURIComponent(
                      job.title
                    )}`}
                  >
                    Apply
                  </a>
                </div>
              </div>
            </article>
          ))}
        </section>
      </main>
      <Footer />
    </>
  );
};

export default Careers;