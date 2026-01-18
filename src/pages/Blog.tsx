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
    image: "https://images.unsplash.com/photo-1642132652935-d750e2014719?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8bm8lMjBjb2RlJTJGJTIwZnVsbHN0YWNrJTIwYXBwfGVufDB8fDB8fHww",
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