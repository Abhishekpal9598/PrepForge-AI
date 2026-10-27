import React, { useState, useMemo } from 'react';
import { 
  Filter, 
  Search, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  HelpCircle,
  Briefcase,
  Layers,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { CheckCategoryCard, CATEGORY_META } from './CheckCategoryCard';
import { CheckResultItem } from './CheckResultItem';

/**
 * ChecksExplorer Component
 * Complete interactive interface for exploring all 27 deterministic resume checks.
 */
export const ChecksExplorer = ({
  checks = [],
  categoryBreakdown = [],
  checkSummary,
  onRecheck,
  onOpenTargetRoleModal,
  isRechecking = false,
  targetRole,
}) => {
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandAll, setExpandAll] = useState(false);

  // Filter checks based on category, status, and search query
  const filteredChecks = useMemo(() => {
    return checks.filter((check) => {
      // Category filter
      if (selectedCategory !== 'ALL' && check.categoryId !== selectedCategory) {
        return false;
      }

      // Status filter
      if (selectedStatus !== 'ALL' && check.status !== selectedStatus) {
        return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesId = (check.checkId || '').toLowerCase().includes(q);
        const matchesTitle = (check.title || '').toLowerCase().includes(q);
        const matchesDesc = (check.description || '').toLowerCase().includes(q);
        const matchesExpl = (check.explanation || '').toLowerCase().includes(q);
        if (!matchesId && !matchesTitle && !matchesDesc && !matchesExpl) {
          return false;
        }
      }

      return true;
    });
  }, [checks, selectedCategory, selectedStatus, searchQuery]);

  // Compute category card statistics
  const categoriesList = useMemo(() => {
    const catKeys = ['CAT-01', 'CAT-02', 'CAT-03', 'CAT-04', 'CAT-05', 'CAT-06', 'CAT-07'];
    return catKeys.map((catId) => {
      const catChecks = checks.filter((c) => c.categoryId === catId);
      const passed = catChecks.filter((c) => c.status === 'PASS').length;
      const warning = catChecks.filter((c) => c.status === 'WARNING').length;
      const failed = catChecks.filter((c) => c.status === 'FAIL').length;
      const notEvaluated = catChecks.filter((c) => c.status === 'NOT_EVALUATED').length;

      // Match breakdown score from backend if available
      const backendCat = categoryBreakdown.find((b) => b.categoryId === catId);
      const score = backendCat ? backendCat.score : (catChecks.length > 0 && notEvaluated < catChecks.length ? Math.round((passed / Math.max(1, catChecks.length - notEvaluated)) * 100) : null);

      return {
        categoryId: catId,
        categoryName: CATEGORY_META[catId]?.name || catId,
        totalChecks: catChecks.length,
        passed,
        warning,
        failed,
        notEvaluated,
        score,
      };
    });
  }, [checks, categoryBreakdown]);

  return (
    <div className="space-y-6 text-left">
      {/* 1. Category Summary Cards Carousel / Grid */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-[#F8FAFC] flex items-center gap-2 uppercase tracking-wider">
            <Layers className="w-4 h-4 text-[#7657FF]" />
            <span>Seven Deterministic Categories</span>
          </h3>

          <div className="flex items-center gap-2">
            {onOpenTargetRoleModal && (
              <button
                onClick={onOpenTargetRoleModal}
                className="px-2.5 py-1 text-xs font-medium text-[#CBD5E1] bg-[#1E293B] border border-[#334155] rounded-lg hover:border-[#7657FF] transition-all flex items-center gap-1.5"
              >
                <Briefcase className="w-3.5 h-3.5 text-[#F59E0B]" />
                <span>{targetRole ? `Target: ${targetRole}` : 'Set Target Role / JD'}</span>
              </button>
            )}

            {onRecheck && (
              <button
                onClick={onRecheck}
                disabled={isRechecking}
                className="px-2.5 py-1 text-xs font-semibold text-[#B49DFF] bg-[#7657FF]/15 border border-[#7657FF]/35 rounded-lg hover:bg-[#7657FF]/25 transition-all flex items-center gap-1.5"
                title="Force re-evaluation of all 27 checks"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRechecking ? 'animate-spin' : ''}`} />
                <span>{isRechecking ? 'Evaluating...' : 'Re-check'}</span>
              </button>
            )}
          </div>
        </div>

        {/* 7 Category Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {categoriesList.map((cat) => (
            <CheckCategoryCard
              key={cat.categoryId}
              {...cat}
              isSelected={selectedCategory === cat.categoryId}
              onClick={() => {
                setSelectedCategory(selectedCategory === cat.categoryId ? 'ALL' : cat.categoryId);
              }}
            />
          ))}
        </div>
      </div>

      {/* 2. Interactive Filter Bar */}
      <div className="p-4 rounded-xl bg-[#0D1220] border border-[#334155] space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
            <input
              type="text"
              placeholder="Search check title, ID, or keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-[#182238] border border-[#334155] text-xs text-[#F8FAFC] placeholder:text-[#64748B] focus:border-[#7657FF] outline-none"
            />
          </div>

          {/* Status Filter Buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-[#94A3B8] mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3" /> Status:
            </span>

            {[
              { id: 'ALL', label: 'All', count: checks.length },
              { id: 'PASS', label: 'Pass', count: checkSummary?.passedCount },
              { id: 'WARNING', label: 'Warn', count: checkSummary?.warningCount },
              { id: 'FAIL', label: 'Fail', count: checkSummary?.failedCount },
              { id: 'NOT_EVALUATED', label: 'N/E', count: checkSummary?.notEvaluatedCount },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setSelectedStatus(st.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  selectedStatus === st.id
                    ? 'bg-[#7657FF] text-white shadow-sm'
                    : 'bg-[#182238] text-[#94A3B8] hover:text-[#F8FAFC] border border-[#334155]'
                }`}
              >
                <span>{st.label}</span>
                {typeof st.count === 'number' && (
                  <span className="ml-1 text-[10px] opacity-80">({st.count})</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-0.5 border-t border-[#334155]/60">
          <span className="text-[11px] text-[#94A3B8] whitespace-nowrap">Category:</span>
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-all whitespace-nowrap ${
              selectedCategory === 'ALL'
                ? 'bg-[#7657FF]/20 text-[#B49DFF] border border-[#7657FF]/40'
                : 'text-[#94A3B8] hover:text-[#F8FAFC]'
            }`}
          >
            All 27 Checks
          </button>
          {categoriesList.map((cat) => (
            <button
              key={cat.categoryId}
              onClick={() => setSelectedCategory(cat.categoryId)}
              className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-all whitespace-nowrap ${
                selectedCategory === cat.categoryId
                  ? 'bg-[#7657FF]/20 text-[#B49DFF] border border-[#7657FF]/40'
                  : 'text-[#94A3B8] hover:text-[#F8FAFC]'
              }`}
            >
              {cat.categoryId}: {cat.categoryName}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Filtered Check List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-[#94A3B8]">
          <span>
            Showing <strong className="text-[#F8FAFC]">{filteredChecks.length}</strong> of {checks.length} Checks
          </span>
          <button
            onClick={() => setExpandAll(!expandAll)}
            className="text-[11px] text-[#B49DFF] hover:underline flex items-center gap-1"
          >
            {expandAll ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" /> Collapse All
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5" /> Expand All Details
              </>
            )}
          </button>
        </div>

        {filteredChecks.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#94A3B8] bg-[#0D1220] rounded-xl border border-[#334155]/60 space-y-2">
            <p>No checks match your active filter criteria.</p>
            <button
              onClick={() => {
                setSelectedCategory('ALL');
                setSelectedStatus('ALL');
                setSearchQuery('');
              }}
              className="text-[#7657FF] hover:underline font-semibold"
            >
              Reset all filters
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredChecks.map((check) => (
              <CheckResultItem
                key={check.checkId}
                check={check}
                defaultExpanded={expandAll}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChecksExplorer;
