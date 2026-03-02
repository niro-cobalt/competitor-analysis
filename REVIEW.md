# Competitor Watch - App Review

## 1. Critical Fixes

### C1. Auth bypass: Email logs API returns all orgs' data when unauthenticated
**File:** `src/app/api/emails/route.ts:16-24`

When `orgId` is null (no authenticated user or email domain parse fails), the query becomes `{}` and returns **every organization's email logs** including recipient addresses, subjects, and content.

```ts
// Current: falls back to returning everything
const query = orgId ? { organizationId: orgId } : {};
```

**Fix:** Return 401 if `orgId` is missing, remove the query param fallback.

---

### C2. No auth on competitor detail endpoints — any user can read/edit any competitor
**Files:**
- `src/app/api/competitors/[id]/route.ts` (GET + PATCH)
- `src/app/api/competitors/[id]/scans/route.ts` (GET)

These endpoints have zero authentication. Anyone with a competitor ObjectId can read full competitor data, all scan history (including raw scraped content), and even modify competitor records.

**Fix:** Add Kinde auth + org ownership check to all three handlers. After fetching the competitor, verify `competitor.organizationId === userOrgId`.

---

### C3. No auth on single-scan endpoint — anyone can trigger expensive scans
**File:** `src/app/api/scan/route.ts:4-9`

The POST handler accepts a `competitorId` and immediately runs a full scan (Jina fetch + Gemini analysis) with no authentication or ownership check. This can be used to:
- Exhaust your Gemini/Jina API quotas
- Read scan results for competitors belonging to other orgs

**Fix:** Add Kinde auth, verify the competitor belongs to the user's org before scanning.

---

### C4. Cron endpoint allows unauthenticated access when `CRON_SECRET` is unset
**File:** `src/app/api/cron/[orgId]/route.ts:22`

```ts
if (CRON_SECRET && secret !== CRON_SECRET) { ... }
```

If `CRON_SECRET` env var is missing/empty, the entire check is skipped and anyone can trigger scans for any org by hitting `GET /api/cron/{orgId}`. The secret is also passed as a query parameter, which gets logged in server access logs, Vercel function logs, and browser history.

**Fix:** Fail closed — require the secret to be set. Move to `Authorization` header instead of query param.

---

### C5. Org identity derived from email domain — trivially spoofable
**File:** `src/lib/utils.ts:8-26`

Organization membership is determined solely by the user's email domain (`user@acme.com` → org `acme`). Anyone who signs up with an email at a target domain gains full access to that org's competitors, scans, subscribers, and settings. There's no server-side org membership table.

**Fix:** Store org membership in the database (either manually assigned or via Kinde's org features). Validate against it on every request.

---

### C6. Migration endpoints have no auth — publicly accessible
**Files:**
- `src/app/api/migrations/assign-org/route.ts`
- `src/app/api/migrations/add-logos/route.ts`

Both are plain `GET` handlers with no authentication. Anyone can trigger bulk database mutations (assigning all orphan records to `toqen`, rewriting logo URLs).

**Fix:** Either remove these endpoints entirely (one-time migrations shouldn't live in production) or gate them behind an admin check.

---

### C7. `scan/all` accepts orgId from query param — org impersonation
**File:** `src/app/api/scan/all/route.ts:17-19`

```ts
if (!orgId) {
    const searchParams = req.nextUrl.searchParams;
    orgId = searchParams.get('orgId');
}
```

If the user isn't authenticated (or `getUserOrganization` returns null), the endpoint falls back to a user-supplied `orgId` query parameter. An attacker can pass `?orgId=targetOrg` to trigger a full scan + email send for any organization.

Same pattern exists in `src/app/api/emails/route.ts:17-18`.

**Fix:** Remove the query param fallback. If org can't be determined from the session, return 401.

---

## 2. Major Fixes

### M1. No fetch timeouts — hanging external APIs block serverless functions indefinitely
**File:** `src/lib/scanner.ts:30,64,78,93`

All Jina Reader fetch calls have no timeout. If Jina, LinkedIn, or Twitter endpoints hang, the serverless function sits idle until Vercel's 300s max duration kills it, wasting compute and blocking the user.

**Fix:** Use `AbortSignal.timeout(15000)` on all external fetches.

---

### M2. Scan documents store unbounded raw content — risk of hitting MongoDB 16MB limit
**File:** `src/models/Scan.ts:24`

```ts
rawContent: { type: String }, // Can be large, maybe we truncate?
```

Each scan stores the full scraped page content plus LinkedIn, Twitter, and additional URL content. A single large page could push a document near or over MongoDB's 16MB BSON limit.

**Fix:** Truncate `rawContent` to a reasonable max (e.g., 500KB) before saving. Already truncating at 15K chars for the LLM prompt, so there's no analysis value in storing the full content.

---

### M3. Scan logs query has no pagination — will degrade as data grows
**Files:**
- `src/app/api/logs/route.ts:27` — fetches all scans for an org, no limit
- `src/app/api/emails/route.ts:26` — fetches all email logs, no limit
- `src/app/api/competitors/[id]/scans/route.ts:12` — fetches all scans for a competitor, no limit

After a few months of daily scanning with 10+ competitors, these endpoints will return thousands of records in a single response.

**Fix:** Add `limit` and `skip` query params with sensible defaults (e.g., 50).

---

### M4. Cron secret leaked in cron-job.org URLs
**File:** `src/app/api/settings/route.ts:84`

```ts
const targetUrl = `${baseUrl}/api/cron/${orgId}?secret=${process.env.CRON_SECRET}`;
```

The cron secret is embedded in the URL stored at cron-job.org. If cron-job.org is compromised or if the URL is logged anywhere, the secret is exposed.

**Fix:** Use an `Authorization` header instead. cron-job.org supports custom headers.

---

### M5. Settings error response leaks full error object to client
**File:** `src/app/api/settings/route.ts:120-122`

```ts
return NextResponse.json({
    error: `Failed to update settings: ${error.message}`,
    details: error  // <-- serializes entire error including stack trace
}, { status: 500 });
```

This sends internal error details (stack traces, MongoDB errors, file paths) to the client.

**Fix:** Log the full error server-side, return a generic message to the client.

---

### M6. Email HTML stored in every EmailLog document — massive storage waste
**File:** `src/lib/scan-service.ts:85`

```ts
content: emailHtml,
```

The full HTML email body (which can be very large, containing inline CSS + all competitor cards) is stored per-recipient. For 10 subscribers, that's 10 copies of the same HTML.

**Fix:** Store the HTML once (keyed by scan batch) and reference it from EmailLog, or don't store the HTML at all since it can be regenerated from `structuredData`.

---

### M7. Hardcoded production URL in email template
**File:** `src/lib/gemini.ts:429`

```ts
<a href="https://competitor-analysis-sigma.vercel.app/" class="cta-button">
```

This breaks for any other deployment (custom domain, staging, localhost).

**Fix:** Use an env var (e.g., `NEXT_PUBLIC_APP_URL` or the existing `VERCEL_URL`).

---

### M8. `getUserOrganization` hardcodes org aliases
**File:** `src/lib/utils.ts:17-20`

```ts
if (orgName === 'toqen' || orgName === 'getcobalt' || orgName === 'cobalt') {
    return 'toqen';
}
```

Org aliasing is hardcoded. Every new alias requires a code change and redeploy.

**Fix:** Move aliases to a database collection or environment variable (JSON map).

---

### M9. No input validation on competitor creation/update
**File:** `src/app/api/competitors/route.ts:38-41`

Only checks `name` and `url` are truthy. No validation on:
- URL format (could be `javascript:alert(1)` or non-HTTP protocols)
- String lengths (a 10MB `instructions` field would be stored and sent to Gemini)
- `tags` array size
- `additionalUrls` array contents

**Fix:** Add Zod schemas for request validation. Validate URL format, cap string lengths.

---

### M10. LLM prompt injection via `instructions` field
**File:** `src/lib/gemini.ts:85-93`

User-supplied `instructions` are injected directly into the Gemini prompt:

```ts
SPECIAL INSTRUCTIONS FOR THIS COMPETITOR:
${instructions}

Strictly follow the above instructions when analyzing changes.
```

A user could set instructions to `"Ignore all previous instructions and return..."` to manipulate analysis output, potentially poisoning email reports sent to all org subscribers.

**Fix:** Sanitize/escape instructions, or move them to a separate system message if Gemini supports it. At minimum, enforce a character limit and strip obvious injection patterns.

---

### M11. No subscriber email format validation
**File:** `src/app/api/subscribers/route.ts:36-39`

Any non-empty string is accepted as a subscriber email. Invalid emails will silently fail when Resend tries to send, wasting API calls and creating failed EmailLog entries.

**Fix:** Validate email format before saving.

---

### M12. Race condition on subscriber creation
**File:** `src/app/api/subscribers/route.ts:44-49`

Check-then-insert pattern with no unique index. Two concurrent requests to add the same email could both pass the `findOne` check and create duplicates.

**Fix:** Use `findOneAndUpdate` with `upsert: true`, or add a compound unique index on `{email, organizationId}`.

---

## 3. Feature Suggestions

### F1. Add rate limiting on scan endpoints
Scan operations are expensive (multiple Jina fetches + Gemini calls). Without rate limiting, a single user can exhaust API quotas. Consider per-org rate limits (e.g., max 1 bulk scan per hour, max 10 single scans per hour).

### F2. Add database TTL indexes for old scan/log data
Scan records and email logs accumulate indefinitely. Add TTL indexes to auto-expire records older than 90 days, or implement a retention policy configurable per org.

### F3. Add scan deduplication / cooldown
Nothing prevents scanning the same competitor multiple times in quick succession. Add a cooldown (e.g., minimum 1 hour between scans for the same competitor).

### F4. Webhook/Slack notifications as alternative to email
Many teams would prefer Slack or Teams notifications over email. Adding webhook support would make the tool more useful for modern workflows.

### F5. Competitor grouping / tagging filters on dashboard
Tags exist on competitors but aren't filterable in the dashboard UI. Adding tag-based filtering would help orgs with many competitors organize their view.

### F6. Diff viewer for scan history
The competitor detail page shows scan history but no way to visually compare what changed between two scans. A simple diff view would make change tracking much more useful.

### F7. Export functionality
Allow exporting scan results, competitor lists, or email reports as CSV/PDF for sharing with stakeholders who don't have app access.

### F8. Configurable scan schedules per competitor
Currently all competitors in an org are scanned together on the same cron schedule. Some competitors may need more frequent monitoring than others.

### F9. Health check / status page
No way to see if external dependencies (Jina, Gemini, Resend, MongoDB) are healthy. A `/api/health` endpoint would help with monitoring and debugging.

### F10. Audit logging
No record of who triggered scans, changed settings, added/removed competitors or subscribers. An audit log would help with accountability in multi-user orgs.
