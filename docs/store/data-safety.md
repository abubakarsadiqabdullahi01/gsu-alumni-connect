# Data safety (Google Play) and App Privacy (Apple)

Answers for the mobile app, version 1.0.0 (4) and later, from what the code
collects. They match https://www.gsualumni.org.ng/privacy. If the app changes
what it collects, update both forms and the policy together.

Facts these answers rest on:
- No ads, no advertising ID, no analytics or crash-reporting SDK in the app
  (Vercel Analytics is on the website only).
- No device location: the city and state on a profile are typed by the member.
- Build 4 and later bundle the Manrope font, so the app makes no requests to
  Google. Builds 2 and 3 still download it; that is why the privacy policy
  still names Google Fonts.
- Service providers (hosting, database, storage, email, real-time) process data
  on our behalf, which both stores do not count as "sharing".
- Other members see a profile because the member chose to be in the
  directory; that is a user-initiated disclosure, not sharing.

## Google Play: Data safety form

**Overview questions**

| Question | Answer |
|---|---|
| Does your app collect or share any of the required user data types? | Yes |
| Is all of the user data collected by your app encrypted in transit? | Yes (HTTPS only) |
| Do you provide a way for users to request that their data is deleted? | Yes. In-app (Settings > Delete account) and https://www.gsualumni.org.ng/delete-account |

**Data types.** For every row: *Shared* = No; *Processed ephemerally* = No.

| Category > type | Collected | Required or optional | Purposes |
|---|---|---|---|
| Personal info > Name | Yes | Required | App functionality, Account management |
| Personal info > Email address | Yes | Optional | App functionality, Account management |
| Personal info > User IDs (registration number, alumni ID number) | Yes | Required | App functionality, Account management, Fraud prevention and security |
| Personal info > Address (city and state typed on the profile) | Yes | Optional | App functionality |
| Personal info > Phone number | Yes | Optional | App functionality |
| Personal info > Other info (sex, state of origin, faculty, department, graduation year, CGPA, degree class, JAMB number, date of birth, NYSC details, employment, education, skills) | Yes | Required (academic record), optional (the rest) | App functionality, Fraud prevention and security (CGPA or surname confirms identity at activation) |
| Financial info > Other financial info (salary range) | Yes | Optional | Analytics (anonymous, aggregated only) |
| Photos and videos > Photos (profile photo, signature, post images) | Yes | Optional | App functionality |
| Files and docs (CVs attached to job applications) | Yes | Optional | App functionality |
| Messages > Other in-app messages (direct messages, group posts, comments) | Yes | Optional | App functionality |
| App activity > Other user-generated content (events, jobs, mentorship requests) | Yes | Optional | App functionality |
| App activity > App interactions (profile views shown to the viewed member) | Yes | Optional | App functionality |

Not collected: Location (precise or approximate), Health and fitness, Web
browsing, Contacts, Calendar, Audio, App info and performance (crash logs,
diagnostics), Device or other IDs.

The server's security log records IP address and browser or device
description on failed sign-ins and activation attempts. Play's form has no
type for IP address. If a reviewer asks, the answer is "collected for Fraud
prevention and security, deleted after 12 months", which the privacy policy
already says.

**Other Play Console declarations**

| Declaration | Answer |
|---|---|
| Ads | No ads |
| App access | Restricted: needs a reviewer account (not yet created; see listing.md) |
| Target audience | 18 and over |
| Content rating (IARC) | Users can interact with each other (messages, posts). No violence, sexual content, gambling or controlled substances. Shares user location: No. Digital purchases: No |
| News app | No |
| Government app | Yes: published by Gombe State University, a state government university. Play may ask for proof of authorisation |
| Financial features | None |
| Health | None |
| Data deletion URL | https://www.gsualumni.org.ng/delete-account |

## Apple: App Privacy ("nutrition label")

**Do you or your third-party partners collect data from this app?** Yes.

**Tracking:** No. The app does not link data with third-party data for
advertising, and does not share data with data brokers. No ATT prompt.

All data below is **Linked to the user** and **Not used for tracking**.

| Apple data type | Purposes |
|---|---|
| Contact Info > Name | App Functionality |
| Contact Info > Email Address | App Functionality |
| Contact Info > Phone Number | App Functionality |
| Contact Info > Physical Address (city and state) | App Functionality |
| Identifiers > User ID (registration number) | App Functionality |
| Financial Info > Other Financial Info (salary range) | Analytics |
| User Content > Photos or Videos | App Functionality |
| User Content > Emails or Text Messages (in-app messages) | App Functionality |
| User Content > Other User Content (posts, comments, jobs, events, CVs) | App Functionality |
| Usage Data > Product Interaction (profile views) | App Functionality |
| Other Data > Other Data Types (academic record, date of birth, NYSC, employment, education) | App Functionality, Other Purposes (identity confirmation at activation) |

Not collected: Health and Fitness, Location, Sensitive Info, Contacts,
Browsing or Search History, Diagnostics, Purchases, Device ID.

**Privacy manifest (iOS build):** declare the same collected types in
`PrivacyInfo.xcprivacy`, with `NSPrivacyTracking = false` and no tracking
domains. This is done when the iOS platform is added.
