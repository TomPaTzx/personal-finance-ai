# Multi-Machine Auto-Sync Protocol (School 🏫 <-> Home 🏠)

<scope>
Applies to personal-finance-ai workspace when pair-programming across multiple machines.
</scope>

<rules>
1. **Startup Verification**: At the beginning of a session or when the user mentions continuing work on personal-finance-ai, inspect `git status` and check if remote commits exist. If behind, run `git pull --rebase origin main` before making any new edits.
2. **Session Completion / Handoff**: Whenever work or feature updates are completed, offer/proceed to stage, commit, and push changes to `origin/main` so the other machine always has the freshest codebase ready.
3. **No Overwrite**: Always preserve recent remote commits from other machines.
</rules>
