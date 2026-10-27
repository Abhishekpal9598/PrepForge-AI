import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  BookOpen, 
  Search, 
  Filter, 
  ArrowRight, 
  Sparkles, 
  Clock, 
  Award,
  Layers
} from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';

/**
 * PrepForge AI - Question Bank Page (Demo Shell)
 */
export const QuestionBankPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const questions = [
    {
      id: 'q-1',
      title: 'Design a Distributed Unique ID Generator (Snowflake)',
      category: 'System Design',
      difficulty: 'Senior',
      duration: '45 mins',
      tags: ['Distributed Systems', 'High Availability', 'Clock Drift'],
    },
    {
      id: 'q-2',
      title: 'Tell me about a time you made an architectural decision that was later proven wrong.',
      category: 'Behavioral',
      difficulty: 'Staff',
      duration: '30 mins',
      tags: ['STAR', 'Accountability', 'Technical Leadership'],
    },
    {
      id: 'q-3',
      title: 'LRU Cache Implementation with O(1) Get and Put Operations',
      category: 'Algorithms',
      difficulty: 'Mid Level',
      duration: '35 mins',
      tags: ['Data Structures', 'Hash Map', 'Doubly Linked List'],
    },
    {
      id: 'q-4',
      title: 'Design a Real-Time Collaborative Document Editing Engine (Operational Transformation / CRDTs)',
      category: 'System Design',
      difficulty: 'Staff',
      duration: '50 mins',
      tags: ['WebSockets', 'Concurrency', 'CRDTs'],
    },
    {
      id: 'q-5',
      title: 'How do you prioritize technical debt against urgent feature delivery requirements?',
      category: 'Behavioral',
      difficulty: 'Senior',
      duration: '25 mins',
      tags: ['STAR', 'Product Alignment', 'Tech Debt'],
    },
  ];

  const filtered = questions.filter((q) => {
    const matchesSearch = q.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || q.category.toLowerCase().includes(selectedCategory.toLowerCase());
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-8">
      <PageHeader
        title="Curated Question Bank"
        subtitle="Explore vetted technical and behavioral interview questions categorized by track and seniority."
        badgeText="Demo Mode"
      />

      {/* Search and Category Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search questions by keyword or topic..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            icon={Search}
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {['all', 'system design', 'behavioral', 'algorithms'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold capitalize whitespace-nowrap transition-colors border ${
                selectedCategory === cat
                  ? 'bg-brand-primary text-white border-brand-primary'
                  : 'bg-dark-card text-text-secondary border-border-subtle hover:text-text-primary hover:border-border-strong'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Question Cards List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs text-text-secondary">
          <span>Showing {filtered.length} questions</span>
          <span className="text-[10px] bg-dark-elevated px-2 py-0.5 rounded border border-border-subtle">
            Illustrative Demo Bank
          </span>
        </div>

        {filtered.map((item) => (
          <Card key={item.id} hover className="p-5 bg-dark-card border-border-subtle space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-brand-primary/15 text-brand-primary border border-brand-primary/25">
                  {item.category}
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-dark-elevated text-text-secondary border border-border-subtle">
                  {item.difficulty}
                </span>
                <span className="text-[11px] text-text-secondary flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {item.duration}
                </span>
              </div>

              <Link to="/mock-interviews">
                <Button variant="primary" size="sm" rightIcon={ArrowRight}>
                  Practice with AI
                </Button>
              </Link>
            </div>

            <h3 className="text-sm sm:text-base font-bold text-text-primary">
              {item.title}
            </h3>

            <div className="flex flex-wrap gap-1.5 pt-1">
              {item.tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded text-[10px] font-medium bg-dark-base text-text-secondary border border-border-subtle"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
