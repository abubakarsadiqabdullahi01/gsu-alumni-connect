# GSU Alumni Connect — Android app

Flutter client for the GSU Alumni Connect platform. It talks to the same
deployed Next.js API as the web app, using the same Better Auth session cookie.

## Running it

```bash
flutter pub get
```

```bash
flutter run
```

Point it at a different backend with a dart-define:

```bash
flutter run --dart-define=API_BASE_URL=https://staging.gsualumni.org.ng
```

Release builds (per-ABI keeps each APK around 17–20 MB instead of a 55 MB fat
APK):

```bash
flutter build apk --release --split-per-abi
```

## Toolchain note

Gradle on this machine must run on Java 21. Newer Android Studio ships Java 25,
which AGP 8.11 rejects with a bare `25.0.2` error. The pin lives in
`~/.gradle/gradle.properties`:

```
org.gradle.java.home=C:/Program Files/Android/Android Studio/jbr
```

## How authentication works

Better Auth issues an **httpOnly** session cookie. That means the app cannot
read or store a token itself — the cookie jar on disk *is* the credential store.

- `PersistCookieJar` (in the app support directory) holds the cookie across
  restarts.
- `POST /api/auth/sign-in/registration` accepts a registration number **or** an
  email address, plus the password.
- On launch the app calls `GET /api/mobile/bootstrap`. A `401` or `404` means
  "signed out"; anything else is a real error and is surfaced as one.
- A `401` from *any* request broadcasts through `AuthEvents`, which tears the
  session down centrally rather than leaving one screen stuck.
- Sign-out clears the jar locally even if the server call fails, so a user is
  never stranded in a half-signed-in state.

## Layout

```
lib/
  core/
    branding/     GsuCrest — the app mark, drawn as vectors (no bitmap assets)
    config/       API base URL, timeouts, relative→absolute URL resolution
    network/      Dio + cookie jar, ApiService, typed ApiException
    theme/        Colour tokens and the light/dark Material 3 themes
    utils/        Dependency-free date/number/currency formatters
    widgets/      The shared UI kit and loading/empty/error states
  data/
    models/       Typed models with defensive JSON parsing
    alumni_repository.dart   Every server call, in one place
    providers.dart           Riverpod providers and paging controllers
  features/       One folder per screen area
```

Screens never touch Dio or raw JSON — they go through `AlumniRepository`.

## Notes on a few deliberate choices

**Feature flags.** The admin console can switch off jobs, mentorship,
messaging, map and groups. `bootstrap` returns those flags and the shell drops
the corresponding tabs, so the app never shows a destination that answers 403.

**The map.** Rendered as a custom-painted bubble map over a simplified national
outline, projected equirectangularly from the state centroids the API returns.
No tile server, no API key, no per-view billing, and it works offline once the
data is cached. The outline is a cartographic backdrop, not a survey boundary.

**The ID card.** The server signs a short-lived HMAC-SHA256 payload; the client
only renders it. It never mints or edits card values, because the QR
verification URL is signed against exactly that payload.

**JSON parsing.** The API returns Prisma output directly, so nullable columns
arrive as `null` and `Decimal` columns arrive as strings. The helpers in
`data/models/json_utils.dart` absorb that rather than scattering casts.

## Tests

```bash
flutter test
```

Covers the formatters, the defensive JSON parsing (including both payload
shapes the API uses for a person, and `Decimal`-as-string salaries), and a few
widget smoke tests.
