import { Routes, Route } from "react-router-dom";
import Home from "./pages/home";
import Auth from "./pages/Auth";
import Templates from "./pages/Templates";
import Community from "./pages/Community";
import Resources from "./pages/Pricing";
import ProtectedRoute from "./components/ProtectedRoute";
import Pricing from "./pages/Pricing";
import Careers from "./pages/careers";
import Blog from "./pages/Blog";
import Founders from "./pages/Founders";
import Integrations from "./pages/Integrations";
import Builder from "./pages/Builder";
import Docs from "./pages/Docs";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import GitHubIntegration from "./pages/GitHubIntegration";
import DevelopersPlayground from "./pages/DevelopersPlayground";


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
      <Route path="/careers" element={<Careers />} />
      <Route path="/blog" element={<Blog />} />
      <Route path="/docs" element={<Docs />} />
      <Route path="/founders" element={<Founders />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/github" element={<GitHubIntegration />} />
      <Route path="/developers-playground" element={<DevelopersPlayground />} />
      <Route path="/resources" element={<ProtectedRoute><Resources /></ProtectedRoute>} />
    </Routes>
  );
};

export default App;
