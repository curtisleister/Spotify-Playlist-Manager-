# Spotify Playlist Manager - Build Plan

## Phase 0: Project Setup
- [ ] Scaffold React + TypeScript + Vite project
- [ ] Install dependencies (Tailwind CSS, React Router, Recharts)
- [ ] Configure dark mode theme and Tailwind
- [ ] Set up folder structure (components, pages, services, utils, hooks)
- [ ] Create .env.example and .gitignore
- [ ] Create Spotify API service layer (PKCE auth helpers, API wrappers)

## Phase 1.1: Authentication & Playlist Dashboard
- [ ] Build Spotify PKCE OAuth login flow
- [ ] Create login page with "Connect to Spotify" button
- [ ] Handle auth callback, store tokens, auto-refresh
- [ ] Build playlist dashboard showing all playlists (name, track count, image)
- [ ] Add loading states and error handling

## Phase 1.2: Old Song Detector & Remover
- [ ] Build playlist detail view showing all tracks with "date added"
- [ ] Add date filter controls (e.g., "added more than 1 year ago")
- [ ] Add select/deselect checkboxes for tracks
- [ ] Build batch remove flow with confirmation dialog
- [ ] Support scanning across multiple playlists

## Phase 1.3: Playlist Backup & Export
- [ ] Export single playlist to CSV (track, artist, album, duration, date added, URI)
- [ ] Export all playlists as ZIP
- [ ] Include optional audio features in export (BPM, energy, danceability)
- [ ] Add timestamp to export filenames

## Phase 2.1: Multi-Playlist Manager View
- [ ] Build side-by-side grid view for multiple playlists
- [ ] Show which playlists contain each song (checkmark columns)
- [ ] Add/remove songs from playlists via the grid
- [ ] Sort and filter by song attributes
- [ ] Search across selected playlists

## Phase 2.2: Playlist Analyzer & Visualizer
- [ ] Fetch audio features for playlist tracks
- [ ] Display stats: avg BPM, energy, danceability, valence, top artists, decades
- [ ] Build charts: Energy vs Valence scatter, BPM bar chart, genre pie chart
- [ ] Compare 2+ playlists side-by-side
- [ ] Export analysis as image

## Deployment
- [ ] Deploy to Vercel
- [ ] Configure OAuth redirect URI for production URL
- [ ] Test full flow end-to-end on deployed site

## User Setup (instructions to provide)
- [ ] Walk user through creating Spotify Developer account
- [ ] Walk user through registering app and getting Client ID
- [ ] Explain how to set redirect URIs in Spotify Dashboard
