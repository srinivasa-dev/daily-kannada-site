# Daily Kannada Site

This repository contains the public website and lightweight admin interface for the Daily Kannada project.

It is a static HTML/CSS/JavaScript site with no build step, no package manager, and no frontend framework. Pages are served directly as files and call the Daily Kannada API over HTTP.

## What this project includes

The site currently serves three main purposes:

1. Public product and compliance pages for the Daily Kannada mobile app
2. A simple admin UI for authenticated admin users to view and update phrases
3. A standalone password reset page for end users coming from email links

## Tech stack

- Static HTML pages
- Shared CSS in `assets/css/styles.css`
- ES module JavaScript in `assets/js/*.js`
- Browser `fetch` for API calls
- `sessionStorage` for admin session persistence
- Bootstrap CDN on admin pages only

There is no bundler, transpiler, or runtime framework in this repo.

## Project structure

```text
.
├── admin-health.html
├── admin.html
├── assets
│   ├── css
│   │   └── styles.css
│   └── js
│       ├── admin-health.js
│       ├── admin.js
│       ├── api.js
│       ├── auth.js
│       ├── config.js
│       ├── login.js
│       └── reset-password.js
├── delete-account.html
├── docs
│   └── reset-password-page.md
├── index.html
├── login.html
├── privacy.html
└── reset-password
    └── index.html
```

## Routes and pages

### Public pages

- [`/Users/srinivasayadav/StudioProjects/daily-kannada-site/index.html`](/Users/srinivasayadav/StudioProjects/daily-kannada-site/index.html)
  - Landing page for the app
  - Links to privacy policy, delete-account policy, and Play Store

- [`/Users/srinivasayadav/StudioProjects/daily-kannada-site/privacy.html`](/Users/srinivasayadav/StudioProjects/daily-kannada-site/privacy.html)
  - Privacy policy page

- [`/Users/srinivasayadav/StudioProjects/daily-kannada-site/delete-account.html`](/Users/srinivasayadav/StudioProjects/daily-kannada-site/delete-account.html)
  - Account deletion instructions and support contact

### Admin pages

- [`/Users/srinivasayadav/StudioProjects/daily-kannada-site/login.html`](/Users/srinivasayadav/StudioProjects/daily-kannada-site/login.html)
  - Admin login form
  - Stores session in browser `sessionStorage`

- [`/Users/srinivasayadav/StudioProjects/daily-kannada-site/admin.html`](/Users/srinivasayadav/StudioProjects/daily-kannada-site/admin.html)
  - Admin phrase management page
  - Lists paginated phrases grouped by category
  - Allows inline editing of selected fields

- [`/Users/srinivasayadav/StudioProjects/daily-kannada-site/admin-health.html`](/Users/srinivasayadav/StudioProjects/daily-kannada-site/admin-health.html)
  - API health dashboard for operators/admins

### Standalone user recovery page

- [`/Users/srinivasayadav/StudioProjects/daily-kannada-site/reset-password/index.html`](/Users/srinivasayadav/StudioProjects/daily-kannada-site/reset-password/index.html)
  - Password reset page for links sent by email
  - Intended URL:
    - `https://dailykannada.srinivasa.dev/reset-password?token=...`
  - Not linked from other pages on purpose

## Core JavaScript modules

### API layer

File:

[`/Users/srinivasayadav/StudioProjects/daily-kannada-site/assets/js/api.js`](/Users/srinivasayadav/StudioProjects/daily-kannada-site/assets/js/api.js)

Responsibilities:

- Reads the API base URL from config
- Builds request URLs
- Sends JSON requests with `fetch`
- Adds `X-App-Key: daily-kannada-mobile` to requests
- Adds `Authorization: Bearer ...` for authenticated requests
- Normalizes API failures into `ApiError`
- Clears the browser session when the API returns `401` or `403`

Currently exposed helpers:

- `loginRequest(email, password)`
- `resetPasswordRequest(token, password)`
- `fetchPhrases({ limit, offset })`
- `patchPhrase(id, payload)`
- `fetchAdminHealth()`

### Auth/session layer

File:

[`/Users/srinivasayadav/StudioProjects/daily-kannada-site/assets/js/auth.js`](/Users/srinivasayadav/StudioProjects/daily-kannada-site/assets/js/auth.js)

Responsibilities:

- Stores the admin session in `sessionStorage`
- Reads and clears the current session
- Validates whether the logged-in user has role `admin`
- Redirects unauthorized users to `login.html`
- Provides logout behavior

Important detail:

- Admin authentication is browser-session-based, not cookie-based, inside this site.

### Login page controller

File:

[`/Users/srinivasayadav/StudioProjects/daily-kannada-site/assets/js/login.js`](/Users/srinivasayadav/StudioProjects/daily-kannada-site/assets/js/login.js)

Responsibilities:

- Handles the admin login form
- Prevents already-authenticated admins from visiting `login.html`
- Saves `{ token, user }` to `sessionStorage`
- Redirects successful admins to `admin.html`

### Admin phrases controller

File:

[`/Users/srinivasayadav/StudioProjects/daily-kannada-site/assets/js/admin.js`](/Users/srinivasayadav/StudioProjects/daily-kannada-site/assets/js/admin.js)

Responsibilities:

- Requires an admin session before loading
- Fetches paginated phrases from the API
- Normalizes pagination headers
- Groups phrase rows by category
- Renders editable tables
- Saves inline edits back to the API
- Supports page size changes and pagination controls

Editable fields currently include:

- `english_text`
- `kannada_text`
- `transliteration`
- `usage_examples`
- `cultural_context`
- `is_active`

### Admin health controller

File:

[`/Users/srinivasayadav/StudioProjects/daily-kannada-site/assets/js/admin-health.js`](/Users/srinivasayadav/StudioProjects/daily-kannada-site/assets/js/admin-health.js)

Responsibilities:

- Requires an admin session
- Calls `/admin/health`
- Renders service status, checks, metrics, and response information
- Translates backend status strings into UI tones like success, error, and neutral

### Reset password controller

File:

[`/Users/srinivasayadav/StudioProjects/daily-kannada-site/assets/js/reset-password.js`](/Users/srinivasayadav/StudioProjects/daily-kannada-site/assets/js/reset-password.js)

Responsibilities:

- Reads the reset `token` from the URL query string
- Validates new password submission
- Sends `POST /auth/reset-password`
- Shows a friendly message when the token is already used or invalid
- Disables the form after success or invalid token
- Handles the password visibility eye toggles

For the full reset-password implementation notes, see:

- [`/Users/srinivasayadav/StudioProjects/daily-kannada-site/docs/reset-password-page.md`](/Users/srinivasayadav/StudioProjects/daily-kannada-site/docs/reset-password-page.md)

## Styling model

File:

[`/Users/srinivasayadav/StudioProjects/daily-kannada-site/assets/css/styles.css`](/Users/srinivasayadav/StudioProjects/daily-kannada-site/assets/css/styles.css)

This file contains the shared design system and page-specific rules for the entire site.

It includes:

- core variables for colors, spacing, border radius, and shadows
- shared public site layout
- shared button and form styles
- admin layout, table, pagination, and health dashboard styles
- reset-password page styles

Important constraint:

- Because there is a single CSS file, changes can affect multiple pages unexpectedly. Check both public pages and admin pages when editing global selectors.

## Configuration

File:

[`/Users/srinivasayadav/StudioProjects/daily-kannada-site/assets/js/config.js`](/Users/srinivasayadav/StudioProjects/daily-kannada-site/assets/js/config.js)

Current structure:

```js
window.DAILY_KANNADA_CONFIG = {
  apiBaseUrl: "https://daily-kannada-api.srinivasa.dev",
};
```

This value is required by `assets/js/api.js`.

If `apiBaseUrl` is missing, the site throws an `API_BASE_URL_MISSING` error before requests are made.

## API assumptions

This site assumes the backend:

- accepts JSON requests
- returns JSON responses for successful and failed calls
- supports the `X-App-Key: daily-kannada-mobile` header
- returns `401` or `403` for expired/invalid auth
- returns pagination data partly through response headers for `/phrases`

Known endpoints used by the site:

- `POST /auth/login`
- `POST /auth/reset-password`
- `GET /phrases`
- `PATCH /admin/phrases/:id`
- `GET /admin/health`

## Session behavior

Admin users are stored in browser `sessionStorage` under a single key managed by `auth.js`.

Implications:

- refreshing the tab keeps the admin session
- closing the browser session may remove it, depending on browser behavior
- clearing site storage logs the admin out
- auth is isolated to the current browser session

## Hosting and routing assumptions

This repo is designed to be served as a static site.

Important consequences:

- every page is a physical file
- there is no SPA router
- nested URLs only work when backed by directory index files
- asset paths matter

Examples:

- `login.html` is a flat route
- `reset-password/index.html` exists specifically so `/reset-password?token=...` works on static hosting

If hosting behavior changes, check whether directory index routes like `/reset-password` are still supported.

## Local development

There is no build step. To work on the site locally:

1. Serve the repository with any static file server.
2. Open the relevant page in a browser.
3. Point `assets/js/config.js` at the intended backend if needed.

Examples of what to test manually:

- public pages load correctly
- admin login works
- phrase list pagination works
- phrase edits save correctly
- health dashboard loads
- reset-password page works from `/reset-password?token=...`

## Deployment

Deployment is required for new or changed routes to appear on the production domain.

Practical examples:

- changes to `reset-password/index.html` do nothing on production until deployed
- a new page route will 404 on production until the updated files are published

Before considering a feature done, verify the deployed URL instead of only checking local files.

## Maintenance guidance

### When adding a new page

- Decide whether it should be a flat file like `foo.html` or a directory route like `foo/index.html`
- Use absolute asset paths if the page is nested
- Add scripts with `type="module"` if they import other modules
- Keep it unlinked if the page is meant to be accessed only from external flows

### When adding a new API call

- Add the helper to `assets/js/api.js`
- Decide whether the request is authenticated
- Reuse `ApiError` instead of custom per-page request code

### When changing authentication behavior

- Check `auth.js`
- Check `login.js`
- Check `api.js` handling of `401` and `403`
- Verify both admin pages still redirect correctly

### When editing CSS

- Prefer narrow selectors for page-specific work
- Re-test admin tables because the file contains many shared form/input styles
- Re-test reset-password because it uses nested route asset loading and custom field wrappers

## Known constraints

- No automated test suite in this repo
- No lint or formatting pipeline in this repo
- No package manifest or dependency lockfile
- Admin UI depends directly on live API behavior
- Bootstrap is loaded from CDN on admin pages
- Most verification is manual browser testing

## Recommended manual regression checklist

After meaningful changes, verify:

1. [`/Users/srinivasayadav/StudioProjects/daily-kannada-site/index.html`](/Users/srinivasayadav/StudioProjects/daily-kannada-site/index.html) renders correctly
2. [`/Users/srinivasayadav/StudioProjects/daily-kannada-site/privacy.html`](/Users/srinivasayadav/StudioProjects/daily-kannada-site/privacy.html) and [`/Users/srinivasayadav/StudioProjects/daily-kannada-site/delete-account.html`](/Users/srinivasayadav/StudioProjects/daily-kannada-site/delete-account.html) still load
3. [`/Users/srinivasayadav/StudioProjects/daily-kannada-site/login.html`](/Users/srinivasayadav/StudioProjects/daily-kannada-site/login.html) still authenticates admins
4. [`/Users/srinivasayadav/StudioProjects/daily-kannada-site/admin.html`](/Users/srinivasayadav/StudioProjects/daily-kannada-site/admin.html) still loads phrases and saves edits
5. [`/Users/srinivasayadav/StudioProjects/daily-kannada-site/admin-health.html`](/Users/srinivasayadav/StudioProjects/daily-kannada-site/admin-health.html) still loads health data
6. [`/Users/srinivasayadav/StudioProjects/daily-kannada-site/reset-password/index.html`](/Users/srinivasayadav/StudioProjects/daily-kannada-site/reset-password/index.html) still works with a tokenized URL

## Suggested future improvements

- Add a deployment guide once hosting details are standardized
- Add browser-based smoke tests if the project grows further
- Split CSS if global styles become hard to manage
- Add a small local development note for whichever static server is preferred
- Document the expected backend response shapes more formally

## Summary

This project is intentionally simple: a static website with a shared stylesheet and a few ES module scripts that talk directly to the Daily Kannada API. The main implementation constraints come from static hosting, direct API coupling, and manual verification. If you preserve those assumptions while making changes, the codebase stays straightforward to maintain.
