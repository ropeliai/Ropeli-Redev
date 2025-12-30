import { Routes, Route } from "react-router-dom";
import Home from "./pages/home";
import Auth from "./pages/Auth";
import Templates from "./pages/Templates";
import Community from "./pages/Community";
import DevHouse from "./pages/DevHouse";
import Resources from "./pages/Pricing";
import ProtectedRoute from "./components/ProtectedRoute";
import Pricing from "./pages/Pricing";
import Builder from "./pages/Builder";


const App = () => {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/auth" element={<Auth />} /> 
      <Route path="/templates" element={<Templates />} />
      <Route path="/community" element={<Community />} />
      <Route path="/dev-house" element={<DevHouse />} />
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/builder" element={<Builder />} />
      <Route path="/resources" element={<ProtectedRoute><Resources /></ProtectedRoute>} />
    </Routes>
  );
};

export default App;
