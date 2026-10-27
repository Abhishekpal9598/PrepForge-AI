import React, { useState } from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  HelpCircle, 
  ChevronDown, 
  ChevronUp, 
  FileText, 
  Lightbulb,
  Shield,
  Layers
} from 'lucide-react';

import { getStatusConfig as getStatusBaseConfig, getSeverityBadge } from './resumeConstants.js';

const STATUS_ICONS = {
  PASS: CheckCircle2,
  WARNING: AlertTriangle,
  FAIL: AlertCircle,
  NOT_EVALUATED: HelpCircle,
};

export const getStatusConfig = (status) => {
  const base = getStatusBaseConfig(status);
  return {
    ...base,
    icon: STATUS_ICONS[status] || HelpCircle,
  };
};

export { getSeverityBadge };

/**
 * CheckResultItem Component
 * Single expandable item representing one of the 27 deterministic checks.
 */
export const CheckResultItem = ({ check, defaultExpanded = false }) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  if (!check) return null;

  const {
    checkId,
    title,
    status = 'NOT_EVALUATED',
    severity = 'medium',
    categoryName,
    categoryId,
    score,
    description,
    evidence,
    explanation,
    remediation,
  } = check;

  const statusCfg = getStatusConfig(status);
  const StatusIcon = statusCfg.icon;

  // Format evidence as string or lines
  const renderEvidence = () => {
    if (!evidence || (Array.isArray(evidence) && evidence.length === 0)) {
      return null;
    }

    if (Array.isArray(evidence)) {
      return (
        <div className="space-y-1">
          {evidence.map((item, idx) => (
            <div key={idx} className="p-2 rounded bg-[#182238] font-mono text-[11px] text-[#CBD5E1] border border-[#334155]/60 overflow-x-auto">
              {typeof item === 'object' ? JSON.stringify(item, null, 2) : String(item)}
            </div>
          ))}
        </div>
      );
    }

    if (typeof evidence === 'object') {
      return (
        <pre className="p-2.5 rounded bg-[#182238] font-mono text-[11px] text-[#CBD5E1] border border-[#334155]/60 overflow-x-auto">
          {JSON.stringify(evidence, null, 2)}
        </pre>
      );
    }

    return (
      <div className="p-2.5 rounded bg-[#182238] font-mono text-[11px] text-[#CBD5E1] border border-[#334155]/60">
        "{String(evidence)}"
      </div>
    );
  };

  return (
    <div className={`rounded-xl border transition-all duration-200 overflow-hidden ${
      isExpanded 
        ? 'bg-[#0D1220] border-[#7657FF]/60 shadow-md ring-1 ring-[#7657FF]/20' 
        : 'bg-[#0D1220]/80 border-[#334155]/80 hover:border-[#475569]'
    }`}>
      {/* Clickable Header Row */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-3.5 flex items-center justify-between gap-3 cursor-pointer select-none"
      >
        <div className="flex items-center gap-3 min-w-0">
          {/* Status Icon */}
          <div className={`p-1.5 rounded-lg flex-shrink-0 ${statusCfg.badgeClass} border`}>
            <StatusIcon className="w-4 h-4" />
          </div>

          <div className="min-w-0 text-left">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-[11px] font-bold text-[#B49DFF]">
                {checkId}
              </span>
              <h5 className="text-xs font-bold text-[#F8FAFC] truncate">
                {title || checkId}
              </h5>
              {severity && (
                <span className={`text-[9px] font-semibold uppercase px-1.5 py-0.2 rounded border ${getSeverityBadge(severity)}`}>
                  {severity}
                </span>
              )}
            </div>

            {description && (
              <p className="text-[11px] text-[#94A3B8] truncate mt-0.5">
                {description}
              </p>
            )}
          </div>
        </div>

        {/* Right side: Status badge + Score + Toggle */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusCfg.badgeClass}`}>
            {statusCfg.label}
          </span>

          {status !== 'NOT_EVALUATED' && typeof score === 'number' && (
            <span className="text-xs font-mono font-bold text-[#F8FAFC] bg-[#1E293B] px-2 py-0.5 rounded border border-[#334155]">
              {score}/100
            </span>
          )}

          <div className="p-1 rounded text-[#94A3B8] hover:text-[#F8FAFC]">
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>
      </div>

      {/* Expanded Details Body */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-2 border-t border-[#334155]/60 space-y-3 text-left text-xs">
          {/* Category & Metadata Info */}
          <div className="flex items-center gap-2 text-[11px] text-[#94A3B8]">
            <Layers className="w-3.5 h-3.5 text-[#7657FF]" />
            <span>Category: <strong className="text-[#F8FAFC]">{categoryName || categoryId}</strong></span>
          </div>

          {/* Detailed Explanation */}
          {explanation && (
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-[#CBD5E1] flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[#3985FF]" /> Detailed Audit Findings
              </span>
              <p className="text-[#94A3B8] leading-relaxed bg-[#121A2B] p-2.5 rounded-lg border border-[#334155]/60">
                {explanation}
              </p>
            </div>
          )}

          {/* Evidence Excerpt from Resume */}
          {evidence && (
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-[#CBD5E1] flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-[#F59E0B]" /> Identified Resume Evidence
              </span>
              {renderEvidence()}
            </div>
          )}

          {/* Actionable Remediation / Suggestion */}
          {remediation && (
            <div className="space-y-1 pt-1">
              <span className="text-[11px] font-semibold text-[#10B981] flex items-center gap-1.5">
                <Lightbulb className="w-3.5 h-3.5 text-[#10B981]" /> Actionable Recommendation
              </span>
              <div className="p-2.5 rounded-lg bg-[#10B981]/10 border border-[#10B981]/25 text-[#D1FAE5] leading-relaxed">
                {remediation}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CheckResultItem;
