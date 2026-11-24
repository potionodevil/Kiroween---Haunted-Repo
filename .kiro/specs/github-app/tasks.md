# Tasks: GitHub App login and auto-fix pull requests

- [x] OAuth routes with state cookie and sealed session
- [x] Ownership check strips ghost values for non-owners
- [x] Patch engine with marker comments (+ property test: apply(unifiedPatch(a, b)) = b)
- [x] /api/fix-pr: branch, commits, pull request, install link
- [x] Route test with a fake GitHub (marker, no secrets, no default branch, 403 cases)
- [x] Origin check and rate limits on POST routes
- [ ] PR guardian: webhook on pull_request, check run with new creatures (needs GITHUB_APP_PRIVATE_KEY)
- [ ] Token refresh when the 8-hour user token expires
