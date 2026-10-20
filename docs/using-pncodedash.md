# Using PNCodeDash

PNCodeDash is the testing board at <https://pncodedash.vercel.app>. It shows which features are ready for testing, which branches hold the work, and where to try the preview.

The board reads open pull requests from two repositories:

- `pocketnest/pocketnest-web`
- `pocketnest/pocketnest-react-native`

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

## 2. Add the preview server

After you start a preview server for that feature, open the branch on the board and paste the URL. Save it. Everyone viewing the board sees the same link, and it can be changed or cleared later.

The preview URL is entered by hand. The board does not take it from a GitHub deployment.

## 3. Remove it when testing is done

Remove the `ready-for-testing` label, or close the pull request. The branch leaves the board.
