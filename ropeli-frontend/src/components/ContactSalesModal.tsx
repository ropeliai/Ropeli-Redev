import { useState } from "react";
import { supabase } from "../lib/supabase";
import "../styles/contactSalesModal.css";

interface Props {
  open: boolean;
  onClose: () => void;
}

const ContactSalesModal = ({ open, onClose }: Props) => {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    lookingFor: "",
    problem: "",
    users: "",
    timeline: "",
  });

  if (!open) return null;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    const { error } = await supabase
      .from("contact_sales_requests")
      .insert([
        {
          first_name: form.firstName,
          last_name: form.lastName,
          work_email: form.email,
          phone_number: form.phone,
          looking_for: form.lookingFor,
          problem: form.problem,
          users_count: Number(form.users),
          timeline: form.timeline,
        },
      ]);

    if (!error) {
      alert("Thanks! Our sales team will contact you soon.");
      onClose();
    } else {
      alert("Something went wrong. Please try again.");
    }
  };

  return (
  <div className="sales-overlay">
    <div className="sales-modal">
      <button className="close-btn" onClick={onClose}>✕</button>

      <h2>Contact Sales</h2>
      <p className="subtitle">
        Tell us a bit about yourself and we’ll get in touch.
      </p>

      {/* ✅ SCROLLABLE AREA */}
      <div className="form-body">
        <div className="row">
          <input
            name="firstName"
            placeholder="First Name"
            onChange={handleChange}
          />
          <input
            name="lastName"
            placeholder="Last Name"
            onChange={handleChange}
          />
        </div>

        <input
          name="email"
          placeholder="Work Email"
          onChange={handleChange}
        />

        <input
          name="phone"
          placeholder="Phone Number"
          onChange={handleChange}
        />

        
        <textarea
        name="lookingFor"
          placeholder="What are you looking for in Ropeli AI's custom plan?"
          onChange={handleChange}
        rows={2}
        onInput={(e) => {
          const el = e.target as HTMLTextAreaElement;
          el.style.height = "auto";
          el.style.height = el.scrollHeight + "px";
         }}
        />

        <textarea
        name="problem"
          placeholder="What problem are you trying to solve?"
          onChange={handleChange}
        rows={2}
        onInput={(e) => {
          const el = e.target as HTMLTextAreaElement;
          el.style.height = "auto";
          el.style.height = el.scrollHeight + "px";
         }}
        />


         <textarea
        name="users"
          placeholder="How many users would you like to onboard?"
          onChange={handleChange}
        rows={2}
        onInput={(e) => {
          const el = e.target as HTMLTextAreaElement;
          el.style.height = "auto";
          el.style.height = el.scrollHeight + "px";
         }}
        />


          <textarea
         name="timeline"
          placeholder="Do you have any timeline to get started?"
          onChange={handleChange}
        rows={2}
        onInput={(e) => {
          const el = e.target as HTMLTextAreaElement;
          el.style.height = "auto";
          el.style.height = el.scrollHeight + "px";
         }}
        />

      </div>

      {/* ✅ STICKY BUTTON */}
      <button className="submit-btn" onClick={handleSubmit}>
        Contact Sales
      </button>
    </div>
  </div>
);

};

export default ContactSalesModal;
