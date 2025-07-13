import React from 'react';
import Hero from '../components/Hero.jsx';
import FeaturedProducts from '../components/FeaturedProducts.jsx';
import AboutSummary from '../components/AboutSummary.jsx';
import Testimonials from '../components/Testimonials.jsx';


function HomePage() {
  return (
    <div>
      {/* --- ESTE ES EL NUEVO SEPARADOR SUPERIOR --- */}
      <div className="top-gradient-divider"></div>

      <Hero />
      
      {/* Este es el separador inferior que ya funcionaba */}
      <div className="gradient-divider"></div>
      
      <FeaturedProducts />
      <AboutSummary />
      <Testimonials />
    </div>
  );
}

export default HomePage;