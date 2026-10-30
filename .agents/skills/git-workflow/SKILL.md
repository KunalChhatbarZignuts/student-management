---
name: git-workflow
description: >-
  Use this skill when staging, committing, branching, checking status, or managing
  Git version control workflows in this project.
---

# Git Version Control Workflow Guide

This skill standardizes Git operations, branching, and safe version control practices for the `student-management` project.

## Core Safety Rules

1. **Never Commit Secrets**: Never stage or commit `.env`, private keys, database credentials, or secret tokens. Always ensure `.gitignore` covers `.env`, `__pycache__`, and `venv/`.
2. **No Destructive Commands**: Never run destructive Git commands without explicit user instruction:
   - Do NOT run `git push --force` or `git push -f`
   - Do NOT run `git reset --hard` unless specifically asked
   - Do NOT run `git clean -fd` blindly
3. **Commit Approval**: Keep commits small and focused. Always suggest a clear commit message and wait for user instruction before creating commits or pushing to remote.

## Daily Workflow

### 1. Checking Status and Diffs
Before staging any changes, always review modified and untracked files:
```bash
# Check working tree status
git status

# Review line-by-line diffs of modified tracked files
git diff

# Review staged changes
git diff --staged
```

### 2. Branching Strategy
- Main development branches: `main` or designated feature branches (e.g., `auth-module`).
- Create dedicated feature or fix branches for non-trivial changes:
  ```bash
  # Create and switch to a new feature branch
  git checkout -b feat/student-skills
  # Or with modern git switch
  git switch -c feat/student-skills
  ```

### 3. Staging Specific Files
Always stage explicit files or directories rather than a blanket `git add .`:
```bash
# Good: staging specific files
git add models/student.py schemas/student.py routers/student.py

# Avoid: accidental staging of untracked temporary files or secrets
```

### 4. Conventional Commit Messages
Follow conventional commits with clear, concise descriptions in imperative mood:
- `feat: add student CRUD endpoints`
- `fix: resolve database connection timeout in healthcheck`
- `docs: update API documentation in README`
- `refactor: extract password hashing helper into security module`
- `chore: add project agent skills for git and fastapi`

### 5. Stashing Uncommitted Work
When switching branches or pulling upstream updates with uncommitted work:
```bash
git stash save "WIP: work in progress description"
git stash pop
```
