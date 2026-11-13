# TONY AI ICT — WhatsApp Business secure bridge (NOT LIVE)

## Status
Receive-only webhook **code prepared**, not deployed or connected to any WhatsApp number.
Nothing reads phone conversations, personal chats, or group messages today.

## What it does
- Verifies Meta GET handshake using `META_VERIFY_TOKEN`.
- Verifies signed POST requests against the **raw request body** with Meta `X-Hub-Signature-256` and `META_APP_SECRET`.
- Rejects all messages by default. Only approved staff numbers in `ALLOWED_SENDERS` are eligible.
- Filters for the intended WhatsApp business phone number ID.
- Accepts text/document/image/audio/video metadata and text, but does **not** download media bytes yet.
- Persists to a private, RLS-enabled Supabase table with unique `message_id`.
- No response messages sent to WhatsApp. No AI analysis or automatic publishing.
- Every message remains `pending_review` until the Head of ICT verifies it.

## Deployment prerequisites (separate authorized account setup)
1. Meta Business Platform **Coexistence** eligibility on existing WhatsApp Business App number (do not migrate number away from phone app).
2. Register Meta business app + set up subscribed `messages` webhook through official onboarding.
3. Owner-controlled private HTTPS hosting (e.g. Cloudflare Worker) and Supabase project admin.
4. Run `schema.sql` in the intended private school Supabase project after checking table migrations.
5. Set worker secrets, **not** GitHub variables/files:
   - `META_VERIFY_TOKEN` — user-generated long random string for the GET challenge
   - `META_APP_SECRET` — from Meta App Settings
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — use server only
   - `SCHOOL_ID`, `EXPECTED_PHONE_NUMBER_ID`, `ALLOWED_SENDERS` comma-separated digits
6. Deploy the code as an HTTPS worker at `/webhooks/whatsapp`.
7. Verify with synthetic signed messages and one opt-in staff member before production.

**DO NOT** put any secret in ChatGPT, repository, browser Javascript, app screenshot, or public GitHub issues.

## Known constraints
- Meta API does not give full access to WhatsApp group chats.
- Newly migrated WhatsApp Business App accounts may not be eligible for Coexistence yet.
- The webhook cannot automatically insert messages into this ChatGPT conversation; it can feed a private school inbox that the assistant can analyze when connected/queried.
- Historical chat import is separate and depends on supported onboarding.
- Private conversations outside the approved sender list must never be processed.
- Attachments are **not yet downloaded**. Their media IDs are only stored as pending metadata until a secure media-ingest service is implemented.

## Verification
`node --test integrations/whatsapp/worker.test.mjs`
