# Spotify Playlist Manager

A web app for managing Spotify playlists with advanced features for organization, cleanup, analysis, and creative automation. Built with React, TypeScript, and the Spotify Web API.

## Features

- **Playlist Dashboard** — View all your playlists at a glance
- **Old Song Detector** — Find and remove songs added a long time ago
- **Playlist Export** — Backup playlists to CSV with audio features
- **Multi-Playlist Manager** — View and edit multiple playlists side-by-side
- **Playlist Analyzer** — Visualize your music with charts and stats

## Tech Stack

- React + TypeScript + Vite
- Tailwind CSS (dark mode)
- Spotify Web API (PKCE auth flow)
- Recharts (visualizations)

## Getting Started

### Prerequisites

- Node.js 18+
- A Spotify Developer account with a registered app

### Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env` and add your Spotify Client ID
4. Start the dev server: `npm run dev`
5. Open `http://localhost:5173` in your browser

### Environment Variables

| Variable | Description |
|---|---|
| `VITE_SPOTIFY_CLIENT_ID` | Your Spotify app's Client ID |
| `VITE_SPOTIFY_REDIRECT_URI` | OAuth redirect URI (default: `http://localhost:5173/callback`) |

## Deployment

Deployed on Vercel. Set the same environment variables in your Vercel project settings, with the redirect URI pointing to your production URL.
