import { useState } from "react";
import { supabase } from "../lib/supabase";
import "../styles/contactUsModal.css";

interface Props {
  open: boolean;
  onClose: () => void;
}

const ContactUsModal = ({ open, onClose }: Props) => {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    query: "",
    company: "",
  });

  if (!open) return null;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    const { error } = await supabase.from("contact_us_requests").insert([
      {
        first_name: form.firstName,
        last_name: form.lastName,
        work_email: form.email,
        phone_number: form.phone,
        query: form.query,
        company_details: form.company,
      },
    ]);

    if (!error) {
      alert("Thanks! We’ll get back to you soon.");
      onClose();
    } else {
      alert("Something went wrong. Please try again.");
    }
  };

  return (
    <div className="contact-overlay" onClick={onClose}>
      <div className="contact-modal" onClick={(e) => e.stopPropagation()}>
        <button className="contact-close-btn" onClick={onClose}>✕</button>

        <h2 className="contact_head_h2">Contact Us</h2>
        <p className="subtitle">
          Have a question? Fill out the form and we’ll be in touch.
        </p>

        <div className="form-body">
          <div className="row">
            <input name="firstName" placeholder="First Name" onChange={handleChange} />
            <input name="lastName" placeholder="Last Name" onChange={handleChange} />
          </div>

          <input name="email" placeholder="Work Email" onChange={handleChange} />
          <input name="phone" placeholder="Phone Number" onChange={handleChange} />

          

          <textarea 
           name="query"
            placeholder="Your query"
            onChange={handleChange}        
          rows={2}
          onInput={(e) => {
             const el = e.target as HTMLTextAreaElement;
             el.style.height = "auto";
             el.style.height = el.scrollHeight + "px";
          }}
          />

          <textarea 
          name="company"
            placeholder="Company name and details (if any)"
            onChange={handleChange}          
          rows={2}
          onInput={(e) => {
             const el = e.target as HTMLTextAreaElement;
             el.style.height = "auto";
             el.style.height = el.scrollHeight + "px";
          }}
          />       

         
        </div>

        <button className="submit-btn" onClick={handleSubmit}>
          Contact Us
        </button>
      </div>
    </div>
  );
};

export default ContactUsModal;
