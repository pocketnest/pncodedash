# PNCodeDash

A testing board for Pocketnest features. It reads open pull requests from
`pocketnest/pocketnest-web` and `pocketnest/pocketnest-react-native`, keeps the
ones labeled `ready-for-testing`, and pairs web with React Native when both
pull requests share a `feature:` label.

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
card. A successful GitHub deployment for that branch supplies the preview link.

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
