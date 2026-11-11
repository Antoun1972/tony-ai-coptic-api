# TONY AI ICT Manager Cloud — المدرس الأول

This is a school-scoped cloud web client. It is not a finished official school product or a replacement for previous V6 Android/Windows apps.

**Role:** Senior ICT Teacher (مدرس أول), **NOT** head of department (رئيس قسم). Technical database role remains `head` due to an existing enum; the app displays Senior Teacher.

Cloud backend: existing Lovable Cloud / Supabase project. The client config contains only a **publishable** public project key, never a service-role key. School information is only available to users with confirmed email and active membership under Row-Level Security (RLS). No users are automatically promoted.

## Install and run
- Open `index.html` over HTTPS hosting; do not embed the web project into existing unsigned EXE/APK installers.
- To start a school, sign up, verify email, and have the authorized database owner provision the first Senior Teacher via trusted back-office SQL (no public self-service).
- The `تجربة الواجهة` button uses fictional local-only data.
- The backend has tables for staff, staff_private, academic_years, classes, assignments, progress_entries, documents, meetings, questions, exams, membership/invitations, branding and audit_log.
- Cloud operations require online access. Data is reloaded on focus and every 22 seconds. This is **polling**, not realtime WebSocket push.
- Confidential staff data must NOT be entered before security and RLS tests are completed and the school approves hosting.

## Functional scope
Authentication; private school records after membership; add and archive staff; years/classes; lesson updates with Week and Evaluation as separate fields; paste WhatsApp text to generate **suggestions only**; private source document uploads; questions and approval; A/B/C exam drafts; browser A4 print preview; printable model answers; Word-compatible **.doc** output (NOT .docx); school branding; meeting minutes; invites after manual communication.

Not implemented: PDF-image OCR, AI semantic verification, DOCX, voice transcription, signed APK/EXE, automated migration of V6 archives, guaranteed instant push, certified security testing.

## Safety acceptance tests before real data
- Unauthenticated visitor must not read any school table.
- Teacher in one school cannot read/write other-school records or personal HR data.
- An archived teacher cannot access records.
- A teacher cannot approve exam questions, exams or their own lesson submission.
- Concurrent modifications use version optimistic locking and reject stale writes.
- Private Storage access must be tested with cross-school accounts (RLS on both document metadata and object operations).
- Browser sessions and authorization must be checked on Android/Windows. Run a restore drill with the school-owned archive before migration.

## Hosting
`ict-cloud/` is static and may be published through HTTPS with GitHub Pages after the repository owner enables it. Repository code may be public; the school database and Storage bucket must remain private with RLS.
