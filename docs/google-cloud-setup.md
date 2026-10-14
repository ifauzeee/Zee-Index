# Google Cloud Setup

Zee-Index uses one Google OAuth client for two things:

1. **Drive access.** The `/setup` wizard asks for the `drive` scope once and stores a refresh token (`GOOGLE_REFRESH_TOKEN`). Every Drive request is then made as the account that authorized it.
2. **"Continue with Google" sign-in** (optional). Visitors sign in with their Google account and get the `USER` role, or `ADMIN` if their email is an admin.

Both use the same client ID and secret.

- [1. Create or pick a project](#1-create-or-pick-a-project)
- [2. Enable the Google Drive API](#2-enable-the-google-drive-api)
- [3. Configure the OAuth consent screen](#3-configure-the-oauth-consent-screen)
- [4. Create the OAuth client](#4-create-the-oauth-client)
- [5. Put the credentials in `.env`](#5-put-the-credentials-in-env)
- [6. Run the setup wizard](#6-run-the-setup-wizard)
- [Testing vs. production publishing](#testing-vs-production-publishing)
- [Rotating the client secret](#rotating-the-client-secret)
- [Troubleshooting](#troubleshooting)

---

## 1. Create or pick a project

Open the [Google Cloud Console](https://console.cloud.google.com/), then create a project or select an existing one from the project picker.

## 2. Enable the Google Drive API

**APIs & Services → Library** → search for **Google Drive API** → **Enable**.

Without it, setup succeeds but every listing fails with `accessNotConfigured`.

## 3. Configure the OAuth consent screen

**Google Auth Platform → Branding / Audience / Data access** (older consoles: **APIs & Services → OAuth consent screen**).

| Setting              | Value                                                                                        |
| -------------------- | -------------------------------------------------------------------------------------------- |
| User type / Audience | **External** (or Internal if everyone is in your Google Workspace)                           |
| App name, emails     | Anything; shown on Google's consent page                                                     |
| Authorized domains   | Your domain, if you use one (added automatically from the redirect URIs)                     |
| Scopes (Data access) | `.../auth/drive`, plus `openid`, `.../auth/userinfo.email`, `.../auth/userinfo.profile`      |
| Test users           | **Add the Google account that will authorize Drive**, and anyone who will use Google sign-in |

While the app is in **Testing**, only listed test users can complete the consent flow. Everyone else gets "Access blocked" or `access_denied`.

## 4. Create the OAuth client

**Google Auth Platform → Clients → Create client** (older consoles: **Credentials → Create credentials → OAuth client ID**).

- **Application type:** Web application
- **Name:** anything, e.g. `Zee-Index`

**Authorized JavaScript origins.** Add every origin you open Zee-Index from:

```
http://localhost:3000
https://files.example.com
```

**Authorized redirect URIs.** Add all of these for each origin:

| URI                                                              | Used by                                              |
| ---------------------------------------------------------------- | ---------------------------------------------------- |
| `<origin>/setup`                                                 | The setup wizard (Drive authorization)               |
| `<origin>/en/setup`, `<origin>/id/setup`, `<origin>/zh-TW/setup` | The wizard when it is opened under a language prefix |
| `<origin>/api/auth/callback/google`                              | "Continue with Google" sign-in                       |

For example, for local development:

```
http://localhost:3000/setup
http://localhost:3000/en/setup
http://localhost:3000/api/auth/callback/google
```

Redirect URIs must match **exactly**: scheme, host, port, and path. `http://localhost:3000` and `http://127.0.0.1:3000` are different origins.

Click **Create**. Copy the **Client ID** and **Client secret**. The secret is shown only once, so you can download the JSON or create a new secret later.

> Changes to an OAuth client can take from a few minutes to a few hours to take effect.

## 5. Put the credentials in `.env`

```env
GOOGLE_CLIENT_ID="1234567890-abc.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-..."
GOOGLE_REFRESH_TOKEN=""
NEXT_PUBLIC_ROOT_FOLDER_ID="root"
```

## 6. Run the setup wizard

Start the app and open `/setup`. [Getting Started → First-run setup](getting-started.md#6-first-run-setup) walks through it, including where to find the setup token.

The wizard requests `access_type=offline&prompt=consent`, so Google always returns a refresh token. Google may still reuse an earlier grant. If no refresh token comes back, remove the app's access at [myaccount.google.com/permissions](https://myaccount.google.com/permissions) and run setup again.

## Testing vs. production publishing

- **Testing:** fine for personal use. Only test users can authorize. Google may expire refresh tokens of apps in testing after **7 days**. When that happens, Drive listings fail with "Google Drive session expired". Run `/setup` again to get a new token.
- **In production:** refresh tokens do not expire on a timer. Requesting the `drive` scope for a public app requires Google's verification. For a private instance, an unverified app in production also works: you click through the "unverified app" warning once.

## Rotating the client secret

1. In the client's page, click **Add secret**, copy it, and put it in `GOOGLE_CLIENT_SECRET`.
2. Restart: `docker compose up -d`.
3. Check that listings still work, then **delete the old secret** in the console.

The refresh token stays valid across a secret rotation of the same client.

## Troubleshooting

| Symptom                                               | Cause and fix                                                                                     |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `redirect_uri_mismatch`                               | The URI shown in the error is missing from **Authorized redirect URIs**. Add it exactly as shown. |
| `access_denied` / "Access blocked"                    | Your account is not a test user while the app is in Testing.                                      |
| `invalid_client` / "The OAuth client was not found"   | Wrong or deleted client ID/secret in `.env`, or the app was not restarted after editing it.       |
| Setup finishes but listings say `accessNotConfigured` | The Google Drive API is not enabled in this project.                                              |
| "Google Drive session expired"                        | The refresh token was revoked or expired (Testing apps: 7 days). Run `/setup` again.              |
| Files outside the root folder are visible to admins   | Expected: admins see everything. Others only see the root folder, manual drives and shared items. |
