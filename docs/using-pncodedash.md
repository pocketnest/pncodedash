# Using PNCodeDash

PNCodeDash is the testing board at <https://pncodedash.vercel.app>. Sign in with a verified `@pocketnest.com` Google account. Other email addresses cannot register or sign in. It shows which features are ready for testing, which branches hold the work, and which environment to test.

The board reads open pull requests from two repositories:

- `pocketnest/pocketnest-web`
- `pocketnest/pocketnest-react-native`

## What the navigation shows

- **Overview** counts branches that are ready for testing, how many have a testing environment, and which ones are missing a web match, a React Native match, or a testing URL.
- **Branches** lists those branches. A card shows the GitHub Project name when the pull requests are on a project, plus the branch names.
- **Environments** shows the testing environment for each branch. Open a row to add or change the URL.

## 1. Mark the pull requests

A branch appears on the board in either of these cases:

- The pull request has the `ready-for-testing` label.
- The pull request is on a GitHub Project whose status is Ready to test.

Add both the web and React Native pull requests to the same GitHub Project. The board groups them onto one card using that project name. A shared `feature:` label still groups them when they are not on a project.

The card shows the project name, its status, and the branch names.

```bash
gh label create "ready-for-testing" --repo pocketnest/pocketnest-web --description "Include this branch on the PNCodeDash testing board"
gh label create "feature:setup-question-history" --repo pocketnest/pocketnest-web --description "Pairs web and React Native work for Setup Question History"

gh label create "ready-for-testing" --repo pocketnest/pocketnest-react-native --description "Include this branch on the PNCodeDash testing board"
gh label create "feature:setup-question-history" --repo pocketnest/pocketnest-react-native --description "Pairs web and React Native work for Setup Question History"

gh pr edit WEB_PR_NUMBER --repo pocketnest/pocketnest-web --add-label "ready-for-testing,feature:setup-question-history"
gh pr edit NATIVE_PR_NUMBER --repo pocketnest/pocketnest-react-native --add-label "ready-for-testing,feature:setup-question-history"
```

Replace the pull request numbers and the feature name with the ones for your work. Create each label once per repository. After that, only the `gh pr edit` commands are needed.

## 2. Tag the ClickUp ticket

Add a ClickUp tag whose name matches the feature slug. For `feature:setup-question-history`, tag the task `setup-question-history`. When the pull requests are grouped by a GitHub Project and do not share a `feature:` label, tag the task with the project name in lowercase and with spaces changed to hyphens. The board lists every open task with that tag, including its status and assignees, on that branch.

## 3. Add the testing environment

The testing URL is filled from the latest successful deployment on the backend branch in `pocketnest-web`. The board reads that URL from GitHub Deployments. Open the branch to replace it. A saved URL is kept for anyone signed in, including from another computer, and is stored in Vercel Blob. The board does not write the URL to GitHub.

## 4. Remove it when testing is done

Close the pull request, or clear both signals that put it on the board: the `ready-for-testing` label and a Ready to test project status. The branch leaves once neither one remains.
