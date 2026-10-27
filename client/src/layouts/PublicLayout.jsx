import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';

/**
 * Public Layout for PrepForge AI website and landing routes
 */
export const PublicLayout = () => {
  return (
    <div className="min-h-screen flex flex-col bg-dark-base text-text-primary selection:bg-brand-primary/30 selection:text-white">
      <Navbar />
      <main className="flex-1 w-full">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};
