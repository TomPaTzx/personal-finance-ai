# SCHEMA: SQLite Database Specification (v2)

> Data Definition Language (DDL) และโครงสร้างตารางข้อมูลของ `finance.db`

```sql
-- 1. Accounts (กระเป๋าและบัญชีการเงิน)
CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- SALARY, SPENDING, EMERGENCY, DEBT_HUB, INVESTMENT
  purpose TEXT,
  balance REAL NOT NULL DEFAULT 0.0,
  currency TEXT DEFAULT 'THB',
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Debts (ภาระหนี้สินและการผ่อนชำระรายชิ้น)
CREATE TABLE IF NOT EXISTS debts (
  id TEXT PRIMARY KEY,
  item_name TEXT NOT NULL,
  category TEXT NOT NULL, -- GADGET, VEHICLE, EDUCATION, HOUSING, PERSONAL
  total_amount REAL NOT NULL,
  remaining_amount REAL NOT NULL,
  monthly_payment REAL NOT NULL,
  total_installments INTEGER NOT NULL,
  remaining_installments INTEGER NOT NULL,
  interest_rate REAL DEFAULT 0.0,
  linked_account_id TEXT REFERENCES accounts(id),
  status TEXT DEFAULT 'ACTIVE', -- ACTIVE, COMPLETED, REFINANCED
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. Pipeline Drops (การปล่อยของ / ไอเดีย / สลิป / คำปรึกษา)
CREATE TABLE IF NOT EXISTS pipeline_drops (
  id TEXT PRIMARY KEY,
  hash TEXT UNIQUE NOT NULL, -- SHA256 (16-char prefix)
  raw_text TEXT NOT NULL,
  drop_type TEXT NOT NULL, -- PURCHASE_DECISION, SLIP_RECEIPT, DEBT_UPDATE, INCOME_LOG, PARKED_LITE
  amount REAL,
  category TEXT,
  status TEXT NOT NULL DEFAULT 'NEW', -- NEW, TRIAGED, ANALYZED, DECIDED, ARCHIVED
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 4. Verdicts (ผลการวิเคราะห์จาก Dual Advisors)
CREATE TABLE IF NOT EXISTS verdicts (
  id TEXT PRIMARY KEY,
  drop_id TEXT NOT NULL REFERENCES pipeline_drops(id),
  sonar_feasibility_score REAL, -- 0-5
  sonar_analysis TEXT,
  best_risk_score REAL, -- 0-5
  best_analysis TEXT,
  value_score REAL, -- 0-5
  overall_recommendation TEXT, -- APPROVED, CONDITIONAL, PARKED, REJECTED
  decision_final TEXT, -- APPROVED, PARKED, REJECTED (Set by User)
  money_saved REAL DEFAULT 0.0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 5. Transactions (ประวัติรายรับ-รายจ่าย)
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  account_id TEXT REFERENCES accounts(id),
  type TEXT NOT NULL, -- INCOME, EXPENSE, TRANSFER, DEBT_PAYMENT
  amount REAL NOT NULL,
  category TEXT NOT NULL,
  note TEXT,
  slip_hash TEXT,
  date DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 6. Audit Trail Events (ประวัติการเปลี่ยนแปลงห้ามลบ)
CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  event_action TEXT NOT NULL, -- DROP_CREATED, VERDICT_GENERATED, DECISION_EXECUTED, ACCOUNT_ADJUSTED
  payload_json TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 7. FTS5 Virtual Table (ค้นหา Full-Text Search)
CREATE VIRTUAL TABLE IF NOT EXISTS drops_fts USING fts5(
  drop_id UNINDEXED,
  raw_text,
  category
);
```
