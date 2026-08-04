import React from 'react';
import { useApp } from '../../context/AppContext';
import { LandingNavbar } from './LandingNavbar';
import { LandingHero } from './LandingHero';
import { LandingInteractiveMapPreview } from './LandingInteractiveMapPreview';
import { LandingCategories } from './LandingCategories';
import { LandingIncomeCalculator } from './LandingIncomeCalculator';
import { LandingRoleCards } from './LandingRoleCards';
import { LandingFeatures } from './LandingFeatures';
import { LandingTestimonials } from './LandingTestimonials';
import { LandingFAQ } from './LandingFAQ';
import { LandingFooter } from './LandingFooter';

export const LandingScreen: React.FC = () => {
  const { setCurrentScreen } = useApp();

  const handleSelectRole = (role: 'worker' | 'employer') => {
    try {
      localStorage.setItem('baito_preselected_role', role);
    } catch (e) {
      console.warn('LocalStorage error:', e);
    }
    setCurrentScreen('register');
  };

  return (
    <div id="baito-landing-page" className="min-h-screen bg-white font-sans flex flex-col selection:bg-brand-primary selection:text-white">
      <LandingNavbar onSelectRole={handleSelectRole} />
      <main className="flex-1">
        <LandingHero onSelectRole={handleSelectRole} />
        <LandingFeatures />
        <LandingCategories onSelectRole={handleSelectRole} />
        <LandingInteractiveMapPreview onSelectRole={handleSelectRole} />
        <LandingIncomeCalculator onSelectRole={handleSelectRole} />
        <LandingRoleCards onSelectRole={handleSelectRole} />
        <LandingTestimonials />
        <LandingFAQ />
      </main>
      <LandingFooter onSelectRole={handleSelectRole} />
    </div>
  );
};
