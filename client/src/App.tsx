import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Auth from "./pages/Auth";
import Templates from "./pages/Templates";
import Community from "./pages/Community";
import Pricing from "./pages/Pricing";
import Careers from "./pages/Careers";
import Blog from "./pages/Blog";
import Founders from "./pages/Founders";
import Integrations from "./pages/Integrations";
import Builder from "./pages/Builder";
import Docs from "./pages/Docs";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import GitHubIntegration from "./pages/GitHubIntegration";
import DevelopersPlayground from "./pages/DevelopersPlayground";
import AgentBuilder from "./pages/AgentBuilder";


const App = () => {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/auth" element={<Auth />} /> 
      <Route path="/templates" element={<Templates />} />
      <Route path="/community" element={<Community />} />
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/integrations" element={<Integrations />} />
      <Route path="/builder" element={<Builder />} />
      <Route path="/agent" element={<AgentBuilder />} />
      <Route path="/careers" element={<Careers />} />
      <Route path="/blog" element={<Blog />} />
      <Route path="/docs" element={<Docs />} />
      <Route path="/founders" element={<Founders />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/builder/:projectId" element={<Builder />} />
      <Route path="/github" element={<GitHubIntegration />} />
      <Route path="/developers-playground" element={<DevelopersPlayground />} />
    </Routes>
  );
};

export default App;
