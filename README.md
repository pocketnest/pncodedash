# PNCodeDash

A testing board for Pocketnest features. It reads open pull requests from
`pocketnest/pocketnest-web` and `pocketnest/pocketnest-react-native`. A pull
request is included when it has the `ready-for-testing` label or its GitHub
Project status is Ready to test. Pull requests on the same project are grouped
onto one card. A shared `feature:` label still groups them when they are not
on a project.

## Google sign-in

The board requires a verified `@pocketnest.com` Google account. Create a Google
OAuth web client and set these environment variables in Vercel and locally:

```bash
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
NEXTAUTH_SECRET=a_long_random_string
NEXTAUTH_URL=https://pncodedash.vercel.app
```

Use `http://localhost:3000` for `NEXTAUTH_URL` when running locally. In Google
Cloud, add these authorized redirect URIs:

- `https://pncodedash.vercel.app/api/auth/callback/google`
- `http://localhost:3000/api/auth/callback/google`

Set the OAuth consent screen to Internal so only the Pocketnest Workspace can
grant access. The app also rejects any account whose verified email is not
`@pocketnest.com`.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Without `GITHUB_TOKEN`, the board shows sample features stored in the browser.
To read the Pocketnest repositories, create a GitHub token that can read pull
requests and deployments in both repositories, then start the app with it:

```bash
GITHUB_TOKEN=your_token npm run dev
```

A pull request appears when it has the `ready-for-testing` label, or when its
GitHub Project status is Ready to test. Web and React Native pull requests
assigned to the same project are placed on one card. Give the token permission
to read GitHub Projects. If that permission is missing, pull requests with the
label still appear, and the board says that project grouping is unavailable.
The testing environment URL is filled from the latest successful deployment
on the backend branch in `pocketnest-web`. The token needs Deployments read
permission on that repository. A saved URL replaces the deployment URL. The
board stores a saved URL in Vercel Blob and does not write it to GitHub.

Create a Blob store in the Vercel project and connect it. Vercel sets
`BLOB_READ_WRITE_TOKEN`. Pull that variable locally with `vercel env pull`
before saving URLs in development.

To show ClickUp tickets, tag each task with the feature slug from the GitHub
label. A task tagged `smart-recommendations` appears on the card for
`feature:smart-recommendations`. Create a personal API token in ClickUp under
Settings → Apps, then start the app with the Workspace ID from the ClickUp URL:

```bash
CLICKUP_API_TOKEN=pk_your_token CLICKUP_TEAM_ID=your_workspace_id GITHUB_TOKEN=your_token npm run dev
```

## Pull request previews

Vercel deploys this repository automatically. A push to `main` updates
https://pncodedash.vercel.app. A pull request gets its own preview, and Vercel
posts the preview URL on the pull request.

## Commands

```bash
npm run dev    # local development
npm run lint   # lint the codebase
npm run build  # production build
npm run start  # run the production build
```
