import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { spotifyService } from '../services/spotify';
import type { SpotifyUser, SpotifyPlaylist } from '../types/spotify';

interface DashboardProps {
  user: SpotifyUser;
  onLogout: () => void;
}

function Dashboard({ user, onLogout }: DashboardProps) {
  const navigate = useNavigate();
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function fetchPlaylists() {
      try {
        setLoading(true);
        setError(null);
        const data = await spotifyService.getAllPlaylists();
        if (!cancelled) {
          setPlaylists(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Failed to load playlists'
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchPlaylists();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredPlaylists = playlists.filter((playlist) =>
    playlist.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const userImage = user.images?.[0]?.url;

  return (
    <div className="min-h-screen bg-[#121212]">
      {/* Top bar */}
      <header className="sticky top-0 z-10 border-b border-[#282828] bg-[#121212]/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <h1 className="text-xl font-bold text-white sm:text-2xl">
            Spotify Playlist Manager
          </h1>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              {userImage ? (
                <img
                  src={userImage}
                  alt={user.display_name ?? 'User'}
                  className="h-8 w-8 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#535353]">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="h-5 w-5 text-[#b3b3b3]"
                  >
                    <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
                  </svg>
                </div>
              )}
              <span className="hidden text-sm font-medium text-white sm:inline">
                {user.display_name ?? 'User'}
              </span>
            </div>

            <button
              onClick={onLogout}
              className="rounded-full border border-[#535353] px-4 py-1.5 text-sm font-medium text-white transition-colors duration-200 hover:border-white hover:bg-white/10"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Navigation buttons */}
        <div className="mb-6 flex flex-wrap gap-3">
          <button
            onClick={() => navigate('/multi')}
            className="rounded-lg bg-[#282828] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#333333]"
          >
            Multi-Playlist Manager
          </button>
          <button
            onClick={() => navigate('/analyzer')}
            className="rounded-lg bg-[#282828] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#333333]"
          >
            Playlist Analyzer
          </button>
        </div>

        {/* Search input */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#b3b3b3]"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Filter playlists..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg bg-[#282828] py-2.5 pl-10 pr-4 text-sm text-white placeholder-[#b3b3b3] outline-none ring-1 ring-transparent transition-colors duration-200 focus:bg-[#333333] focus:ring-[#1DB954]"
            />
          </div>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <svg
              className="h-10 w-10 animate-spin text-[#1DB954]"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            <p className="mt-4 text-sm text-[#b3b3b3]">
              Loading your playlists...
            </p>
          </div>
        )}

        {/* Error state */}
        {!loading && error && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="rounded-lg bg-red-900/30 px-6 py-4 text-center">
              <p className="text-sm font-medium text-red-400">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-3 text-sm font-medium text-[#1DB954] transition-colors duration-200 hover:text-[#1ed760]"
              >
                Try again
              </button>
            </div>
          </div>
        )}

        {/* Playlist grid */}
        {!loading && !error && (
          <>
            {filteredPlaylists.length === 0 ? (
              <div className="py-20 text-center">
                <p className="text-[#b3b3b3]">
                  {searchQuery
                    ? 'No playlists match your search.'
                    : 'No playlists found.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredPlaylists.map((playlist) => (
                  <button
                    key={playlist.id}
                    onClick={() => navigate(`/playlist/${playlist.id}`)}
                    className="group flex flex-col rounded-lg bg-[#282828] p-4 text-left transition-colors duration-200 hover:bg-[#333333]"
                  >
                    {/* Cover image */}
                    {playlist.images?.[0]?.url ? (
                      <img
                        src={playlist.images[0].url}
                        alt={playlist.name}
                        className="mb-4 aspect-square w-full rounded object-cover shadow-lg"
                      />
                    ) : (
                      <div className="mb-4 flex aspect-square w-full items-center justify-center rounded bg-[#333333] shadow-lg group-hover:bg-[#3e3e3e]">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          className="h-12 w-12 text-[#535353]"
                        >
                          <path d="M12 3v10.55A4 4 0 1014 17V7h4V3h-6z" />
                        </svg>
                      </div>
                    )}

                    {/* Playlist info */}
                    <span className="truncate text-base font-semibold text-white">
                      {playlist.name}
                    </span>
                    <span className="mt-1 truncate text-sm text-[#b3b3b3]">
                      {playlist.tracks?.total ?? 0}{' '}
                      {(playlist.tracks?.total ?? 0) === 1 ? 'track' : 'tracks'}
                      {' \u00B7 '}
                      {playlist.owner?.display_name ?? 'Unknown'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default Dashboard;
