# Lessons Learned

> This file tracks patterns, mistakes, and insights discovered during development.
> Review at the start of each session.

## Spotify API — Redirect URI Rules (as of Nov 2025)

- `http://localhost:...` is **no longer allowed** by Spotify's developer dashboard
- Use `http://127.0.0.1:PORT/callback` instead (loopback IP exception)
- HTTPS is required for all non-loopback redirect URIs
- Always use `127.0.0.1` not `localhost` in `.env.example` and documentation
- Reference: https://developer.spotify.com/blog/2025-02-12-increasing-the-security-requirements-for-integrating-with-spotify

## React StrictMode + OAuth Callbacks

- StrictMode runs effects twice in development, which breaks single-use OAuth codes
- Fix: clear the callback code from the URL synchronously (before async work) and use a module-level guard flag
- Always test OAuth flows with StrictMode in mind

## Spotify API — Defensive Coding

- ALWAYS use optional chaining on Spotify API response fields (e.g., `playlist.tracks?.total`, `playlist.images?.[0]`, `playlist.owner?.display_name`)
- Spotify can return playlists with missing/undefined nested fields (deleted playlists, restricted access, development mode limitations)
- Apply this pattern in EVERY component that renders playlist or track data — not just Dashboard

## Spotify API — Fields Parameter

- Do NOT use the `fields` parameter on playlist tracks endpoint to request fields that don't exist on simplified objects
- `artists` in playlist track responses are **simplified artist objects** — they do NOT have `genres`
- Requesting invalid fields can cause 403 Forbidden (not 400), making the error misleading
- When in doubt, omit the `fields` parameter entirely and let the API return full objects
