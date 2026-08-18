# GSU Alumni Connect Android App Implementation Blueprint

Last updated: August 17, 2026  
Production API base URL: `https://www.gsualumni.org.ng`

This document explains how to build the Android version of GSU Alumni Connect step by step. It is written for product owners, Android developers, backend developers, testers, and administrators who need a clear plan from idea to release.

The Android app should feel like a professional alumni companion for old students of Gombe State University: simple to use, respectful, useful every week, and strong enough to support networking, verified identity, events, opportunities, mentorship, maps, groups, charts, and digital ID cards.

## 1. Product Goal

The Android app should help GSU old students:

- Sign in with their registration number and password.
- Complete onboarding and change the default password.
- Keep their alumni profile updated.
- Find classmates and other alumni by name, department, set, state, or profession.
- Connect, chat, join groups, attend events, and request mentorship.
- Discover jobs and post opportunities.
- View achievements and badges.
- Use a digital alumni ID card with verification.
- Explore alumni distribution on maps and charts.
- Receive notifications about relevant activity.

The first mobile release should focus on alumni members. Admin tools can come later or be built as a separate admin mode.

## 2. Current Backend Readiness

The deployed web system already exposes the main APIs needed by Android. Authentication is session-cookie based through Better Auth, so the Android app must store and resend cookies automatically.

Reference API document:

- `docs/ANDROID_API_INTEGRATION_GUIDE.md`

Recent Android-readiness additions:

- `GET /api/profile` loads the current graduate profile for mobile.
- `GET /api/settings` loads privacy and account settings for mobile.

Core API groups confirmed:

- Authentication and onboarding
- Profile and settings
- Directory and connections
- Feed and achievements
- Groups and posts
- Messaging
- Jobs
- Events
- Mentorship
- Notifications
- ID cards and image upload
- Presence heartbeat
- Admin and import APIs, if needed later

## 3. Recommended Flutter Technology Stack

Use a modern Flutter stack that can produce a polished Android app now and still support iOS later if needed.

- Framework: Flutter
- Language: Dart
- State management: Riverpod, Bloc, or Provider. Riverpod is recommended for clear API/state separation.
- Navigation: `go_router`
- Networking: `dio`
- Cookie/session persistence: `cookie_jar` plus `dio_cookie_manager`
- Secure storage: `flutter_secure_storage`
- Local cache/database: `isar`, `hive`, or `drift`. Hive is simplest for MVP; Drift is stronger for structured offline data.
- Images: `cached_network_image`
- Forms: `reactive_forms` or Flutter `Form` plus custom validators
- Maps: `google_maps_flutter` or `flutter_map`
- Charts: `fl_chart` or `syncfusion_flutter_charts`
- Realtime messaging: Pusher Channels Flutter package, if available for the chosen Pusher setup
- Push notifications: Firebase Cloud Messaging
- QR/barcode: `mobile_scanner` or `qr_code_scanner`
- QR generation: `qr_flutter`
- File/image picker: `image_picker` and `file_picker`
- Sharing/download: `share_plus`, `path_provider`, `printing`, `pdf`
- Animation: Flutter implicit animations, `flutter_animate`, Lottie where appropriate
- Testing: Flutter unit tests, widget tests, integration tests, and mocked Dio adapters

Flutter session note:

- The backend uses Better Auth session cookies.
- The Flutter app must persist cookies after login and attach them to every authenticated API request.
- Use `PersistCookieJar` from `cookie_jar`, connected to Dio through `dio_cookie_manager`.

## 4. App Information Architecture

Use bottom navigation for high-frequency member areas:

- Home
- Directory
- Groups
- Messages
- Profile

Use a menu or profile drawer for:

- ID Card
- Jobs
- Events
- Mentorship
- Achievements
- Alumni Map
- Notifications
- Settings
- Help and Support
- Sign Out

This keeps the app friendly for older alumni who may not want a crowded interface while still making advanced features easy to discover.

## 5. User Experience Principles

Design the app for old students, not only young tech users:

- Use clear labels, not clever labels.
- Keep buttons large enough for comfortable tapping.
- Use readable font sizes and strong contrast.
- Avoid hiding important actions behind gestures only.
- Show confirmations for sensitive actions like sign out, cancel RSVP, delete post, or remove connection.
- Explain empty states clearly: "No messages yet", "You have not joined any group", "No alumni found for this search".
- Make profile completion feel encouraging, not punishing.
- Prefer respectful language: "Alumni", "Old Students", "Classmates", "Set", "Department".
- Keep the ID card professional and visually close to the web version.

Flutter UI principles:

- Build reusable widgets for alumni cards, dashboard metric cards, profile rows, action chips, empty states, loading skeletons, and error banners.
- Use Material 3 with GSU colors: green as primary, white surfaces, controlled gold accents, and neutral text.
- Prefer smooth, short animations: 150-300ms for buttons, cards, tabs, and page transitions.
- Avoid excessive motion. Alumni users should feel guided, not distracted.
- Use `AnimatedSwitcher` for content changes, `Hero` for profile/ID-card transitions, `AnimatedContainer` for selected states, and shimmer/skeleton loaders for network loading.
- Support dark mode only if it is polished; otherwise ship a strong light theme first.

Responsive design rules:

- Use `LayoutBuilder`, `MediaQuery`, and adaptive grid counts.
- Keep one-column layouts on small phones.
- Use two-column dashboard cards on large phones and tablets.
- Use max content widths on tablets so forms do not stretch awkwardly.
- Keep bottom navigation for phones; consider navigation rail on tablets.
- Test common Android widths: 360dp, 390dp, 412dp, 600dp, and tablet landscape.

## 6. Authentication Flow

### Step 1: Login Screen

Fields:

- Registration number or email
- Password
- Remember me

API:

- `POST /api/auth/sign-in/registration`

Android behavior:

- Use Dio with `PersistCookieJar`.
- Store only non-sensitive user summary in Flutter secure storage or encrypted local cache.
- Do not store raw password.
- On success, save cookies and user metadata.
- If `defaultPassword` is true, send the user to onboarding.
- If login fails with `401`, show "Invalid registration number or password."

### Step 2: Session Check

On app launch:

- Call a protected endpoint like `GET /api/profile`.
- If it returns `200`, continue to the app.
- If it returns `401`, clear local user state and show login.

### Step 3: Sign Out

Use the Better Auth sign-out endpoint under `/api/auth/*` if exposed by the library route, then clear local cookies and app state.

## 7. Onboarding Flow

Purpose:

- Force users with default passwords to secure their account.
- Collect key contact and profile details.
- Let users choose privacy settings.

Recommended screens:

1. Welcome and identity confirmation
2. Change password
3. Contact details
4. Professional summary
5. Privacy settings
6. Completion

API:

- `POST /api/onboarding/complete`

Important validations:

- New password and confirm password must match.
- Email and phone should be formatted before submission.
- Date of birth should use ISO date format.
- Show friendly error for duplicate email or phone.

## 8. Home Dashboard

The home screen should feel alive and useful immediately.

Suggested sections:

- Welcome card with name and registration number
- Profile completion prompt
- Digital ID card shortcut
- Unread notifications count
- Latest activity feed
- Upcoming events
- Suggested connections
- Recent jobs
- Group highlights

APIs:

- `GET /api/profile`
- `GET /api/feed`
- `GET /api/notifications?status=unread&pageSize=5`
- `GET /api/events?status=upcoming&pageSize=3`
- `GET /api/jobs?pageSize=3`
- `GET /api/connections`

Professional feature:

- Add a "My Alumni Snapshot" chart showing connections, groups joined, achievements, events attended, and mentorship status.

Flutter dashboard design:

- Use an animated greeting header with the alumnus name, registration number, and small profile image.
- Add horizontal quick-action cards: ID Card, Find Alumni, Join Group, Jobs, Events.
- Use responsive metric cards for connections, unread messages, groups, and achievements.
- Use `fl_chart` for mini charts such as profile completion and alumni snapshot.
- Use skeleton loading placeholders while dashboard sections load.
- Animate dashboard sections with subtle staggered fade/slide using `flutter_animate`.
- Use pull-to-refresh for the full dashboard.

## 9. Profile Module

Screens:

- View my profile
- Edit personal details
- Edit career details
- Edit education
- Edit skills
- Upload profile photo
- Upload signature

APIs:

- `GET /api/profile`
- `PATCH /api/profile`
- `POST /api/profile/employment`
- `POST /api/profile/education`
- `POST /api/profile/skills`
- `POST /api/upload/id-assets`

User-friendly features:

- Profile completion percentage
- Clear labels for locked academic data from school records
- Professional/social link previews
- Skill chips
- Career status badge such as "Open to Opportunities" or "Available for Mentorship"

## 10. Settings and Privacy

Screens:

- Account summary
- Profile visibility
- Contact visibility
- Messaging permissions
- Mentorship availability
- Opportunity availability

APIs:

- `GET /api/settings`
- `PATCH /api/settings`

Privacy controls:

- Show CGPA
- Show email
- Show phone
- Show date of birth
- Show in directory
- Allow messages
- Show activity feed
- Open to opportunities
- Available for mentorship

UX note:

- Each privacy option should include a short explanation so alumni understand who can see what.

## 11. Directory and Connections

Screens:

- Alumni search
- Filters
- Alumni profile preview
- Connection requests
- Accepted connections
- Suggestions

APIs:

- `GET /api/directory?q=&department=&year=&page=&pageSize=`
- `GET /api/connections`
- `POST /api/connections/request`
- `PATCH /api/connections/{id}`
- `DELETE /api/connections/{id}`

Professional features:

- Search by name, registration number, department, faculty, state, or graduation year.
- Filter by "Open to Opportunities" and "Available for Mentorship".
- Show connection state: Connect, Pending, Connected.
- Add "People from your set" and "People from your department" sections.

## 12. Alumni Map

Purpose:

- Help alumni visualize where old students are located.
- Support networking by state, city, department, or set.

Recommended screens:

- Nigeria alumni map
- State detail view
- Department distribution
- Set/year distribution
- Alumni list filtered by selected location

Existing support:

- The web system has map UI and location-related graduate fields.
- Android can begin with directory filters and admin/network APIs, then add a dedicated mobile map API if richer geospatial data is needed.

Suggested Android data approach:

- Use `GET /api/directory` for searchable alumni lists.
- Use `GET /api/admin/network` only for admin dashboards.
- If member map needs aggregate counts without exposing admin APIs, add a future endpoint such as `GET /api/map/alumni-distribution`.

Professional map features:

- State count markers
- Department color filters
- "My Set" filter
- "Nearby alumni" if the app later collects user-approved location
- No exact home address display unless explicitly added and consented to

Privacy rule:

- Never show precise alumni locations by default. Use state/city level aggregation.

Flutter implementation:

- Use `google_maps_flutter` if Google Maps billing/API keys are approved.
- Use `flutter_map` with OpenStreetMap tiles if an open map stack is preferred.
- Use clustered markers for state counts.
- Add animated filter chips above the map.
- On smaller screens, show a bottom sheet for state details instead of a side panel.

## 13. Digital ID Card

Screens:

- My ID card
- Upload photo/signature
- Preview front and back
- QR verification
- Share or download card image/PDF
- Verify ID card by scanning QR

APIs:

- `GET /api/id-cards`
- `POST /api/id-cards`
- `GET /api/id-cards/verify`
- `GET /api/id-cards/image-proxy`
- `POST /api/upload/id-assets`

Professional features:

- Offline cached card preview after first successful load.
- QR code verification.
- Watermark or verification badge.
- Expiry date display.
- "Verified by GSU Alumni Connect" status.
- Share as image or PDF where allowed.

Security notes:

- Do not generate verification signatures on Android.
- The server must remain the source of truth for signed ID card data.
- QR verification should open the public verification URL.

Flutter implementation:

- Build the card with Flutter widgets so it is crisp on all screen sizes.
- Use `RepaintBoundary` to capture the ID card as an image when sharing.
- Use `qr_flutter` for local QR display from the server verification URL.
- Use `mobile_scanner` for the verification scanner.
- Use `Hero` animation from dashboard shortcut to ID card detail.

## 14. Groups and Posts

Screens:

- My groups
- Discover groups
- Group detail
- Group posts
- Create post
- Group conversation shortcut

APIs:

- `GET /api/groups`
- `POST /api/groups/{id}/membership`
- `DELETE /api/groups/{id}/membership`
- `GET /api/groups/{id}/posts`
- `POST /api/groups/{id}/posts`
- `POST /api/groups/{id}/conversation`

Group types:

- Set/cohort groups
- Department groups
- Faculty groups
- State groups
- Custom groups

Professional features:

- Pinned posts
- Group activity indicators
- Join/leave confirmation
- Quick filter: My Set, My Department, My State
- Group chat entry point

## 15. Messaging

Screens:

- Conversation list
- Direct chat
- Group chat
- New message from profile
- Message read state

APIs:

- `GET /api/messages/conversations`
- `POST /api/messages/direct`
- `GET /api/messages/conversations/{id}`
- `POST /api/messages/conversations/{id}/messages`
- `POST /api/messages/conversations/{id}/read`
- `POST /api/pusher/auth`

Realtime:

- Use a Flutter-compatible Pusher client for realtime message delivery.
- Use API polling as fallback.

Professional features:

- Unread badges
- Online/recently active state from presence heartbeat
- Message timestamp grouping
- Empty chat prompt with suggested first message

## 16. Jobs and Opportunities

Screens:

- Job list
- Job detail
- Post job
- My posted jobs
- My applications
- Apply for job

APIs:

- `GET /api/jobs`
- `POST /api/jobs`
- `POST /api/jobs/{id}/apply`

Professional features:

- Filters by job type, state, industry, remote/hybrid.
- Salary visibility where available.
- Save/share job.
- Application status.
- "Posted by verified alumni" badge when available.

## 17. Events

Screens:

- Upcoming events
- Event detail
- My RSVPs
- Create event
- Past events

APIs:

- `GET /api/events`
- `POST /api/events`
- `PATCH /api/events/{id}`
- `POST /api/events/{id}/rsvp`
- `DELETE /api/events/{id}/rsvp`

Professional features:

- Calendar add button.
- RSVP status badge.
- Capacity indicator.
- Event reminder through push notification.

## 18. Mentorship

Screens:

- Find mentors
- Mentor profile
- Request mentorship
- Incoming requests
- Outgoing requests
- Active mentorships
- Complete mentorship

APIs:

- `GET /api/mentorship`
- `POST /api/mentorship`
- `PATCH /api/mentorship/{id}`

Professional features:

- Mentor availability badge.
- Suggested mentors by department, skill, and industry.
- Request templates for users who do not know what to write.
- Completion notes for mentors.

## 19. Achievements and Badges

Screens:

- Achievements list
- Add achievement
- Edit achievement
- Badges

APIs:

- `GET /api/achievements`
- `POST /api/achievements`
- `PATCH /api/achievements/{id}`
- `DELETE /api/achievements/{id}`

Professional features:

- Verified achievement badge.
- First Class Honours badge.
- Profile Complete badge.
- Mentor and Job Poster badges.
- Share achievement card.

## 20. Notifications

Screens:

- Notification list
- Unread notifications
- Notification detail/deep link

APIs:

- `GET /api/notifications`
- `PATCH /api/notifications`
- `PATCH /api/notifications/{id}`

Professional features:

- Mark all as read.
- Deep link to related screen: message, job, event, group, connection, mentorship.
- Push notifications via Firebase Cloud Messaging in a future backend extension.

## 21. Charts and Alumni Insights

Charts make the app feel professional and give alumni a sense of the strength of the network.

Recommended member charts:

- Alumni by state
- Alumni by department
- Alumni by graduation year
- My profile completion
- My connections over time
- Job opportunities by industry
- Event participation summary

Flutter chart implementation:

- Use `fl_chart` for lightweight bar, line, pie, and radar-style summaries.
- Use animated chart transitions when filters change.
- Keep chart labels readable; do not overload small screens with too many legends.
- Use tappable chart segments to filter related lists, such as tapping a state to open alumni in that state.

Current implementation path:

- For personal charts, use data from `GET /api/profile`, `GET /api/connections`, `GET /api/jobs`, `GET /api/events`, and `GET /api/achievements`.
- For aggregate public/member charts, add a future non-admin endpoint if the existing admin analytics should not be exposed to normal alumni.

Suggested future endpoint:

- `GET /api/insights/alumni`
  - Returns aggregate counts by state, department, faculty, graduation year, jobs, events, and mentorship.
  - Must not expose private user-level data.

## 22. Offline and Slow Network Support

Many users may open the app on unstable mobile networks. Build for graceful loading.

Recommended behavior:

- Cache profile, settings, directory pages, groups, conversations, and ID card.
- Show last updated timestamp for cached data.
- Use pull-to-refresh.
- Use retry buttons on failed screens.
- Queue non-critical actions only when safe, such as presence heartbeat.
- Never queue sensitive actions like password change without explicit user confirmation.

## 23. Security and Privacy Checklist

Authentication:

- Persist Better Auth cookies securely through Dio `PersistCookieJar`.
- Use HTTPS only.
- Clear cookies on sign out.
- Never store raw passwords.

User data:

- Respect privacy flags from settings.
- Do not expose hidden email, phone, CGPA, or date of birth in Android UI.
- Do not display exact alumni locations by default.
- Keep ID card verification server-signed.

API handling:

- Treat `401` as session expired.
- Treat `403` as not allowed or feature disabled.
- Treat `409` as duplicate or conflict.
- Show friendly messages for `400` validation errors.
- Log errors locally without exposing sensitive payloads.

## 24. Flutter Project Structure

Recommended package layout:

```text
lib/
  main.dart
  app.dart
  core/
    config/
    constants/
    errors/
    network/
      api_client.dart
      cookie_store.dart
      endpoints.dart
    routing/
      app_router.dart
    storage/
    theme/
    utils/
    widgets/
  features/
    auth/
      data/
      domain/
      presentation/
    onboarding/
    dashboard/
    profile/
    settings/
    directory/
    connections/
    groups/
    messages/
    jobs/
    events/
    mentorship/
    achievements/
    notifications/
    id_card/
    alumni_map/
    insights/
  shared/
    models/
    widgets/
    animations/
test/
integration_test/
assets/
  images/
  icons/
  lottie/
```

## 25. Step-by-Step Build Plan

### Phase 1: Project setup

1. Create Flutter project with Android support.
2. Configure app package name, launcher icon, splash screen, and GSU Alumni branding.
3. Add dependencies for Dio, cookie persistence, secure storage, Riverpod/Bloc, go_router, cached images, charts, maps, QR, and testing.
4. Create base API client with `https://www.gsualumni.org.ng`.
5. Implement persistent cookie storage using Dio plus cookie jar.
6. Create app theme, spacing scale, typography, reusable buttons, cards, empty states, and loading skeletons.

Deliverable:

- App opens to login screen and can call the production API.

### Phase 2: Authentication and onboarding

1. Build login screen.
2. Integrate `POST /api/auth/sign-in/registration`.
3. Store cookies.
4. Add launch session check with `GET /api/profile`.
5. Build onboarding wizard.
6. Integrate `POST /api/onboarding/complete`.

Deliverable:

- Alumni can sign in and complete first-time onboarding.

### Phase 3: Shell navigation and home

1. Add bottom navigation and drawer/menu.
2. Build responsive animated home dashboard.
3. Integrate profile, feed, notifications, jobs, events, and connections summary.
4. Add loading, empty, and error states.
5. Add dashboard cards, quick actions, charts, and subtle staggered animations.

Deliverable:

- Logged-in alumni can navigate the main app and see useful live data.

### Phase 4: Profile, settings, and ID assets

1. Build profile view and edit screens.
2. Integrate `GET|PATCH /api/profile`.
3. Add education, employment, and skills forms.
4. Integrate avatar/signature upload.
5. Build settings and privacy screens with `GET|PATCH /api/settings`.

Deliverable:

- Alumni can manage their identity, profile, and privacy from Android.

### Phase 5: Directory and connections

1. Build searchable alumni directory.
2. Add department/year filters.
3. Add connection request actions.
4. Add connections screen for accepted, incoming, outgoing, and suggestions.

Deliverable:

- Alumni can find and connect with other old students.

### Phase 6: Groups and messaging

1. Build groups list and group detail.
2. Add join/leave actions.
3. Add group posts.
4. Build conversation list and chat screen.
5. Add direct message creation.
6. Add Pusher realtime messaging after basic API messaging works.

Deliverable:

- Alumni can participate in groups and send messages.

### Phase 7: Jobs, events, mentorship, achievements

1. Build job board and application flow.
2. Build event list, detail, create, and RSVP flow.
3. Build mentorship discovery and request flow.
4. Build achievements and badges.

Deliverable:

- Alumni can use the full community and career feature set.

### Phase 8: Maps, charts, and ID cards

1. Build digital ID card screen.
2. Add QR verification and share/download options.
3. Build alumni map with aggregate state/department filters.
4. Build insights charts for member-friendly summaries.
5. Add responsive tablet layouts for map and chart screens.
6. Add polished animations for ID card reveal, chart transitions, and map filter changes.
7. Add any missing aggregate backend endpoint if required.

Deliverable:

- The Android app has the premium alumni features: verified ID, maps, and visual network insights.

### Phase 9: Polish and accessibility

1. Review typography, spacing, color contrast, and touch target sizes.
2. Add accessibility labels.
3. Add friendly empty/error states.
4. Add offline cached views.
5. Optimize startup and image loading.
6. Tune animations so transitions feel fast and calm.
7. Verify responsiveness across phone and tablet breakpoints.

Deliverable:

- The app feels professional, calm, and friendly for older alumni.

### Phase 10: Testing and release

1. Test login and onboarding with real test alumni accounts.
2. Test all APIs against production and staging if available.
3. Run UI tests for core flows.
4. Test on low-end Android devices.
5. Test slow network and offline behavior.
6. Build signed release APK/AAB.
7. Publish internal test to Google Play Console.
8. Gather feedback, fix issues, then promote to production.

Deliverable:

- Android app ready for alumni rollout.

## 26. Minimum Viable Product Scope

The first release should include:

- Login
- Onboarding
- Home dashboard
- Profile and settings
- Directory and connections
- Notifications
- Groups
- Messaging
- Jobs
- Events
- Mentorship
- ID card

Optional for first release:

- Full map
- Advanced charts
- Admin mobile features
- Push notifications
- Offline posting

## 27. Professional Feature Roadmap

Version 1.0:

- Member login and onboarding
- Profile and privacy
- Directory and connections
- Groups and messaging
- Jobs, events, mentorship
- Digital ID card

Version 1.1:

- Alumni map
- Charts and insights
- Push notifications
- Better offline cache
- Shareable achievement cards

Version 1.2:

- Admin companion screens
- Import job monitoring
- Alumni verification workflow
- Event check-in QR scanner

Version 2.0:

- Rich realtime chat
- Alumni nearby discovery with explicit consent
- Donation/fundraising integration
- Chapter management
- Advanced analytics

## 28. Acceptance Checklist

Before release, confirm:

- Login works with registration number and password.
- Default-password users are forced through onboarding.
- Cookies persist after closing and reopening the app.
- Session expiry returns users to login.
- Profile loads with `GET /api/profile`.
- Settings load with `GET /api/settings`.
- Directory search and pagination work.
- Connection request actions work.
- Groups can be joined and opened.
- Posts can be created.
- Conversations and messages work.
- Jobs load and applications submit.
- Events load and RSVP works.
- Mentorship request flow works.
- Notifications load and mark as read.
- ID card loads and verification link works.
- Privacy settings are respected in every screen.
- Slow network and offline states are friendly.
- App is tested on small and large Android screens.

## 29. Backend Gaps to Consider Later

The current API is enough to begin Android development. These optional endpoints can make the app even better:

- `GET /api/dashboard/mobile` for a single home summary request.
- `GET /api/map/alumni-distribution` for member-safe map aggregates.
- `GET /api/insights/alumni` for charts without using admin endpoints.
- `POST /api/push/register-device` for Firebase Cloud Messaging tokens.
- `POST /api/events/{id}/check-in` for QR event attendance.
- `GET /api/profile/{id}` for public alumni profile details from directory.

## 30. Final Recommendation

Build the Android app in stages, starting with authentication, onboarding, profile, directory, and connections. Once the core member identity flow is stable, add groups, messaging, jobs, events, mentorship, ID cards, maps, and charts.

The Android version should not simply copy the web app. It should feel like a mobile alumni companion: fast, readable, respectful, and useful for old students who want to reconnect, verify identity, find opportunities, and stay close to the GSU community.
