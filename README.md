# PNCodeDash

A testing board for Pocketnest features. It reads open pull requests from
`pocketnest/pocketnest-web` and `pocketnest/pocketnest-react-native`, keeps the
ones labeled `ready-for-testing`, and pairs web with React Native when both
pull requests share a `feature:` label.

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

A pull request appears when it has the `ready-for-testing` label and a
`feature:` label, for example `feature:smart-recommendations`. The same feature
label on a web pull request and a React Native pull request places them on one
card. The preview URL is entered on the branch after a developer starts a
preview server. Saving it requires the token to also edit files in
`pocketnest/pncodedash`.

## Commands

```bash
npm run dev    # local development
npm run lint   # lint the codebase
npm run build  # production build
npm run start  # run the production build
```
