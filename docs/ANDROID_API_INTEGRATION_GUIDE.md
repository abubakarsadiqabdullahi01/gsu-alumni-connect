# GSU Alumni Connect Android API Integration Guide

Last updated: May 3, 2026  
Base URL (production): `https://www.gsualumni.org.ng`

This guide was extracted from the live route handlers under `app/api/**`.

## 1) Authentication model (important for Android)

- Auth is **session-cookie based** (Better Auth).
- After login, server sets HTTP-only cookies. Android client must persist/send cookies on every request.
- Use an `OkHttp` `CookieJar` (or equivalent) in Retrofit/Ktor.
- Most APIs return:
  - `401` when not authenticated
  - `403` when authenticated but not allowed (role/feature restriction)

## 2) Auth endpoints

### Better Auth catch-all
- `GET/POST /api/auth/*`
- Handler: Better Auth routes (sign-in/out/session/etc) + plugins.

### Custom login endpoint (used by the web login page)
- `POST /api/auth/sign-in/registration`
- Body:
```json
{
  "registrationNo": "UG19/ASAC/1025",
  "password": "your_password",
  "rememberMe": true
}
```
- Success response:
```json
{
  "token": "session_token",
  "user": {
    "id": "user_id",
    "role": "user",
    "registrationNo": "UG19/ASAC/1025",
    "defaultPassword": false
  }
}
```

## 3) User-facing APIs (for alumni mobile app)

## Profile & onboarding

- `GET /api/profile`
  - Returns the current graduate profile for Android profile screens:
    - `profile.fullName`, `registrationNo`, `departmentName`, `facultyName`, `graduationYear`, `degreeClass`
    - `profile.email`, `phone`, `avatarUrl`, `signatureUrl`
    - editable profile fields, plus `employment`, `education`, and `skills`

- `POST /api/onboarding/complete`
  - Body:
    - `currentPassword`, `newPassword`, `confirmPassword`
    - `profile` (optional): `email`, `phone`, `dateOfBirth`, `bio`, `linkedinUrl`, `nyscState`, `nyscYear`
    - `privacy` (optional): `showCgpa`, `showEmail`, `showPhone`, `showDob`, `showInDirectory`, `allowMessages`, `showActivityFeed`, `openToOpportunities`, `availableForMentorship`
  - Effect: changes password, sets account active, completes onboarding.

- `PATCH /api/profile`
  - Body (any subset):
    - `email`, `phone`, `dateOfBirth`, `bio`, `linkedinUrl`, `twitterUrl`, `githubUrl`, `personalWebsite`, `nyscState`, `nyscYear`, `openToOpportunities`, `availableForMentorship`

- `POST /api/profile/education`
  - Body: `institution` (required), `degree`, `fieldOfStudy`, `isCurrent`

- `POST /api/profile/employment`
  - Body: `jobTitle` (required), `companyName` (required), `employmentType`, `isCurrent`

- `POST /api/profile/skills`
  - Body: `skillName` (required), `proficiency` (`BEGINNER|INTERMEDIATE|EXPERT`)

- `PATCH /api/settings`
  - Body (privacy/preferences): `showCgpa`, `showEmail`, `showPhone`, `showDob`, `showInDirectory`, `allowMessages`, `showActivityFeed`, `openToOpportunities`, `availableForMentorship`

- `GET /api/settings`
  - Returns current privacy/preferences for Android settings screens.

## Directory & connections

- `GET /api/directory`
  - Query: `q`, `department`, `year`, `page`, `pageSize`
  - Returns paged graduate list with `connectionStatus`.

- `GET /api/connections`
  - Returns `accepted`, `incoming`, `outgoing`, `suggestions`, `stats`.

- `POST /api/connections/request`
  - Body: `receiverGraduateId`

- `PATCH /api/connections/{id}`
  - Body: `action` = `accept|decline|cancel|block`

- `DELETE /api/connections/{id}`
  - Removes connection/request.

## Feed & achievements

- `GET /api/feed`
  - Returns recent activity feed.

- `POST /api/feed`
  - Body: `headline`, `actionType` (`UPDATED_JOB|POSTED_JOB|JOINED_GROUP|POSTED_IN_GROUP|GRADUATION_ANNIVERSARY`), `isPublic`

- `GET /api/achievements`
  - Query: `q`, `verified` (`all|verified|pending`), `page`, `pageSize`
  - Returns `achievements`, `badges`, `stats`, `pagination`.

- `POST /api/achievements`
  - Body: `title` (required), `description`, `year`

- `PATCH /api/achievements/{id}`
  - Body (any subset): `title`, `description`, `year`

- `DELETE /api/achievements/{id}`

## Groups & posts

- `GET /api/groups`
  - Returns groups, membership, counts.

- `POST /api/groups/{id}/membership`
  - Join group.

- `DELETE /api/groups/{id}/membership`
  - Leave group.

- `GET /api/groups/{id}/posts`
  - Returns group metadata + latest posts.

- `POST /api/groups/{id}/posts`
  - Body: `content`

- `POST /api/groups/{id}/conversation`
  - Opens/creates group conversation and returns `conversationId`.

## Messaging

- `GET /api/messages/conversations`
  - Returns conversation list with unread counts.

- `POST /api/messages/direct`
  - Body: `graduateId` (target user)
  - Returns existing/new `conversationId`.

- `GET /api/messages/conversations/{id}`
  - Returns conversation metadata + messages.

- `POST /api/messages/conversations/{id}/messages`
  - Body: `body` (message text)

- `POST /api/messages/conversations/{id}/read`
  - Marks conversation read.

- `POST /api/pusher/auth`
  - Form fields (not JSON): `socket_id`, `channel_name`
  - Used for private/presence realtime channels.

## Jobs

- `GET /api/jobs`
  - Query: `q`, `jobType`, `state`, `page`, `pageSize`
  - Returns `jobs`, `myPosts`, `myApplications`, `pagination`.

- `POST /api/jobs`
  - Body:
    - Required: `title`, `companyName`
    - Optional: `description`, `requirements`, `industry`, `jobType`, `locationCity`, `locationState`, `country`, `salaryMin`, `salaryMax`, `salaryVisible`, `currencyCode`, `applicationUrl`, `applicationEmail`, `deadline`

- `POST /api/jobs/{id}/apply`
  - Body: `coverNote`, `cvUrl`

## Events

- `GET /api/events`
  - Query: `q`, `type`, `status` (`upcoming|past|all`), `page`, `pageSize`
  - Returns `events`, `myEvents`, `myRsvps`, `stats`, `pagination`.

- `POST /api/events`
  - Body: `title`, `description`, `type`, `location`, `startsAt`, `endsAt`, `capacity`, `isPublic`

- `PATCH /api/events/{id}`
  - Body: `action` = `cancel|reopen`

- `POST /api/events/{id}/rsvp`
  - RSVP to event.

- `DELETE /api/events/{id}/rsvp`
  - Cancel RSVP.

## Mentorship

- `GET /api/mentorship`
  - Query: `q`
  - Returns `mentors`, `incoming`, `outgoing`, `activeAsMentee`, `activeAsMentor`, `stats`.

- `POST /api/mentorship`
  - Body: `mentorId` (required), `subject`, `message`

- `PATCH /api/mentorship/{id}`
  - Body:
    - `action` = `accept|decline|cancel|complete`
    - `notes` (used with `complete`)

## Notifications

- `GET /api/notifications`
  - Query: `q`, `status` (`all|unread|read`), `page`, `pageSize`

- `PATCH /api/notifications`
  - Body: `{ "action": "mark_all_read" }`

- `PATCH /api/notifications/{id}`
  - Body: `{ "action": "read" }`

## ID cards

- `GET /api/id-cards`
  - Query: `mode=sample` (optional)
  - Returns signed payload + templates + verification URL.

- `POST /api/id-cards`
  - Body:
    - `fullName`, `alumniNumber`, `stateOfOrigin`, `imageUrl`, `signatureUrl`, `graduationYear`, `discipline`, `gender`, `rank`

- `GET /api/id-cards/verify`
  - Query: `c` (cardId), `a` (alumniNo), `e` (expiry unix), `s` (signature)

- `GET /api/id-cards/image-proxy`
  - Query: `src` (allowed image host URL)

## Presence heartbeat

- `POST /api/presence/heartbeat`
  - Updates `lastSeenAt` with server throttling.

## Uploads (mobile profile/admin)

- `POST /api/upload/id-assets`
  - `multipart/form-data`
  - Fields:
    - `file` (image)
    - `assetType` (`avatar` or `signature`)

- `POST /api/upload/import-file` (admin)
  - `multipart/form-data`
  - Field: `file` (`.xls/.xlsx`)
  - Returns uploaded file `url` + `key`.

## Import jobs (admin)

- `POST /api/import-jobs`
  - Body: `fileName`, `fileUrl`, `totalRows`, `selectedSheets[]`
  - Creates + runs import job.

- `GET /api/import-jobs`
  - Returns last 20 jobs for current admin.

- `GET /api/import-jobs/{id}`
  - Returns detailed job progress/status.

- `POST /api/graduates/import` (legacy streaming import)
  - Body: `rows[]`, `sheets[]`, `fileName`
  - Response is **SSE** (`text/event-stream`) with progress events.

## 4) Admin APIs (admin app/screens)

## Admin dashboard data

- `GET /api/admin/network`  
- `GET /api/admin/analytics/export?range=30d|90d|12m` (CSV)

## Admin settings

- `GET /api/admin/settings`
- `PATCH /api/admin/settings`
  - Body can include:
    - `platformName`, `supportEmail`, `welcomeMessage`
    - `allowSelfRegistration`, `requireEmailVerification`, `forcePasswordChangeOnFirst`, `enableTwoFactor`
    - `featureJobBoard`, `featureMentorship`, `featureMessaging`, `featureMap`, `featureGroups`, `featureSkills`

## Admin graduates

- `GET /api/admin/graduates`
  - Query: `page`, `limit`, `search`, `faculty`, `department`, `graduationYear`, `sortBy`, `sortOrder`

- `GET /api/admin/graduates/meta`
- `GET /api/admin/graduates/export` (CSV)
- `GET /api/admin/departments`

## Admin achievements moderation

- `GET /api/admin/achievements`
  - Query: `q`, `status`, `page`, `pageSize`

- `PATCH /api/admin/achievements/{id}`
  - Body: `action` = `verify|unverify|reject`

## Admin groups moderation

- `GET /api/admin/groups`
  - Query: `page`, `pageSize`, `q`, `type`, `source`

- `GET /api/admin/groups/{id}`
- `DELETE /api/admin/groups/{id}` (only non-auto groups)

- `PATCH /api/admin/groups/posts/{postId}`
  - Body: `action` = `delete|restore|pin|unpin`

## Admin jobs moderation

- `GET /api/admin/jobs`
  - Query: `page`, `pageSize`, `q`, `status`, `jobType`, `verified`

- `GET /api/admin/jobs/{id}`
- `PATCH /api/admin/jobs/{id}`
  - Body: `action` = `activate|deactivate|verify|unverify`
- `DELETE /api/admin/jobs/{id}`

- `PATCH /api/admin/jobs/{id}/applications/{applicationId}`
  - Body: `status` = `APPLIED|REVIEWED|SHORTLISTED|REJECTED`

## Admin mentorship moderation

- `GET /api/admin/mentorship`
  - Query: `page`, `pageSize`, `q`, `status`

- `GET /api/admin/mentorship/{id}`
- `PATCH /api/admin/mentorship/{id}`
  - Body: `action` = `accept|decline|cancel|complete`, optional `notes`

## Admin notifications

- `GET /api/admin/notifications`
  - Query: `q`, `status`, `page`, `pageSize`

- `PATCH /api/admin/notifications`
  - Body: `{ "action": "mark_all_read" }`

- `PATCH /api/admin/notifications/{id}`
  - Body: `{ "action": "read" }`

## Admin upload audit

- `GET /api/admin/uploads/export` (CSV)
- `GET /api/admin/uploads/template` (CSV template)
- `GET /api/admin/uploads/{id}/report` (CSV report)

## 5) Internal/ops endpoints (not for Android UI)

- `GET /api/cron/process-import`
  - Protected with `Authorization: Bearer <CRON_SECRET>`.
- `GET /api/cron/import-watchdog`
  - Protected by `IMPORT_WATCHDOG_SECRET` (bearer or `x-watchdog-secret`).

## 6) Android screen-to-API mapping (recommended)

- Login: `POST /api/auth/sign-in/registration`
- Onboarding wizard: `POST /api/onboarding/complete`
- Home dashboard/feed: `GET /api/feed`, `GET /api/notifications`
- Directory/search: `GET /api/directory`, `POST /api/connections/request`
- Connections: `GET /api/connections`, `PATCH /api/connections/{id}`
- Profile edit: `GET|PATCH /api/profile`, `POST /api/profile/education|employment|skills`, `GET|PATCH /api/settings`
- Groups: `GET /api/groups`, `POST|DELETE /api/groups/{id}/membership`, `GET|POST /api/groups/{id}/posts`
- Messaging: `GET /api/messages/conversations`, `GET /api/messages/conversations/{id}`, `POST /api/messages/conversations/{id}/messages`
- Jobs: `GET|POST /api/jobs`, `POST /api/jobs/{id}/apply`
- Events: `GET|POST /api/events`, `POST|DELETE /api/events/{id}/rsvp`
- Mentorship: `GET|POST /api/mentorship`, `PATCH /api/mentorship/{id}`
- ID card: `GET /api/id-cards`, `POST /api/upload/id-assets`, `GET /api/id-cards/verify`

## 7) Implementation notes for Android engineers

- Always send `Content-Type: application/json` for JSON APIs.
- For upload APIs, use `multipart/form-data`.
- For `/api/graduates/import`, handle Server-Sent Events stream if used.
- Handle `409` conflict cases explicitly (duplicate applications, duplicate skill, active import in progress).
- Many list APIs are paginated; keep `page/pageSize` state in UI.
- Feature flags can disable modules (`featureMessaging`, `featureGroups`, etc.); handle `403` with user-friendly UI states.
