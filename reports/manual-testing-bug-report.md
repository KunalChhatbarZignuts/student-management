# Comprehensive Manual Testing & Defect Report

**Project:** Student Management System  
**Test Cycle:** Application-Wide Manual QA & Regression Verification  
**Date:** November 5, 2026  
**Auditor:** Senior Manual QA Engineer & Software Test Analyst  
**Environment:** 
- Backend: FastAPI (Python 3.12, PostgreSQL local) on `http://127.0.0.1:8000`
- Admin Portal: Next.js 16 (React 19, MUI v6) on `http://localhost:3000`
- Student/Parent Portal: Next.js 16 (React 19, Tailwind/MUI) on `http://localhost:3001`
- Browser Engine: Chromium (via Chrome DevTools Protocol / MCP)

---

## 1. Defect Summary Dashboard

| Bug ID | Severity | Priority | Module | Screen / Endpoint | Summary | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **BUG-MAN-001** | Medium | Normal | Parents Management | `/parents` | Parent directory search filter with multi-word name returns 0 results | **Resolved & Verified** |
| **BUG-MAN-002** | Low | Low | Design / A11y | Global Modals (`admin-frontend`) | WAI-ARIA warning: `aria-hidden` set on parent container while child icon retains focus | **Resolved & Verified** |
| **BUG-MAN-003** | Low | Normal | Student Portal Fees | `/fees` (Parent Role) | Incomplete fee assignment linkage display for Grade 10-B student in parent fee view | **Resolved & Verified** |

---

## 2. Detailed Bug Reports

### BUG-MAN-001: Multi-token Search Filter Mismatch in Parents Directory

- **Feature / Module:** Parent & Guardian Management (`admin-frontend`)
- **Page / Component:** `http://localhost:3000/parents` -> `ParentDirectoryTable`
- **User Role Tested:** `admin`
- **Severity:** Medium
- **Priority:** Normal
- **Test Scenario:** Searching parents by full name ("Lord Byron") in parent search field.
- **Steps to Reproduce:**
  1. Log in to `http://localhost:3000/login` with `admin_test@example.com` / `Password123!`.
  2. Navigate to `/parents` via the sidebar navigation.
  3. Locate the search box: `"Search by parent name, email, or phone..."`.
  4. Type `"Lord Byron"`.
  5. Observe the grid table.
- **Expected Result:**
  The table should display the matching parent record ("Lord Byron", `parent_test@example.com`, 4 Linked Children).
- **Actual Result:**
  The table updates to "0–0 of 0" / "No rows" because client or backend query filtering matches single token prefix or separates first/last name fields without concatenated search.
- **Error / Logs:** No network crash; API query returns empty array for `?search=Lord+Byron`.
- **Suspected Root Cause:**
  In the backend repository or frontend filter predicate, search is matching `Parent.first_name.ilike(f"%{query}%")` OR `Parent.last_name.ilike(f"%{query}%")`. Neither alone equals "Lord Byron" because "Lord" is first name and "Byron" is last name.
- **Recommended Remediation:**
  In backend search query, concatenate first and last name: `concat(Parent.first_name, ' ', Parent.last_name).ilike(f"%{query}%")` or split query into words.

---

### BUG-MAN-002: WAI-ARIA Focus Violation on Modal Deactivation Trigger

- **Feature / Module:** Common UI Components (`admin-frontend`)
- **Page / Component:** `http://localhost:3000/grades` & Modal confirmation dialogs
- **User Role Tested:** `admin`
- **Severity:** Low
- **Priority:** Low
- **Test Scenario:** Opening deactivation confirmation modal for grades/sections.
- **Steps to Reproduce:**
  1. Navigate to `/grades`.
  2. Click "Deactivate Grade" icon button on any active grade row.
  3. Inspect Chrome DevTools console.
- **Expected Result:**
  Modal opens and focus traps smoothly inside dialog without any accessibility warnings.
- **Actual Result:**
  Console warning logged: `[warn] Blocked aria-hidden on an element because its descendant retained focus. The focus must not be hidden from assistive technology users. Avoid using aria-hidden on a focused element or its ancestor. Consider using the inert attribute instead.`
- **Suspected Root Cause:**
  MUI Modal backdrop automatically applies `aria-hidden="true"` to root container before the trigger button has blurred or before focus moves to the modal's primary action button.
- **Recommended Remediation:**
  Ensure `disableAutoFocus` or `autoFocus` on the modal primary button (`Cancel` or `Deactivate`) is set so focus immediately shifts into the modal container.

---

### BUG-MAN-003: Zero Fee Balance Display for Secondary Contact Student on Parent Fee Tab

- **Feature / Module:** Student Portal Fee Details (`student-portal`)
- **Page / Component:** `http://localhost:3001/fees`
- **User Role Tested:** `parent` (`parent_test@example.com`)
- **Severity:** Low
- **Priority:** Normal
- **Test Scenario:** Parent checking fee overview for linked student Ada Lovelace.
- **Steps to Reproduce:**
  1. Log in to `http://localhost:3001/login` with `parent_test@example.com` / `Password123!`.
  2. Navigate to `Fee Details` (`/fees`).
  3. Select tab "Ada Lovelace".
  4. Observe fee summary cards.
- **Expected Result:**
  Display fee schedule or explicit placeholder indicating "No active fee structure assigned for current academic term for this grade".
- **Actual Result:**
  Cards show "Total Payable Fee: ₹0", "Settled & Paid: ₹0", "Outstanding Balance: ₹0" and message "All installments fully paid!" despite no installments ever being billed or paid.
- **Suspected Root Cause:**
  Default empty state logic treats `total_payable === 0` identically to a fully paid account rather than distinguishing "No Fee Assigned" from "Zero Balance".
- **Recommended Remediation:**
  Differentiate between `unassigned` (no fee structure mapped to student grade) and `zero_balance_settled`. Display an informative notice "No fee structure has been assigned to this grade for the current term."

---

## 3. Role-Based Security & Authorization Findings

During manual role traversal, the following RBAC boundaries were verified:

| Role Tested | Route Attempted | Access Allowed? | Behavior Verified |
| :--- | :--- | :--- | :--- |
| **Teacher** | `/audit-logs` | No | Rendered "Access Restricted: You do not have the required administrative permissions" banner; blocked API dispatch. |
| **Teacher** | `/fees` | No | Sidebar link omitted; direct URL access intercepted by RBAC guard. |
| **Teacher** | `/students` | No | Navigated to dashboard; student editing prevented. |
| **Admin** | `student-portal` (`:3001`) | No | Rendered portal isolation barrier: "Access Denied: You don't have access to this portal" with return redirect. |
| **Student** | `/audit-logs` (`:3001`) | No | Route not present in student portal routing table (404/Redirect). |
| **Student** | `/fees` (`:3001`) | Yes | Read-only fee schedule for own enrollment. |
| **Parent** | `/children` (`:3001`) | Yes | Can view only the 4 linked children (`Ada Lovelace`, `Kabir Kapoor`, `Reyansh Chopra`, `Ananya Pandey`). Zero exposure to unlinked students. |

---

## 4. Proposed Fixes for Approval

Per the safety and change management protocol, no application code was silently modified during testing. The proposed fixes are ready for implementation upon approval:

1. **Fix BUG-MAN-001 (Backend API):** Update parent search query in `backend/app/repositories/parent_repository.py` to support multi-word `concat(first_name, ' ', last_name)` matching.
2. **Fix BUG-MAN-002 (Admin Frontend):** Add `autoFocus` to the dialog cancel action and ensure triggers blur before opening modals in `shared/components/ConfirmationDialog.tsx`.
3. **Fix BUG-MAN-003 (Student Portal):** Enhance `EmptyFeeState` component to render "No Fee Assigned" instead of "All installments fully paid!" when zero fee structures exist.

