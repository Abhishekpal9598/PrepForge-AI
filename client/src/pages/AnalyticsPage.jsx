import React from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Award, 
  Target, 
  CheckCircle2, 
  Sparkles 
} from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { StatCard } from '../components/StatCard';

/**
 * PrepForge AI - Analytics Page (Demo Shell)
 */
export const AnalyticsPage = () => {
  const competencies = [
    { name: 'System Architecture & Modularity', score: 92, status: 'Staff Ready' },
    { name: 'Distributed Trade-offs (CAP, ACID)', score: 86, status: 'Senior Ready' },
    { name: 'STAR Behavioral Communication', score: 85, status: 'Senior Ready' },
    { name: 'Data Structures & Algorithmic Complexity', score: 88, status: 'Senior Ready' },
    { name: 'Failure Modes & Resilience Design', score: 82, status: 'Solid' },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Performance Analytics & Competency Radar"
        subtitle="Track your technical and behavioral interview progression across competencies."
        badgeText="Demo Mode"
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <StatCard
          label="Composite Readiness"
          value="86/100"
          trend="+8% overall"
          trendPositive={true}
          icon={Target}
          subtext="Target: Senior SWE"
          isDemo={true}
        />
        <StatCard
          label="Rubric Accuracy"
          value="91%"
          trend="+3% accuracy"
          trendPositive={true}
          icon={Award}
          subtext="Model answer alignment"
          isDemo={true}
        />
        <StatCard
          label="Evaluated Bullets"
          value="48"
          trend="12 sessions"
          trendPositive={true}
          icon={BarChart3}
          subtext="Average grade: 86%"
          isDemo={true}
        />
      </div>

      {/* Competency Mastery Breakdown */}
      <Card className="space-y-6 bg-dark-card border-border-subtle">
        <div className="flex items-center justify-between border-b border-border-subtle pb-3">
          <h3 className="text-sm font-bold text-text-primary">
            Competency Mastery Breakdown
          </h3>
          <span className="text-[10px] bg-dark-elevated px-2 py-0.5 rounded text-text-secondary border border-border-subtle">
            Illustrative Demo Metrics
          </span>
        </div>

        <div className="space-y-4">
          {competencies.map((comp, i) => (
            <div key={i} className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-text-primary">{comp.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-text-secondary text-[11px]">{comp.status}</span>
                  <span className="font-bold text-status-success">{comp.score}%</span>
                </div>
              </div>
              <div className="w-full h-2.5 bg-dark-sidebar rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-brand-primary to-brand-secondary rounded-full"
                  style={{ width: `${comp.score}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
