---
name: git-commit
description: "Create git commits using the [mmdd] [version] [message] format."
---

# Git Commit with Versioned Messages

This skill creates git commits with a specific message format that includes date and version tracking.

## Commit Message Format

Every commit message must follow this exact format:
```
[mmdd] [version] [message]
```

**Example:** `0305 v1.0 Add user authentication feature`

## Version Number Rules

1. **Date prefix (mmdd)**: Use today's date in month-day format
   - March 5 → `0305`
   - December 25 → `1225`

2. **Version number**: Two-digit format `X.Y`
   - First digit (X): Major version
   - Second digit (Y): Minor version
   - Never use a third digit (no `1.0.1`)

3. **Daily reset**: Each new day starts from `v1.0`

4. **Version incrementing**:
   - **Minor update**: Increment second digit (`v1.0` → `v1.1`)
     - Bug fixes, small improvements, documentation updates
     - Minor feature additions
   - **Major update**: Increment first digit, reset second (`v1.2` → `v2.0`)
     - Breaking changes
     - Major new features
     - Significant refactoring

## How to Determine the Next Version

When creating a commit, follow these steps:

### Step 1: Get today's date
Determine today's date and format it as `mmdd`.

### Step 2: Check today's commits
Run `git log --oneline --since="midnight"` to see commits from today.

Look for commit messages starting with today's date prefix (e.g., `0305`).

### Step 3: Determine the version

- **If no commits today**: Start with `v1.0`
- **If there are commits today**: Look at the latest version from today
  - For a **minor update**: Increment the second digit
    - `v1.0` → `v1.1`
    - `v1.1` → `v1.2`
    - `v2.0` → `v2.1`
  - For a **major update**: Increment the first digit, reset second to 0
    - `v1.0` → `v2.0`
    - `v1.5` → `v2.0`
    - `v2.3` → `v3.0`

### Step 4: Ask the user (if unclear)
If you're unsure whether the update is major or minor, ask the user:
> "Is this a major update (breaking changes, significant new features) or a minor update (bug fixes, small improvements)?"

## Examples

### Example 1: First commit of the day
```
Date: March 5, 2026
Existing commits today: None
Update type: First commit
Result: 0305 v1.0 Initial project setup
```

### Example 2: Second minor commit of the day
```
Date: March 5, 2026
Existing commits today: "0305 v1.0 Initial project setup"
Update type: Minor (added a small feature)
Result: 0305 v1.1 Add README file
```

### Example 3: Major update during the day
```
Date: March 5, 2026
Existing commits today:
  - "0305 v1.0 Initial project setup"
  - "0305 v1.1 Add README file"
  - "0305 v1.2 Fix typo in README"
Update type: Major (complete restructure of codebase)
Result: 0305 v2.0 Refactor entire project structure
```

### Example 4: New day reset
```
Date: March 6, 2026 (new day)
Existing commits from yesterday: "0305 v2.0 Refactor entire project structure"
Update type: First commit of new day
Result: 0306 v1.0 Add new feature X
```

## Workflow

When the user asks to commit:

1. Check `git status` for staged/unstaged changes
2. Check `git log --oneline --since="midnight"` for today's commits
3. Determine the next version number based on today's last commit
4. If unclear whether major/minor, ask the user
5. Draft the commit message following the format
6. Show the user the proposed commit message
7. Stage the appropriate files
8. Create the commit with the formatted message

## Important Notes

- Always verify the date prefix matches today
- Never skip checking today's existing commits
- The version number is per-day, not global
- Keep the message part concise and descriptive
- Follow conventional commit style for the message part when appropriate (feat:, fix:, docs:, etc.)

