# Using PNCodeDash

PNCodeDash is the testing board at <https://pncodedash.vercel.app>. Sign in with a verified `@pocketnest.com` Google account. Other email addresses cannot register or sign in. It shows which features are ready for testing, which branches hold the work, and which environment to test.

The board reads open pull requests from two repositories:

- `pocketnest/pocketnest-web`
- `pocketnest/pocketnest-react-native`

## What the navigation shows

- **Overview** counts branches that are ready for testing, how many have a testing environment, and which ones are missing a web match, a React Native match, or a testing URL.
- **Branches** lists those branches. The card title is the branch name, such as `feature/setup-question-history`.
- **Environments** shows the testing environment for each branch. Open a row to add or change the URL.

## 1. Mark the pull requests

When a feature is ready for testing, add two labels to the pull request in each repository:

- `ready-for-testing` puts the branch on the board.
- `feature:setup-question-history` pairs the web and React Native branches onto one card. Use the feature's own name after `feature:`.

The same `feature:` label must be on both pull requests. The card title is the branch name, such as `feature/setup-question-history`.

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

Add a ClickUp tag whose name matches the feature slug. For `feature:setup-question-history`, tag the task `setup-question-history`. The board lists every open task with that tag, including its status and assignees, on that branch.

## 3. Add the testing environment

Open the branch on the board and paste the URL people should use for testing. Save it. Anyone signed in sees the same link, including from another computer. The board stores the URL in Vercel Blob. It does not write the URL to GitHub, and it does not read it from a deployment.

## 4. Remove it when testing is done

Remove the `ready-for-testing` label, or close the pull request. The branch leaves the board.
