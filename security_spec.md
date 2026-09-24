# Security Specification & Threat Model

## 1. Threat Landscape & Termux Exploit Analysis
The user reported that the application is vulnerable to hacking via Termux (`Aplikasi saya bisa di Hack via Termux, Perbaiki Agar Sistem tidak bisa di Hack`).

### Termux Attack Vectors:
1. **Unrestricted Firestore REST API Exploitation**:
   - In Termux, attackers execute automated `curl` or Python requests directly against Firestore REST endpoints (`https://firestore.googleapis.com/v1/projects/{projectId}/databases/{dbId}/documents/{collection}`).
   - With previous `firestore.rules` (`allow read, write: if true;`), attackers could send unauthenticated `DELETE` or `PATCH` requests to wipe out all student lists, delete teacher records, alter attendance, or inject fake admin accounts.
2. **Denial of Wallet & Resource Exhaustion**:
   - Attackers in Termux send massive payloads (e.g., 1MB+ garbage strings or arrays) to consume storage and read/write quota.
3. **Privilege Escalation & Identity Spoofing**:
   - Attackers submit documents claiming arbitrary roles (e.g., `role: "admin"`) or overwrite another user's profile and credentials.
4. **Credential Harvesting**:
   - Storing plaintext passwords and exposing entire collections to unauthorized queries allows attackers in Termux to extract administrative and student credentials.

---

## 2. Core Data Invariants
1. **Default-Deny Catch-All**:
   - All paths not explicitly authorized are unconditionally blocked (`allow read, write: if false;`).
2. **Input & Path Variable Hardening**:
   - Every document ID must strictly match `^[a-zA-Z0-9_\-]+$` with length $\le 128$ characters (`isValidId()`).
3. **Strict Schema Blueprints (`isValid[Entity]`)**:
   - Every creation and update must enforce required keys, validate field data types, and enforce maximum string lengths.
4. **Anti-Update-Gap (`hasOnly`)**:
   - Document updates must only affect whitelisted fields and cannot mutate immutable identity keys (e.g., `id`, `studentId`, `createdAt`).
5. **No Unauthenticated Mutations on Protected School Data**:
   - Attendance, violations, grades, teacher credentials, student profiles, and system settings cannot be written by anonymous or unauthenticated actors.
6. **Public Website Read with Protected Admin Writes**:
   - School website content (`web_content`) and public branding (`settings`) can be read by visitors, but can only be modified with strict schema validation.
7. **Protected Self-Registration**:
   - New users submitting `pending_registrations` can only create records with valid schema, cannot approve themselves (`status: "approved"` is blocked), and cannot read or delete others' registrations.

---

## 3. The "Dirty Dozen" Malicious Payloads (Termux Attack Vectors)

### Payload 1: Termux Direct Unauthenticated Collection Wipe (Students)
- **Target**: `DELETE /students/student-1`
- **Context**: Unauthenticated attacker in Termux attempting to delete student records.
- **Expected Outcome**: `PERMISSION_DENIED`

### Payload 2: Privilege Escalation via Self-Registration (Admin Injection)
- **Target**: `CREATE /pending_registrations/hacked-admin`
- **Payload**:
  ```json
  {
    "id": "hacked-admin",
    "role": "admin",
    "name": "Hacker",
    "status": "approved",
    "isAdmin": true
  }
  ```
- **Context**: Termux script attempting to self-grant pre-approved admin status.
- **Expected Outcome**: `PERMISSION_DENIED`

### Payload 3: Shadow Field Injection (Backdoor Role Field in Teacher Update)
- **Target**: `UPDATE /teachers/teacher-1`
- **Payload**:
  ```json
  {
    "id": "teacher-1",
    "name": "Budi",
    "nip": "19800101",
    "role": "guru",
    "ghost_admin_field": true
  }
  ```
- **Context**: Attacker attempts a shadow update to inject unauthorized access tokens or flags.
- **Expected Outcome**: `PERMISSION_DENIED`

### Payload 4: Resource Exhaustion / Denial of Wallet (100KB Junk Payload)
- **Target**: `CREATE /attendance/att-flood-1`
- **Payload**:
  ```json
  {
    "id": "att-flood-1",
    "studentId": "std-1",
    "date": "2026-03-30",
    "status": "Hadir",
    "notes": "A".repeat(100000)
  }
  ```
- **Context**: Termux memory bomb attack attempting to consume Firestore storage quotas.
- **Expected Outcome**: `PERMISSION_DENIED`

### Payload 5: Grade Tampering Attack
- **Target**: `UPDATE /exam_grades/grade-1`
- **Payload**:
  ```json
  {
    "id": "grade-1",
    "studentId": "std-1",
    "score": 100,
    "hackedBy": "Termux-Bot"
  }
  ```
- **Context**: Unauthorized modification of exam scores from terminal.
- **Expected Outcome**: `PERMISSION_DENIED`

### Payload 6: ID Poisoning Attack (Path Traversal / Junk Characters)
- **Target**: `CREATE /students/../../hacked_system_doc`
- **Context**: Attacker attempts to escape collection hierarchy via path poisoning.
- **Expected Outcome**: `PERMISSION_DENIED`

### Payload 7: Negative Discipline Point Forgery
- **Target**: `CREATE /violations/viol-fake-1`
- **Payload**:
  ```json
  {
    "id": "viol-fake-1",
    "studentId": "std-1",
    "violationTypeId": "vt-1",
    "points": -9999
  }
  ```
- **Context**: Attacker attempts to erase disciplinary violations with invalid negative points.
- **Expected Outcome**: `PERMISSION_DENIED`

### Payload 8: Website Defacement via Unauthenticated Content Injection
- **Target**: `UPDATE /web_content/home`
- **Payload**:
  ```json
  {
    "id": "home",
    "sambutan": "<script>alert('HACKED BY TERMUX')</script>"
  }
  ```
- **Context**: Script kiddie defacement attack.
- **Expected Outcome**: `PERMISSION_DENIED`

### Payload 9: CBT Bypass PIN Overwrite
- **Target**: `UPDATE /cbt_config/pin`
- **Payload**:
  ```json
  {
    "id": "pin",
    "pin": "0000",
    "unlocked": true
  }
  ```
- **Context**: Tampering with online examination lockdown tokens.
- **Expected Outcome**: `PERMISSION_DENIED`

### Payload 10: Registration Tampering / Deletion of Other Students
- **Target**: `DELETE /pending_registrations/reg-other-student`
- **Context**: Attacker deleting competitor registrations or clearing logs.
- **Expected Outcome**: `PERMISSION_DENIED`

### Payload 11: Malicious Type Confusion (String instead of Numeric Score)
- **Target**: `CREATE /exam_grades/grade-hack-2`
- **Payload**:
  ```json
  {
    "id": "grade-hack-2",
    "studentId": "std-1",
    "score": "A_PLUS_PERFECT",
    "date": "2026-03-30"
  }
  ```
- **Context**: Causing application calculation crash through type confusion.
- **Expected Outcome**: `PERMISSION_DENIED`

### Payload 12: School Identity / Kop Surat Hijacking
- **Target**: `UPDATE /settings/headmaster`
- **Payload**:
  ```json
  {
    "id": "headmaster",
    "name": "Anonymous Attacker",
    "schoolTitle": "Defaced High School"
  }
  ```
- **Context**: Attacker forging official diplomas, student cards, and certificates.
- **Expected Outcome**: `PERMISSION_DENIED`
