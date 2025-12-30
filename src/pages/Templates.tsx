/*import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const Templates = () => {
  return (
    <>
      <Navbar />
      <main style={{ padding: "6rem 2rem", color: "white" }}>
        <h1>Templates</h1>
        <p>Templates page content goes here.</p>
      </main>
      <Footer />
    </>
  );
};

export default Templates;
*/




import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "../styles/Template.css";

const categories = [
  "All",
  "Marketing",
  "E-commerce",
  "Dashboard",
  "Portfolio",
  "Content",
];

const templates = Array.from({ length: 6 }).map((_, i) => ({
  id: i,
  title: "Modern landing page with hero, features, and pricing",
  views: 98,
}));

const Templates = () => {
  return (
    <>
      <Navbar />

      <main className="templates-page">
        <div className="templates-container">
          <h1 className="templates-title">
            Start with templates built to accelerate your workflow
          </h1>

          {/* Filters */}
          <div className="template-filters">
            {categories.map((cat) => (
              <button
                key={cat}
                className={`filter-btn ${
                  cat === "E-commerce" ? "active" : ""
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Grid */}
          <div className="templates-grid">
            {templates.map((t) => (
              <div key={t.id} className="template-card">
                <div className="template-image">
                  <span>template preview</span>
                </div>

                <div className="template-content">
                  <p className="template-desc">{t.title}</p>

                  <div className="template-meta">
                    <div className="icons">
                      {/*<span>👍</span>
                      <span>🤍</span>
                      <span>😊</span>*/}
                    </div>

                    <div className="views">👁 {t.views}</div>
                  </div>

                  <button className="use-template-btn">
                    Use template →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
};

export default Templates;
