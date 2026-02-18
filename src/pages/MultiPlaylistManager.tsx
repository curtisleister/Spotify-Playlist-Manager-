import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { spotifyService } from '../services/spotify';
import type { SpotifyPlaylist, PlaylistTrack } from '../types/spotify';

type SortField = 'name' | 'artist' | 'album';
type SortDirection = 'asc' | 'desc';

interface UniqueSong {
  trackId: string;
  name: string;
  artists: string;
  album: string;
  uri: string;
  playlistIds: Set<string>;
}

const MAX_SELECTED = 10;

function MultiPlaylistManager() {
  const navigate = useNavigate();

  const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [playlistTracks, setPlaylistTracks] = useState<
    Record<string, PlaylistTrack[]>
  >({});
  const [loadingPlaylists, setLoadingPlaylists] = useState(true);
  const [loadingTracks, setLoadingTracks] = useState<Set<string>>(new Set());
  const [togglingCells, setTogglingCells] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchPlaylists() {
      try {
        setLoadingPlaylists(true);
        setError(null);
        const result = await spotifyService.getAllPlaylists();
        if (!cancelled) {
          setPlaylists(result);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Failed to load playlists'
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingPlaylists(false);
        }
      }
    }

    fetchPlaylists();
    return () => {
      cancelled = true;
    };
  }, []);

  const fetchTracksForPlaylist = useCallback(
    async (playlistId: string) => {
      if (playlistTracks[playlistId]) return;

      setLoadingTracks((prev) => new Set(prev).add(playlistId));
      try {
        const tracks = await spotifyService.getAllPlaylistTracks(playlistId);
        setPlaylistTracks((prev) => ({ ...prev, [playlistId]: tracks }));
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : `Failed to load tracks for playlist`
        );
      } finally {
        setLoadingTracks((prev) => {
          const next = new Set(prev);
          next.delete(playlistId);
          return next;
        });
      }
    },
    [playlistTracks]
  );

  const handleTogglePlaylist = useCallback(
    (playlistId: string) => {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(playlistId)) {
          next.delete(playlistId);
        } else {
          if (next.size >= MAX_SELECTED) return prev;
          next.add(playlistId);
          fetchTracksForPlaylist(playlistId);
        }
        return next;
      });
    },
    [fetchTracksForPlaylist]
  );

  const selectedPlaylists = useMemo(
    () => playlists.filter((p) => selectedIds.has(p.id)),
    [playlists, selectedIds]
  );

  const uniqueSongs = useMemo(() => {
    const songMap = new Map<string, UniqueSong>();

    for (const playlistId of selectedIds) {
      const tracks = playlistTracks[playlistId];
      if (!tracks) continue;

      for (const item of tracks) {
        const track = item.track;
        if (!track || !track.id) continue;

        const existing = songMap.get(track.id);
        if (existing) {
          existing.playlistIds.add(playlistId);
        } else {
          songMap.set(track.id, {
            trackId: track.id,
            name: track.name,
            artists: track.artists.map((a) => a.name).join(', '),
            album: track.album.name,
            uri: track.uri,
            playlistIds: new Set([playlistId]),
          });
        }
      }
    }

    return Array.from(songMap.values());
  }, [selectedIds, playlistTracks]);

  const filteredAndSortedSongs = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    let filtered = uniqueSongs;
    if (query) {
      filtered = uniqueSongs.filter(
        (song) =>
          song.name.toLowerCase().includes(query) ||
          song.artists.toLowerCase().includes(query)
      );
    }

    return filtered.slice().sort((a, b) => {
      let valA: string;
      let valB: string;

      switch (sortField) {
        case 'name':
          valA = a.name.toLowerCase();
          valB = b.name.toLowerCase();
          break;
        case 'artist':
          valA = a.artists.toLowerCase();
          valB = b.artists.toLowerCase();
          break;
        case 'album':
          valA = a.album.toLowerCase();
          valB = b.album.toLowerCase();
          break;
      }

      const cmp = valA.localeCompare(valB);
      return sortDirection === 'asc' ? cmp : -cmp;
    });
  }, [uniqueSongs, searchQuery, sortField, sortDirection]);

  const handleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortField(field);
        setSortDirection('asc');
      }
    },
    [sortField]
  );

  const handleToggleTrackInPlaylist = useCallback(
    async (song: UniqueSong, playlistId: string) => {
      const cellKey = `${song.trackId}:${playlistId}`;
      if (togglingCells.has(cellKey)) return;

      setTogglingCells((prev) => new Set(prev).add(cellKey));

      const isInPlaylist = song.playlistIds.has(playlistId);

      try {
        if (isInPlaylist) {
          await spotifyService.removeTracksFromPlaylist(playlistId, [song.uri]);
          setPlaylistTracks((prev) => ({
            ...prev,
            [playlistId]: prev[playlistId].filter(
              (item) => item.track.id !== song.trackId
            ),
          }));
        } else {
          await spotifyService.addTracksToPlaylist(playlistId, [song.uri]);
          const newTrackItem: PlaylistTrack = {
            added_at: new Date().toISOString(),
            track: {
              id: song.trackId,
              name: song.name,
              artists: song.artists.split(', ').map((name) => ({
                id: '',
                name,
              })),
              album: { id: '', name: song.album, images: [], release_date: '' },
              duration_ms: 0,
              uri: song.uri,
              popularity: 0,
              preview_url: null,
            },
          };
          setPlaylistTracks((prev) => ({
            ...prev,
            [playlistId]: [...(prev[playlistId] || []), newTrackItem],
          }));
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to update track in playlist'
        );
      } finally {
        setTogglingCells((prev) => {
          const next = new Set(prev);
          next.delete(cellKey);
          return next;
        });
      }
    },
    [togglingCells]
  );

  function renderSortIndicator(field: SortField) {
    if (sortField !== field) return null;
    return (
      <span className="ml-1 text-[#1DB954]">
        {sortDirection === 'asc' ? '\u25B2' : '\u25BC'}
      </span>
    );
  }

  const isLoadingAnyTracks = loadingTracks.size > 0;

  return (
    <div className="flex min-h-screen bg-[#121212] text-white">
      {/* Sidebar */}
      <aside className="flex w-72 flex-shrink-0 flex-col bg-[#181818] border-r border-[#282828]">
        <div className="flex items-center justify-between p-4 border-b border-[#282828]">
          <h2 className="text-lg font-bold">Playlists</h2>
          <button
            onClick={() => navigate('/')}
            className="rounded px-3 py-1.5 text-sm font-medium text-gray-400 transition-colors hover:bg-[#282828] hover:text-white"
          >
            Back to Dashboard
          </button>
        </div>

        {loadingPlaylists ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#1DB954] border-t-transparent" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-2">
            <p className="px-2 pb-2 text-xs text-gray-500">
              Select up to {MAX_SELECTED} playlists ({selectedIds.size}{' '}
              selected)
            </p>
            {playlists.map((playlist) => {
              const isSelected = selectedIds.has(playlist.id);
              const isDisabled = !isSelected && selectedIds.size >= MAX_SELECTED;
              const isLoading = loadingTracks.has(playlist.id);

              return (
                <label
                  key={playlist.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 transition-colors ${
                    isSelected
                      ? 'bg-[#282828]'
                      : isDisabled
                        ? 'opacity-40 cursor-not-allowed'
                        : 'hover:bg-[#282828]/50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    disabled={isDisabled}
                    onChange={() => handleTogglePlaylist(playlist.id)}
                    className="h-4 w-4 rounded border-gray-600 bg-[#121212] text-[#1DB954] accent-[#1DB954]"
                  />
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    {playlist.images?.[0] ? (
                      <img
                        src={playlist.images[0].url}
                        alt=""
                        className="h-8 w-8 rounded object-cover"
                      />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded bg-[#333333] text-xs text-gray-500">
                        --
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {playlist.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {playlist.items?.total ?? playlist.tracks?.total ?? 0} tracks
                      </p>
                    </div>
                    {isLoading && (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#1DB954] border-t-transparent" />
                    )}
                  </div>
                </label>
              );
            })}
          </div>
        )}
      </aside>

      {/* Main content */}
      <main className="flex flex-1 flex-col min-w-0">
        {/* Toolbar */}
        <div className="flex items-center gap-4 border-b border-[#282828] px-6 py-4">
          <h1 className="text-xl font-bold whitespace-nowrap">
            Multi-Playlist Manager
          </h1>
          <div className="flex-1" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by song or artist..."
            className="w-72 rounded-md border border-[#333333] bg-[#282828] px-4 py-2 text-sm text-white placeholder-gray-500 outline-none transition-colors focus:border-[#1DB954]"
          />
        </div>

        {error && (
          <div className="mx-6 mt-4 rounded-md bg-red-900/30 border border-red-800 px-4 py-3 text-sm text-red-400">
            {error}
            <button
              onClick={() => setError(null)}
              className="ml-3 text-red-300 underline hover:text-red-200"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Table area */}
        {selectedIds.size === 0 ? (
          <div className="flex flex-1 items-center justify-center text-gray-500">
            <div className="text-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="mx-auto mb-4 h-16 w-16 text-gray-600"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z"
                />
              </svg>
              <p className="text-lg">Select playlists from the sidebar</p>
              <p className="mt-1 text-sm text-gray-600">
                Choose up to {MAX_SELECTED} playlists to compare and manage
                tracks
              </p>
            </div>
          </div>
        ) : isLoadingAnyTracks && uniqueSongs.length === 0 ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#1DB954] border-t-transparent" />
              <p className="text-gray-400">Loading tracks...</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="bg-[#181818] border-b border-[#333333]">
                  <th
                    onClick={() => handleSort('name')}
                    className="cursor-pointer whitespace-nowrap px-4 py-3 text-left font-semibold text-gray-300 transition-colors hover:text-white"
                  >
                    Song{renderSortIndicator('name')}
                  </th>
                  <th
                    onClick={() => handleSort('artist')}
                    className="cursor-pointer whitespace-nowrap px-4 py-3 text-left font-semibold text-gray-300 transition-colors hover:text-white"
                  >
                    Artist{renderSortIndicator('artist')}
                  </th>
                  <th
                    onClick={() => handleSort('album')}
                    className="cursor-pointer whitespace-nowrap px-4 py-3 text-left font-semibold text-gray-300 transition-colors hover:text-white"
                  >
                    Album{renderSortIndicator('album')}
                  </th>
                  {selectedPlaylists.map((playlist) => (
                    <th
                      key={playlist.id}
                      className="whitespace-nowrap px-4 py-3 text-center font-semibold text-gray-300"
                      title={playlist.name}
                    >
                      <span className="inline-block max-w-[120px] truncate">
                        {playlist.name}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedSongs.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3 + selectedPlaylists.length}
                      className="px-4 py-12 text-center text-gray-500"
                    >
                      {searchQuery
                        ? 'No songs match your search'
                        : 'No tracks found in the selected playlists'}
                    </td>
                  </tr>
                ) : (
                  filteredAndSortedSongs.map((song) => (
                    <tr
                      key={song.trackId}
                      className="border-b border-[#282828] bg-[#282828]/50 transition-colors hover:bg-[#333333]"
                    >
                      <td className="max-w-[240px] truncate px-4 py-2.5 font-medium text-white">
                        {song.name}
                      </td>
                      <td className="max-w-[200px] truncate px-4 py-2.5 text-gray-400">
                        {song.artists}
                      </td>
                      <td className="max-w-[200px] truncate px-4 py-2.5 text-gray-400">
                        {song.album}
                      </td>
                      {selectedPlaylists.map((playlist) => {
                        const isInPlaylist = song.playlistIds.has(playlist.id);
                        const cellKey = `${song.trackId}:${playlist.id}`;
                        const isToggling = togglingCells.has(cellKey);

                        return (
                          <td key={playlist.id} className="px-4 py-2.5 text-center">
                            <button
                              onClick={() =>
                                handleToggleTrackInPlaylist(song, playlist.id)
                              }
                              disabled={isToggling}
                              className={`inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                                isToggling
                                  ? 'opacity-50 cursor-wait'
                                  : 'hover:bg-[#404040] cursor-pointer'
                              }`}
                              title={
                                isInPlaylist
                                  ? `Remove from ${playlist.name}`
                                  : `Add to ${playlist.name}`
                              }
                            >
                              {isToggling ? (
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
                              ) : isInPlaylist ? (
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="0 0 20 20"
                                  fill="currentColor"
                                  className="h-5 w-5 text-[#1DB954]"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              ) : (
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="0 0 20 20"
                                  fill="currentColor"
                                  className="h-5 w-5 text-gray-600"
                                >
                                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                                </svg>
                              )}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {isLoadingAnyTracks && (
              <div className="flex items-center justify-center gap-2 py-4 text-sm text-gray-500">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#1DB954] border-t-transparent" />
                Loading more tracks...
              </div>
            )}
          </div>
        )}

        {/* Footer status bar */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-4 border-t border-[#282828] px-6 py-3 text-xs text-gray-500">
            <span>
              {filteredAndSortedSongs.length} of {uniqueSongs.length} unique
              songs
            </span>
            <span>
              {selectedIds.size} playlist{selectedIds.size !== 1 ? 's' : ''}{' '}
              selected
            </span>
          </div>
        )}
      </main>
    </div>
  );
}

export default MultiPlaylistManager;
