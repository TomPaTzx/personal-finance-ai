# GRAFT: Code Architecture & Directory Map

> แผนผังโค้ดและความสัมพันธ์ของโมดูลทั้งหมดในระบบ

```
personal-finance-ai/
├── PROJECT.md
├── AGENTS.md
├── SOT.md
├── ROADMAP.md
├── UX.md
├── SCHEMA.md
├── RTK.md
├── PIN_MESSAGE.md
├── graft/
│   └── architecture.md
├── src/
│   ├── main.jsx                     # Application Entry Point
│   ├── App.jsx                      # Main Shell (Navbar, Layout, Routing)
│   ├── types/
│   │   └── finance.js               # Data Types & DTOs
│   ├── services/
│   │   ├── storageService.js        # SQLite / IndexedDB Persistent SOT Storage
│   │   ├── triageEngine.js          # Dedup Hash SHA256 & Intake Triage
│   │   ├── advisorEngine.js         # Sonar (Fact) & Best (Risk) Dual AI Analyzers
│   │   └── slipParserService.js     # Slip & Receipt Ingestion Simulator
│   ├── components/
│   │   ├── PipelineView.jsx         # Visual Interactive Pipeline ("ปล่อยของ" -> Advisors -> Verdict)
│   │   ├── DecisionGateModal.jsx    # Interactive Decision Maker for นายท่าน
│   │   ├── AccountsManager.jsx      # Multi-Account Cashflow Hub
│   │   ├── DebtTracker.jsx          # Itemized Debt & 0% Installment Planner
│   │   ├── SlipScanner.jsx          # Receipt / Slip Drop Zone & OCR Parser
│   │   ├── NetWorthDashboard.jsx    # Net Worth, DTI & Financial Health Metrics
│   │   └── ScaffoldDocViewer.jsx    # Live Viewer for 8 Memory Scaffold Documents
│   └── styles/
│       └── index.css                # Deep Cyber-Dark Glassmorphism Design System
├── index.html
├── package.json
└── vite.config.js
```
