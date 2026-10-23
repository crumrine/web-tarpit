# Repository instructions

## Finish completed work on the shared default branch (Brian, 2026-10-23)

Brian's request to implement or fix something authorizes the routine Git workflow
needed to finish it: review the diff, run the required checks, integrate current
upstream, commit, push, and merge the PR without asking him to repeat permission.
Unless Brian explicitly requests a draft, review-only work, or an unmerged branch,
a pushed feature branch or open PR is not completion. Follow this repository's
branch conventions and required reviews/checks, then finish the path to its actual
shared default branch, including stacked PR dependencies.

Before every push, pull and integrate the current remote target branch in the
repository being pushed with `git pull --no-rebase --no-recurse-submodules
<remote> <branch>`. For a new branch, integrate its current remote base before the
first push. A session-start pull never substitutes for this pre-push pull.
Resolve ordinary conflicts and push races, verify the integrated result, and
retry normally. Preserve unrelated work; never force-push or bypass hooks/checks.
Publish dependent repositories and submodule commits before their consumers or
parent pointers.

Before reporting completion, verify that the remote default branch contains the
result and that any associated PR is merged. Update working checkouts when safe;
preserve dirty work and report any checkout that cannot be updated safely. If a
concrete blocker remains, preserve the work and record the exact blocked step
and recovery information instead of silently leaving a branch or PR behind.

This standing instruction supersedes older guidance that ends routine work at a
suggested commit, pushed branch, or reviewed PR, or asks for separate merge
permission. Required reviews, failing checks, production cutover gates, and
uncertain provider submissions retain their own evidence requirements. A source
merge alone does not establish deployment or production activation.
