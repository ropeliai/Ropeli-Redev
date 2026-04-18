import { useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "../styles/Template.css";

type Template = {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
};

const templates: Template[] = [
  {
  id: "t1",
  name: "All in one AI-CRM Dashboards",
  description: "AI-powered dashboard to manage customers, sales, and insights.",
  thumbnail: "/ARC portfolios.jpg",
},
{
  id: "t2",
  name: "Travel apps like makemytrip",
  description: "Complete travel booking app for flights, hotels, and trips.",
  thumbnail: "/travel website.png",
},
{
  id: "t3",
  name: "Inventory management portals",
  description: "Track inventory, orders, and stock in real time.",
  thumbnail: "/inventory management.png",
},
{
  id: "t4",
  name: "HRM tools",
  description: "Manage employees, payroll, and HR workflows easily.",
  thumbnail: "/HRM.png",
},
{
  id: "t5",
  name: "E-commerce platforms",
  description: "Online store with products, payments, and orders.",
  thumbnail: "/E-commerece.png",
},
{
  id: "t6",
  name: "Fitness trackers",
  description: "Monitor workouts, health stats, and progress.",
  thumbnail: "/Fitness Tracker.webp",
},
{
  id: "t7",
  name: "SaaS Platforms",
  description: "Modern SaaS app with subscriptions and dashboards.",
  thumbnail: "/SaaS website.png",
},
{
  id: "t8",
  name: "Architect portfolio",
  description: "Showcase architectural projects and designs.",
  thumbnail: "/personal portfolio.png",
},
{
  id: "t9",
  name: "Spotify clone or Netflix clone",
  description: "Streaming app for music or movies on demand.",
  thumbnail: "/Spotify clone.jpg",
},

];

export default function TemplatesPage() {
  const [activeTemplate, setActiveTemplate] = useState<Template | null>(null);
const [comingSoon, setComingSoon] = useState(false);
  return (
    <>
      <Navbar />

      <section className="templates">
        {/* HEADER — SAME PATTERN AS PRICING */}
        <div className="templates-header">
          <h1>Templates</h1>
          <p>Start from a template to build your next project</p>
        </div>

        {/* GRID — SAME WIDTH LOGIC AS PRICING */}
        <div className="templates-grid">
          {templates.map((template) => (
            <div
              key={template.id}
              className="template-card"
              onClick={() => setActiveTemplate(template)}
            >
              <img
                src={template.thumbnail}
                alt={template.name}
                className="template-thumb"
              />

              <div className="template-info">
                <strong>{template.name}</strong>
                <span>{template.description}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <Footer />

      {/* PREVIEW MODAL */}
      {activeTemplate && (
        <div
          className="modal-backdrop"
          onClick={() => setActiveTemplate(null)}
        >
          <div
            className="modal template-preview"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3>{activeTemplate.name}</h3>
              <button
                className="close-btn"
                onClick={() => setActiveTemplate(null)}
              >
                ✕
              </button>
            </div>

            <img
              src={activeTemplate.thumbnail}
              alt={activeTemplate.name}
            />

            <p className="template-preview-desc">
              {activeTemplate.description}
            </p>

            <div className="modal-actions">
              <button  className="primary" onClick={() => setActiveTemplate(null)}>
                Cancel
              </button>
              <button
      className={`primary ${comingSoon ? "disabled" : ""}`}
      onClick={() => setComingSoon(true)}
      disabled={comingSoon}
    >
      {comingSoon ? "Coming Soon" : "Use template"}
    </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
