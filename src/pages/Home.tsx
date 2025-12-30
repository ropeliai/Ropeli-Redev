{/*import Navbar from "../components/Navbar";
import Hero from "../components/hero";
import BrandingSection from "../components/BrandingSection";
import Footer from "../components/Footer";

const Home = () => {
  return (
    <>
      <Navbar />
      <Hero />
      <BrandingSection /> 
      <Footer />
      <BrandingSection /> 
    </>
  );
};

export default Home;
*/}

import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import OnboardingModal from "../components/OnboardingModal";
import { supabase } from "../lib/supabase";
import Navbar from "../components/Navbar";
import Hero from "../components/hero";

import BrandingSection from "../components/BrandingSection";
import Footer from "../components/Footer";


const Home = () => {
  const { user } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (user && !user.user_metadata?.onboarding_completed) {
      setShowOnboarding(true);
    }
  }, [user]);

  const handleComplete = async (data: any) => {
    await supabase.auth.updateUser({
      data: {
        onboarding_completed: true,
        onboarding: data,
      },
    });

    setShowOnboarding(false);
  };

  return (
    <>
      {showOnboarding && <OnboardingModal onComplete={handleComplete} />}
      {/* rest of home page */}
      
      <Navbar />
      <Hero />
  

      <Footer />
      <BrandingSection /> 
    </>
  );
};

export default Home;

