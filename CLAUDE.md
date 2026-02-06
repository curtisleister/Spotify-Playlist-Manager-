# CLAUDE.md - Spotify Playlist Manager

## Project Overview

A Spotify Playlist Manager application for managing a specific work playlist. This project is being developed with Claude Code assistance.

**Repository**: `curtisleister/Spotify-Playlist-Manager-`
**Status**: Early-stage / greenfield project

## Repository Structure

```
Spotify-Playlist-Manager-/
├── CLAUDE.md          # AI assistant guidelines (this file)
└── README.md          # Project description
```

> This project is in its initial phase. Structure will be updated as code is added.

## Technology Stack

Not yet established. When choosing a stack, consider:
- **Spotify Web API** integration is a core requirement (OAuth 2.0 / PKCE auth flow)
- The app manages a specific work playlist (CRUD operations on playlist tracks)

## Development Setup

### Prerequisites
- Git
- A Spotify Developer account and registered application (for API credentials)

### Getting Started
1. Clone the repository
2. (Further setup steps to be added as the project develops)

## Build & Run Commands

> No build system configured yet. This section should be updated when a framework/toolchain is chosen.

<!-- Example (update when stack is chosen):
- `npm install` - Install dependencies
- `npm run dev` - Start development server
- `npm run build` - Production build
- `npm test` - Run tests
- `npm run lint` - Run linter
-->

## Testing

> No test framework configured yet. Update this section when tests are added.

## Conventions for AI Assistants

### General Rules
- Read existing code before making changes; never modify files you haven't read
- Keep changes minimal and focused on the requested task
- Do not over-engineer or add speculative features
- Prefer editing existing files over creating new ones
- Do not add comments, docstrings, or type annotations to code you didn't change

### Git Workflow
- Develop on the assigned feature branch (never push directly to `main`)
- Write clear, concise commit messages that describe *why*, not just *what*
- Stage specific files rather than using `git add -A`
- Never commit `.env` files, API keys, or secrets

### Code Style
- Follow the linter/formatter configuration once established
- Use consistent naming conventions matching the chosen language/framework
- Keep functions small and focused on a single responsibility

### Spotify API
- Never hardcode Spotify API credentials in source files
- Use environment variables for client ID, client secret, and redirect URIs
- Handle API rate limiting and token refresh gracefully
- Refer to the [Spotify Web API docs](https://developer.spotify.com/documentation/web-api) for endpoint details

### Security
- Store all secrets (API keys, tokens) in environment variables or a secrets manager
- Add `.env` to `.gitignore` before any secrets are configured
- Use PKCE flow for client-side auth; Authorization Code flow for server-side
- Validate and sanitize all user input

## Workflow Orchestration

### 1. Plan Mode Default
- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately - don't keep pushing
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

### 2. Subagent Strategy to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One task per subagent for focused execution

### 3. Self-Improvement Loop
- After ANY correction from the user: update `tasks/lessons.md` with the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review lessons at session start for relevant project

### 4. Verification Before Done
- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness

### 5. Demand Elegance (Balanced)
- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes - don't over-engineer
- Challenge your own work before presenting it

### 6. Autonomous Bug Fixing
- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests -> then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how

## Task Management
1. **Plan First**: Write plan to `tasks/todo.md` with checkable items
2. **Verify Plan**: Check in before starting implementation
3. **Track Progress**: Mark items complete as you go
4. **Explain Changes**: High-level summary at each step
5. **Document Results**: Add review to `tasks/todo.md`
6. **Capture Lessons**: Update `tasks/lessons.md` after corrections

## Core Principles
- **Simplicity First**: Make every change as simple as possible. Impact minimal code.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact**: Changes should only touch what's necessary. Avoid introducing bugs.

## Architecture Notes

> To be documented as the application architecture takes shape. Key areas to document:
> - Authentication flow
> - API integration layer
> - State management approach
> - Data models (playlists, tracks, user)

## Known Issues / TODOs

- Project scaffolding not yet created
- Technology stack not yet decided
- No CI/CD pipeline configured
- No `.gitignore` file present
