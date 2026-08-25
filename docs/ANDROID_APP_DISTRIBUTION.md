# Handing the Android app out from the landing page

The landing page carries a **Mobile App** section (`#download`) with a download
button, a scan-to-install QR code and the three install steps. Everything it
shows comes from one environment variable, so publishing a new build is a file
upload plus an env change — no code edit.

## How the pieces fit

| Piece | Role |
| --- | --- |
| `lib/app-download.ts` | Reads the env vars; decides whether the app is downloadable at all. |
| `app/api/download/android/route.ts` | `/api/download/android` — the only link we hand out. Redirects to wherever the APK currently lives. |
| `components/landing/download-section.tsx` | The section itself, plus the QR code pointing at that route. |
| `scripts/publish-android-apk.ts` | Uploads a build to S3 and prints the env lines. |

The route redirects instead of streaming the file: the APK is tens of megabytes,
and pushing it through a serverless function would spend function time and
bandwidth on every install for nothing — the bucket already handles ranged
requests and resumes, which is what matters on the connections most members are
on. Because every link we publish (QR codes included) points at
`/api/download/android`, moving the binary — another bucket, or a Play Store
listing later — never invalidates a link already in the wild.

## Environment variables

| Variable | Required | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_ANDROID_APK_URL` | yes | Absolute URL, or a site-relative path such as `/downloads/gsu-alumni-connect.apk`. **Unset means the section shows "Android build coming soon"** rather than a link that 404s. |
| `NEXT_PUBLIC_ANDROID_APP_VERSION` | no | Display only. Defaults to `0.1.0`; keep it in step with `version:` in `mobile/pubspec.yaml`. |
| `NEXT_PUBLIC_ANDROID_APK_SIZE` | no | Display only, e.g. `21 MB`. Blank just omits it. |

These are `NEXT_PUBLIC_*`, so they are baked in at build time — **redeploy after
changing them.**

## Publishing a build

1. **Sign it with the release key** — see [Setting up the signing key](#setting-up-the-signing-key)
   below. Release signing only kicks in when `mobile/android/key.properties`
   exists (see `mobile/android/app/build.gradle.kts`). Without it the release
   build falls back to the debug key, whose private half ships with every
   Android SDK. Android binds an installed app to the certificate it was signed
   with, so a debug-signed build can never be updated by a real one — every
   member would have to uninstall and reinstall, losing their session. Never
   hand a debug-signed APK to members.

2. **Build it.** Per-ABI keeps each file around 17–20 MB instead of a 55 MB
   universal APK:

   ```bash
   cd mobile && flutter build apk --release --split-per-abi
   ```

   `app-arm64-v8a-release.apk` covers essentially every current Android phone.
   The universal `app-release.apk` installs anywhere at roughly triple the
   download, which is the safer choice for a mixed, older device base.

3. **Upload it and read off the env lines.**

   ```bash
   pnpm app:publish-apk -- --file mobile/build/app/outputs/flutter-apk/app-arm64-v8a-release.apk
   ```

   Add `--dry-run` (or `pnpm app:publish-apk:preview`) to see the key, size and
   SHA-256 without uploading. The key carries the version, so each published
   build is kept and a rollback is just an env change back to the old URL.

4. **Set the three variables on Vercel and redeploy.**

## Setting up the signing key

Do this once, before the first build any member installs. **Android identifies
an app by its signing certificate**, not by its version or its package name. An
update only installs over an existing app when both are signed by the same key.
So this key is the app's identity for its whole life:

- **Lose it** and you can never update the app again. The only way forward is a
  new package id and every member uninstalling and reinstalling — losing their
  session, and with it every install you had.
- **Leak it** and anyone can build an APK that Android accepts as a legitimate
  update to ours.

Nothing here is committed: `key.properties`, `*.jks` and `*.keystore` are all in
`mobile/android/.gitignore`.

### 1. Create the keystore

Run this yourself — `keytool` prompts for the passwords, so nobody else needs to
see them. Keep the file **outside the repo**:

```bash
keytool -genkeypair -v -keystore "$HOME/keys/gsu-alumni-connect-release.jks" -keyalg RSA -keysize 4096 -validity 10000 -alias gsu-alumni-connect
```

`-validity 10000` is about 27 years; a certificate that expires before an update
is signed cannot ship that update. Answer the name/organisation prompts with the
Alumni Association's details — they end up in the certificate and cannot be
changed later.

### 2. Point Gradle at it

```bash
cp mobile/android/key.properties.example mobile/android/key.properties
```

Fill in `storePassword`, `keyPassword` and the absolute `storeFile` path. Gradle
reads it automatically on the next release build.

### 3. Rebuild and confirm the signer

```bash
cd mobile && flutter build apk --release --split-per-abi
```

```bash
apksigner verify --print-certs mobile/build/app/outputs/flutter-apk/app-arm64-v8a-release.apk
```

The certificate must be the Alumni Association's. If it prints
`CN=Android Debug, OU=Android, O=Android`, `key.properties` was not picked up and
the build is still debug-signed — `pnpm app:publish-apk` refuses to upload it.

### 4. Back it up before you publish anything

The keystore file **and** its passwords, in two places that do not fail together
— a password manager entry plus an offline copy the Association controls, not
one laptop. Losing this is unrecoverable; there is no reset.

### Updating the app later

Bump `version:` in `mobile/pubspec.yaml` (the `+1` build number must increase —
Android refuses to install a build whose `versionCode` is not higher), rebuild,
run `pnpm app:publish-apk`, then update `NEXT_PUBLIC_ANDROID_APK_URL` on Vercel
and redeploy. The new build installs straight over the old one, sessions intact,
as long as it is signed with the same key.

## Checking it locally

Drop any APK into `public/downloads/` and point the variable at it:

```
NEXT_PUBLIC_ANDROID_APK_URL=/downloads/gsu-alumni-connect.apk
```

`public/downloads/*.apk` is gitignored — a build that size has no business in
the repo, and production reads the S3 URL instead.
