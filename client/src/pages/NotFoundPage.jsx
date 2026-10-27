import React from 'react';
import { Link } from 'react-router-dom';
import { Home, LayoutDashboard, ArrowLeft } from 'lucide-react';
import { BrandLogo } from '../components/BrandLogo';
import { Button } from '../components/Button';
import { Card } from '../components/Card';

/**
 * PrepForge AI - Redesigned 404 Error Page
 */
export const NotFoundPage = () => {
  return (
    <div className="min-h-[calc(100vh-10rem)] flex items-center justify-center p-4 sm:p-8 bg-dark-base relative overflow-hidden">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[28rem] h-[28rem] bg-brand-primary/10 rounded-full blur-3xl pointer-events-none" />

      <Card className="max-w-md w-full text-center p-8 sm:p-10 space-y-6 bg-dark-sidebar/90 border-border-subtle relative z-10 shadow-2xl">
        <div className="flex justify-center">
          <BrandLogo size="md" />
        </div>

        <div className="space-y-2">
          <span className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-brand-primary to-brand-secondary">
            404
          </span>
          <h1 className="text-xl font-extrabold text-text-primary tracking-tight">
            Page Not Found
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
            The page you are navigating to does not exist or has been relocated within the PrepForge AI workspace.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link to="/" className="w-full sm:w-auto">
            <Button variant="primary" size="sm" leftIcon={Home} className="w-full sm:w-auto">
              Back to Home
            </Button>
          </Link>
          <Link to="/dashboard" className="w-full sm:w-auto">
            <Button variant="secondary" size="sm" leftIcon={LayoutDashboard} className="w-full sm:w-auto">
              Demo Workspace
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
};
