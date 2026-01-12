import { useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "../styles/blog.css";

type Article = {
  id: string;
  title: string;
  author: string;
  date: string;
  category: string;
  excerpt: string;
  image?: string;
};

const ARTICLES: Article[] = [
  {
    id: "1",
    title: "Built a SaaS in 48 hours using Ropeli",
    author: "Alex Chen",
    date: "Jan 8, 2026",
    category: "Case Study",
    excerpt: "How I shipped a full-stack SaaS product in just 2 days using Ropeli AI and templates.",
    image: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&h=400&fit=crop",
  },
  {
    id: "2",
    title: "No-code to Full Stack: My Ropeli Journey",
    author: "Sarah Kim",
    date: "Jan 5, 2026",
    category: "Tutorial",
    excerpt: "From zero coding experience to deploying production apps. Here's what I learned.",
    image: "data:image/jpeg;base64,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",
  },
  {
    id: "3",
    title: "Scaling my startup with AI-powered templates",
    author: "Mike Johnson",
    date: "Dec 28, 2025",
    category: "Growth",
    excerpt: "How Ropeli's templates cut our development time by 70% and helped us scale faster.",
    image: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=600&h=400&fit=crop",
  },
  {
    id: "4",
    title: "Building a marketplace app with zero backend code",
    author: "Emma Davis",
    date: "Dec 20, 2025",
    category: "Tutorial",
    excerpt: "A step-by-step guide to building a full marketplace using Ropeli's no-code features.",
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTlOX4732nL6yCqxPq034YTioYVnl4Rrf8Cxw&s",
  },
];

const Blog = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  const categories = ["All", ...new Set(ARTICLES.map((a) => a.category))];

  const filtered =
    selectedCategory === "All"
      ? ARTICLES
      : ARTICLES.filter((a) => a.category === selectedCategory);

  return (
    <>
      <Navbar />
      <main className="blog">
        <section className="blog-header">
          <h1>Blog</h1>
          <p className="subtitle">Stories from our community. What did you build?</p>
        </section>

        <section className="blog-filters">
          {categories.map((cat) => (
            <button
              key={cat}
              className={`filter-btn ${selectedCategory === cat ? "active" : ""}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </section>

        <section className="articles-grid">
          {filtered.map((article) => (
            <article className="article-card" key={article.id}>
              {article.image && (
                <div className="article-image">
                  <img src={article.image} alt={article.title} />
                </div>
              )}
              <div className="article-content">
                <span className="article-category">{article.category}</span>
                <h3>{article.title}</h3>
                <p className="article-excerpt">{article.excerpt}</p>
                <div className="article-meta">
                  <span className="author">{article.author}</span>
                  <span className="date">{article.date}</span>
                </div>
                <a href="#" className="read-more">
                  Read More →
                </a>
              </div>
            </article>
          ))}
        </section>
      </main>
      <Footer />
    </>
  );
};

export default Blog;