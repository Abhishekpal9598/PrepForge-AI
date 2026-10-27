# PrepForge AI — Complete UI/UX Design System Specification
## Advanced Resume Intelligence Engine

**Document Version:** 2.0.0  
**Status:** Approved UI/UX Design System Specification  
**Product Name:** PrepForge AI — Advanced Resume Intelligence Engine  
**Author:** Principal Design Systems Architect & Lead UI Engineer  
**Date:** 2026-10-26  
**Theme Alignment:** Fully synchronized with PrepForge AI Dark & Light Design Tokens  

---

## 1. Design Philosophy & Core Principles

PrepForge AI provides an executive-grade, hyper-focused, transparent career intelligence environment. The design balances visual polish with high information density, ensuring candidates can rapidly digest complex ATS parsing audits, drill into granular checks, and take immediate corrective action.

### Core Principles
1. **Explainable Transparency:** Scores and issue detections are never presented as mysterious black-box numbers. Every metric is paired with an actionable explanation, visual severity badge, and clear remediation pathway.
2. **Zero Cognitive Friction:** High-density analysis is compartmentalized into structured cards, category tabs, and progressive drawers, preventing cognitive overload.
3. **Flawless Dual-Theme Parity:** Both Dark Mode (Midnight Navy SaaS) and Light Mode (Clean Slate) are first-class citizens engineered with identical semantic contrast, readable typography, and harmonious brand accents.
4. **Deterministic Feedback & Zero FOUC:** Asynchronous AI evaluations communicate state through step-by-step checklists, pulse skeletons, and non-intrusive toast notifications. Theme preference initializes before DOM mount, eliminating theme flashing.
5. **Accessibility by Default (WCAG 2.1 AA):** Minimum contrast ratio of 4.5:1 for body copy, distinct focus rings (`focus-visible:ring-2 focus-visible:ring-brand-primary`), and keyboard-navigable interactive controls.

---

## 2. Comprehensive Color Palette & Design Tokens

```
+---------------------------------------------------------------------------------------------------+
|                                 PREPFORGE AI COLOR DESIGN TOKENS                                  |
+---------------------------------------------------------------------------------------------------+
| TOKEN NAME         | DARK MODE VALUE        | LIGHT MODE VALUE       | SEMANTIC ROLE              |
|--------------------|------------------------|------------------------|----------------------------|
| background.main    | #080B14 (Midnight)     | #F8FAFC (Slate 50)     | Canvas & base background   |
| background.sidebar | #0D1220 (Deep Navy)    | #FFFFFF (Pure White)   | Navigation sidebar         |
| background.card    | #121A2B (Surface Navy) | #FFFFFF (Pure White)   | Primary card containers    |
| background.elevated| #182238 (Elevated Navy)| #F1F5F9 (Slate 100)    | Inputs, sub-cards, drawers |
| background.subtle  | #1E293B (Slate 800)    | #E2E8F0 (Slate 200)    | Secondary elevated surfaces|
| brand.primary      | #7657FF (Violet)       | #7657FF (Violet)       | Primary brand action       |
| brand.secondary    | #3985FF (Cobalt)       | #3985FF (Cobalt)       | Gradient secondary accent  |
| brand.gradient     | linear(135deg,         | linear(135deg,         | Hero badges, primary CTAs, |
|                    |   #7657FF, #3985FF)    |   #7657FF, #3985FF)    | active score gauges        |
| status.success     | #10B981 (Emerald)      | #059669 (Emerald Dark) | High score (>=80), passed  |
| status.warning     | #F59E0B (Amber)        | #D97706 (Amber Dark)   | Medium score (50-79), warn |
| status.error       | #EF4444 (Rose Red)     | #DC2626 (Crimson)      | Critical risk (<50), fail  |
| status.info        | #38BDF8 (Sky Blue)     | #0284C7 (Sky Dark)     | Advisory checks (Bias/Gap) |
| text.primary       | #F5F7FF (Off White)    | #0F172A (Slate 900)    | Headings & high-contrast   |
| text.secondary     | #929DB2 (Slate Muted)  | #64748B (Slate 500)    | Subtitles, meta, captions  |
| text.disabled      | #475569 (Slate 600)    | #94A3B8 (Slate 400)    | Inactive placeholders      |
| border.subtle      | rgba(255,255,255,0.08) | #E2E8F0 (Slate 200)    | Dividers & card boundaries  |
| border.focus       | #7657FF                | #7657FF                | Active input focus ring    |
+---------------------------------------------------------------------------------------------------+
```

---

## 3. Global Theme Architecture & Engine Requirements

### 3.1 Theme Toggle Component
* **Placement:** Positioned in the global application top header (right side, adjacent to candidate profile avatar) on *all* authenticated and public views.
* **Control:** A sleek icon button featuring Lucide icons (`Sun` for dark mode, `Moon` for light mode) with smooth transition animation (`transition-transform duration-300 rotate-0 hover:rotate-12`).
* **Tooltips:** Hover reveals descriptive label: *"Switch to Light Mode"* or *"Switch to Dark Mode"*.

### 3.2 Persistent State & FOUC Prevention
* **Storage Contract:** Key `prepforge_theme` with values `'dark' | 'light' | 'system'`.
* **Inline Bootstrap Script (`client/index.html`):**
  ```html
  <script>
    (function() {
      try {
        var theme = localStorage.getItem('prepforge_theme') || 'dark';
        var isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
        if (isDark) {
          document.documentElement.classList.add('dark');
          document.documentElement.classList.remove('light');
        } else {
          document.documentElement.classList.add('light');
          document.documentElement.classList.remove('dark');
        }
      } catch (e) {}
    })();
  </script>
  ```
* **Synchronous Context:** `ThemeContext.jsx` observes system media query changes dynamically and provides `useTheme()` across all tree nodes.

### 3.3 Theme-Aware System Components
* **Charts & Radars:** Canvas and SVG charts interpolate stroke and grid lines dynamically (dark grid: `rgba(255,255,255,0.06)`, light grid: `rgba(0,0,0,0.06)`).
* **Modals & Drawers:** Backdrop blur utilizes `backdrop-blur-md bg-black/60 dark:bg-black/70 light:bg-slate-900/40`.
* **Toast Notifications:** Theme-aware backgrounds (`#182238` in dark, `#FFFFFF` with drop shadow in light).

---

## 4. Typography Hierarchy & Spacing Tokens

* **Font Stack:** Modern geometric sans-serif: `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`.
* **Display 1 (Landing Hero):** `text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight`
* **Heading 1 (Page Title):** `text-2xl sm:text-3xl font-bold tracking-tight text-text-primary`
* **Heading 2 (Section Header):** `text-xl font-semibold tracking-tight text-text-primary`
* **Heading 3 (Card Title):** `text-base sm:text-lg font-medium text-text-primary`
* **Body Regular:** `text-sm sm:text-base font-normal leading-relaxed text-text-secondary`
* **Caption / Meta:** `text-xs font-medium text-text-secondary`
* **Code / Diff Monospace:** `font-mono text-xs sm:text-sm`

---

## 5. Specifications for All 15 Required Screens

### Screen 1: Dashboard (`/dashboard`)
* **Layout:** Top KPI row (4 StatCards: Overall ATS Score, Checks Passed, Skill Match Index, Active Applications) $\to$ Recent Analysis Showcase $\to$ Quick Action Cards (Upload New Resume, Practice Interview, Tailor to Job) $\to$ Score Trend Sparkline.
* **Tokens:** Background `#080B14` (dark) / `#F8FAFC` (light); Cards `#121A2B` / `#FFFFFF`.
* **State:** Displays persistent "Demo Preview" banner if candidate session is unlinked, preventing misleading authentication states.

### Screen 2: Resume Analyzer (`/resume-analyzer`)
* **Layout:** Dual-tab workspace ("Active Analysis" vs "Audit History"). Header contains candidate resume title, upload timestamp, and quick-action buttons ("Re-check", "Compare", "Download PDF").
* **Score Hero:** Radial score gauge with animated gradient stroke ($0-100$) paired with sub-score breakdown pill bars.

### Screen 3: Resume Checker (`/resume-analyzer#checker`)
* **Layout:** Filterable 27-check audit grid. Search input with instant debounce, category pill filter (All, ATS Essentials, Sections, Content, Tailoring, Red Flags, Bias, Seniority), and status toggles (Failed, Warnings, Passed).
* **Check Card:** Each card displays check name, ID (`CHK-XX`), severity pill (`Critical`, `High`, `Medium`, `Low`, `Info`), and one-line summary diagnosis.

### Screen 4: Resume Upload (`/resume-analyzer#upload`)
* **Layout:** Prominent drag-and-drop zone with animated upload icon. Supports drag-over state with electric violet border highlight (`border-brand-primary border-dashed`). Displays file size counter ($\le 5\text{MB}$) and accepted badge (`PDF, DOCX, TXT`).
* **Validation:** File card renders instantly upon selection with trash icon to replace before submitting.

### Screen 5: Analysis Processing (`/resume-analyzer#processing`)
* **Layout:** Centered modal/card with stepped animation sequence:
  1. *Ingesting file and verifying binary signatures...* (Icon: FileCheck)
  2. *Auditing 27 ATS compliance rules...* (Icon: SearchCheck)
  3. *Evaluating multi-factor scoring algorithms...* (Icon: Cpu)
  4. *Synthesizing grounded AI rewrites...* (Icon: Sparkles)
* **Visual:** Progress bar with linear gradient animation (`#7657FF` $\to$ `#3985FF`).

### Screen 6: ATS Score Dashboard (`/resume-analyzer#scores`)
* **Layout:** Executive metrics dashboard presenting 5 independent scores:
  1. **Overall Resume Score** (Large hero gauge).
  2. **ATS Compatibility Score** (Cap indicator if critical checks failed).
  3. **Resume Content Score** (Quantification ratio and metric density).
  4. **Resume Structure Score** (Section layout and timeline credibility).
  5. **Job Match Score** (Role alignment percentage or "N/A" prompt).

### Screen 7: 27-Point Analysis Grid View
* **Layout:** Accordion or card grid grouped by the 7 categories. Category headers display pass/total ratio badge (e.g., *"Category 1: ATS Essentials — 5/6 Passed"*).
* **Interactions:** Clicking any check row expands diagnostic summary with button: *"View Full Check Details"*.

### Screen 8: Individual Check Details Drawer / Modal
* **Layout:** Slide-over drawer ($480\text{px}$ on desktop, full-width on mobile) anchored from right:
  - Header: Check ID, Name, Category, Severity badge.
  - Section 1: *Recruiter & ATS Impact* (Why this rule matters).
  - Section 2: *Detected Instances* (Failing bullet points with red highlight markers).
  - Section 3: *Actionable Fix* (Concrete recommendation with copyable template).

### Screen 9: AI Recommendations Studio (`/resume-analyzer#recommendations`)
* **Layout:** Prioritized recommendation feed. High-severity suggestions listed first.
* **Rewrite Card:** Side-by-side diff:
  - *Original:* Strikethrough text with red tinted background.
  - *PrepForge Grounded Rewrite:* Clean text with green tinted background and bracketed metrics (`[X]%`, `[Y] users`).
  - Action buttons: "Copy Rewrite", "View Bullet Context".

### Screen 10: Job Matching Studio (`/job-match`)
* **Layout:** Split-screen layout. Left panel: Target Job Description text input and role title. Right panel: Match analysis output.
* **Match Breakdown:** Categorized badges:
  - *Matched Skills (Green):* Skills verified in both resume and JD.
  - *Missing Skills (Red):* Skills present in JD but omitted in resume.
  - *Unverified / Implied (Amber):* Skills implied but not demonstrated.

### Screen 11: Resume Comparison Matrix (`/resume-analyzer#compare`)
* **Layout:** Side-by-side version selector (Version A vs Version B).
* **Metrics:** Delta badges displaying score shifts ($\Delta +12$ Overall, $\Delta +18$ ATS).
* **Audit Diff:** "Resolved Issues" column listing previously failing checks that have passed in the latest iteration.

### Screen 12: Analysis History (`/resume-analyzer#history`)
* **Layout:** High-density data table with pagination controls.
* **Columns:** Upload Date, Filename, Overall Score, ATS Score, Issues Count, Actions (Inspect, Compare, Delete).
* **Empty State:** Friendly graphic with button: *"Upload your first resume"*.

### Screen 13: PDF Report Preview Modal
* **Layout:** Print-preview modal displaying the rendered 2-page executive summary and 27-check audit appendix.
* **Controls:** Download PDF button, Print button, Close preview.

### Screen 14: Settings (`/settings`)
* **Layout:** 3 tabs:
  1. *Appearance:* Theme selector with visual cards for Dark Mode, Light Mode, and System Default.
  2. *Security & Password:* Change password form with strength meter.
  3. *Privacy & Data Management:* 1-Click Total Account Deletion modal with double confirmation.

### Screen 15: Profile (`/profile`)
* **Layout:** Candidate profile information (Full Name, Target Job Role, Career Level, Contact Details, Verified Skill Cloud).

---

## 6. Responsive Breakpoint Behavior

```
+---------------------------------------------------------------------------------------------------+
|                                  RESPONSIVE ADAPTATION MATRIX                                     |
+---------------------------------------------------------------------------------------------------+
| BREAKPOINT    | NAVIGATION            | DASHBOARD LAYOUT          | CHECK DETAILS DRAWER          |
|---------------|-----------------------|---------------------------|-------------------------------|
| Mobile        | Bottom navigation bar | 1-column vertical stack;  | Full-screen bottom sheet with |
| (< 768px)     | or hamburger slideout | collapsed KPI cards       | drag handle and sticky close  |
|---------------|-----------------------|---------------------------|-------------------------------|
| Tablet        | Collapsible sidebar   | 2-column card grid;       | 420px slide-over drawer from  |
| (768 - 1024px)| with icon labels      | collapsible category tabs | right side                    |
|---------------|-----------------------|---------------------------|-------------------------------|
| Desktop       | Persistent left       | 3 to 4 column card grid;  | 480px slide-over drawer with  |
| (>= 1024px)   | sidebar (260px)       | split-pane diff view      | rich code block diffs         |
+---------------------------------------------------------------------------------------------------+
```

---

## 7. Accessibility Specifications (WCAG 2.1 AA)

1. **Color Contrast:** All body text meets or exceeds a $4.5:1$ contrast ratio against its surface in both Dark Mode (`#F5F7FF` on `#121A2B`) and Light Mode (`#0F172A` on `#FFFFFF`).
2. **Keyboard Navigation:** All interactive cards, tabs, and buttons are focusable via `Tab` with an electric violet outline (`ring-2 ring-brand-primary ring-offset-2`).
3. **Screen Reader Optimization:** Every check status badge includes an accessible `aria-label` (e.g., `aria-label="Check CHK-11 Quantified Achievements: Failed with High Severity"`).
4. **Motion Preferences:** Respects user's OS preference (`motion-reduce:transition-none motion-reduce:animate-none`).
