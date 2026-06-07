# Frequently Asked Questions (FAQ)

## Authentication & Access

### How do I get or find the Admin Password?

There is no default admin password. You must **create and set it yourself** in the `.env` file before starting the application.

1. Open the `.env` file in your project directory.
2. Find the line `ADMIN_PASSWORD="your-secure-password"`.
3. Replace `"your-secure-password"` with a strong password of your choice.
4. If you have already started the container, you will need to restart it (`docker compose up -d`) to apply the changes.
5. Log in using the email specified in `ADMIN_EMAILS` and the password you just set.

### How do I log in for the first time?

1. Make sure your `.env` has both `ADMIN_EMAILS` and `ADMIN_PASSWORD` filled out.
2. Open your Zee-Index site (e.g., `http://localhost:3000`).
3. Click the **Login** button or navigate to `/login`.
4. Enter the email and the password you defined in your `.env` file.

### How do I use a hashed password instead of plaintext?

For better security in production, it is recommended to use `ADMIN_PASSWORD_HASH` instead of `ADMIN_PASSWORD`.

1. Run the hashing script provided via Docker:
   ```bash
   docker compose exec zee-index sh /app/scripts/hash-password.sh "your-password"
   ```
2. The script will output a hash starting with `$2a$10$...`.
3. Copy this hash and paste it into your `.env` file as `ADMIN_PASSWORD_HASH`.
4. You can then safely remove or comment out the plaintext `ADMIN_PASSWORD`.
5. Restart the containers: `docker compose up -d`.

---

## Setup & Configuration

### I am seeing `The "CRON_SECRET" variable is not set` warning in Docker logs. What is this?

The `CRON_SECRET` is used to securely trigger scheduled background tasks (like clearing expired share links).
To fix this warning:

1. Open your `.env` file.
2. Add or update the `CRON_SECRET` variable with a random string (e.g., `CRON_SECRET="my-super-secret-cron-key"`).
3. Restart your containers.

### How do I get the Google Drive Root Folder ID?

1. Open Google Drive in your browser.
2. Navigate to the folder you want to use as the root directory for Zee-Index.
3. Look at the URL in your browser. It will look like this: `https://drive.google.com/drive/folders/1ABcDeFgHiJkLmNoPqRsT...`
4. Copy the string of characters after `/folders/`. This is your Folder ID.
5. Paste it into your `.env` file as `NEXT_PUBLIC_ROOT_FOLDER_ID="1ABcDeFgHiJkLmNoPqRsT..."`.

### How do I obtain the Google OAuth Client ID and Secret?

Please refer to the [Google Cloud Setup](#) section in the main `README.md`. It provides a step-by-step guide to creating a project, enabling the Google Drive API, and generating OAuth credentials.

### Why is my Google Setup flow failing or giving an "Access Denied" error?

- Ensure that the Google account you are logging in with has been added as a "Test User" in the OAuth Consent Screen on Google Cloud Console (if your app is in "Testing" mode).
- Ensure that the Authorized Redirect URIs in your Google Cloud Console exactly match the URL you are testing from (e.g., `http://localhost:3000/setup`).

---

## General

### How do I clear the cache?

If files are not showing up or changes aren't reflecting, you can clear the cache:

- **From UI**: Log in as Admin, go to the Admin Dashboard, and use the "Clear Cache" button.
- **Via API**: Send a DELETE request to `/api/admin/clearcache` (requires admin privileges).
- **Via Docker (Redis)**: `docker compose exec redis redis-cli FLUSHALL`
