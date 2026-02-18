import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { spotifyService } from '../services/spotify';
import type { PlaylistTrack } from '../types/spotify';
import { DATE_FILTER_OPTIONS, isOlderThan, formatDate, timeAgo } from '../utils/dateFilters';
import { tracksToCSV, downloadCSV } from '../utils/export';

function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function PlaylistDetail() {
  const { playlistId } = useParams<{ playlistId: string }>();
  const navigate = useNavigate();

  const [tracks, setTracks] = useState<PlaylistTrack[]>([]);
  const [playlistName, setPlaylistName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTrackUris, setSelectedTrackUris] = useState<Set<string>>(new Set());
  const [activeFilter, setActiveFilter] = useState<number | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    if (!playlistId) return;

    async function fetchTracks() {
      setLoading(true);
      setError(null);
      try {
        const allTracks = await spotifyService.getAllPlaylistTracks(playlistId!);
        setTracks(allTracks);

        const playlistResponse = await spotifyService.getPlaylists(50, 0);
        const matched = playlistResponse.items.find((p) => p.id === playlistId);
        if (matched) {
          setPlaylistName(matched.name);
        } else {
          setPlaylistName(`Playlist ${playlistId}`);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load tracks');
      } finally {
        setLoading(false);
      }
    }

    fetchTracks();
  }, [playlistId]);

  const filteredTracks = useMemo(() => {
    if (activeFilter === null) return tracks;
    return tracks.filter((t) => isOlderThan(t.added_at, activeFilter));
  }, [tracks, activeFilter]);

  const selectedFilteredTracks = useMemo(() => {
    return filteredTracks.filter((t) => selectedTrackUris.has(t.track.uri));
  }, [filteredTracks, selectedTrackUris]);

  const allFilteredSelected = useMemo(() => {
    return filteredTracks.length > 0 && filteredTracks.every((t) => selectedTrackUris.has(t.track.uri));
  }, [filteredTracks, selectedTrackUris]);

  function handleToggleTrack(uri: string) {
    setSelectedTrackUris((prev) => {
      const next = new Set(prev);
      if (next.has(uri)) {
        next.delete(uri);
      } else {
        next.add(uri);
      }
      return next;
    });
  }

  function handleSelectAllFiltered() {
    if (allFilteredSelected) {
      setSelectedTrackUris((prev) => {
        const next = new Set(prev);
        for (const t of filteredTracks) {
          next.delete(t.track.uri);
        }
        return next;
      });
    } else {
      setSelectedTrackUris((prev) => {
        const next = new Set(prev);
        for (const t of filteredTracks) {
          next.add(t.track.uri);
        }
        return next;
      });
    }
  }

  function handleFilterChange(months: number | null) {
    setActiveFilter(months);
    setSelectedTrackUris(new Set());
  }

  async function handleRemoveSelected() {
    if (!playlistId || selectedTrackUris.size === 0) return;

    setRemoving(true);
    try {
      const urisToRemove = Array.from(selectedTrackUris);
      await spotifyService.removeTracksFromPlaylist(playlistId, urisToRemove);

      const refreshed = await spotifyService.getAllPlaylistTracks(playlistId);
      setTracks(refreshed);
      setSelectedTrackUris(new Set());
      setShowConfirmModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove tracks');
    } finally {
      setRemoving(false);
    }
  }

  function handleExportCSV() {
    const csv = tracksToCSV(filteredTracks);
    const name = playlistName || `playlist_${playlistId}`;
    downloadCSV(csv, name);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#121212]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-600 border-t-[#1DB954]" />
          <p className="text-lg text-gray-400">Loading tracks...</p>
        </div>
      </div>
    );
  }

  if (error) {
    const isRateLimited = error.includes('RATE_LIMITED');
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#121212]">
        <div className="flex flex-col items-center gap-4 text-center max-w-md px-4">
          {isRateLimited ? (
            <p className="text-lg text-yellow-400">
              Spotify is temporarily limiting requests. Wait about a minute, then try again.
            </p>
          ) : (
            <p className="text-lg text-red-500">{error}</p>
          )}
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/')}
              className="rounded-lg bg-[#282828] px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-[#333333]"
            >
              Back to Dashboard
            </button>
            {isRateLimited && (
              <button
                onClick={() => { setError(null); setLoading(true); window.location.reload(); }}
                className="rounded-lg bg-[#1DB954] px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1ed760]"
              >
                Try again
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const tracksSelectedFromFiltered = selectedFilteredTracks.length;
  const totalSelected = selectedTrackUris.size;

  return (
    <div className="min-h-screen bg-[#121212] px-4 py-6 text-white sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="rounded-lg bg-[#282828] px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-[#333333] hover:text-white"
            >
              &larr; Back to Dashboard
            </button>
            <h1 className="truncate text-2xl font-bold">{playlistName}</h1>
          </div>
          <button
            onClick={handleExportCSV}
            className="rounded-lg bg-[#1DB954] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1ed760]"
          >
            Export CSV
          </button>
        </div>

        {/* Date Filters */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="mr-2 text-sm font-medium text-gray-400">Filter by date added:</span>
          <button
            onClick={() => handleFilterChange(null)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              activeFilter === null
                ? 'bg-[#1DB954] text-white'
                : 'bg-[#282828] text-gray-300 hover:bg-[#333333]'
            }`}
          >
            All tracks
          </button>
          {DATE_FILTER_OPTIONS.map((option) => (
            <button
              key={option.months}
              onClick={() => handleFilterChange(option.months)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                activeFilter === option.months
                  ? 'bg-[#1DB954] text-white'
                  : 'bg-[#282828] text-gray-300 hover:bg-[#333333]'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {/* Track Counts & Actions */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4 text-sm text-gray-400">
            <span>
              {filteredTracks.length} of {tracks.length} tracks shown
            </span>
            <span>{totalSelected} selected</span>
          </div>
          {totalSelected > 0 && (
            <button
              onClick={() => setShowConfirmModal(true)}
              className="rounded-lg bg-red-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700"
            >
              Remove Selected ({totalSelected})
            </button>
          )}
        </div>

        {/* Track Table */}
        <div className="overflow-x-auto rounded-lg border border-[#333333]">
          <div className="max-h-[calc(100vh-320px)] overflow-y-auto">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="sticky top-0 z-10 bg-[#1a1a1a] text-xs uppercase tracking-wider text-gray-400">
                <tr>
                  <th className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={allFilteredSelected}
                      onChange={handleSelectAllFiltered}
                      className="h-4 w-4 cursor-pointer accent-[#1DB954]"
                      title="Select all filtered tracks"
                    />
                  </th>
                  <th className="px-4 py-3">Track Name</th>
                  <th className="px-4 py-3">Artist</th>
                  <th className="px-4 py-3">Album</th>
                  <th className="px-4 py-3">Duration</th>
                  <th className="px-4 py-3">Date Added</th>
                  <th className="px-4 py-3">Time Ago</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#333333]">
                {filteredTracks.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                      No tracks match the selected filter.
                    </td>
                  </tr>
                ) : (
                  filteredTracks.map((item, index) => {
                    const isSelected = selectedTrackUris.has(item.track.uri);
                    return (
                      <tr
                        key={`${item.track.uri}-${index}`}
                        onClick={() => handleToggleTrack(item.track.uri)}
                        className={`cursor-pointer bg-[#282828] transition-colors hover:bg-[#333333] ${
                          isSelected ? 'bg-[#1DB954]/10' : ''
                        }`}
                      >
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleTrack(item.track.uri)}
                            onClick={(e) => e.stopPropagation()}
                            className="h-4 w-4 cursor-pointer accent-[#1DB954]"
                          />
                        </td>
                        <td className="max-w-[250px] truncate px-4 py-3 font-medium text-white">
                          {item.track.name}
                        </td>
                        <td className="max-w-[200px] truncate px-4 py-3 text-gray-300">
                          {item.track.artists.map((a) => a.name).join(', ')}
                        </td>
                        <td className="max-w-[200px] truncate px-4 py-3 text-gray-400">
                          {item.track.album.name}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-gray-400">
                          {formatDuration(item.track.duration_ms)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-gray-400">
                          {formatDate(item.added_at)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-gray-500">
                          {timeAgo(item.added_at)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-xl bg-[#282828] p-6 shadow-2xl">
            <h2 className="mb-4 text-xl font-bold text-white">Confirm Removal</h2>
            <p className="mb-4 text-gray-300">
              You are about to remove <span className="font-semibold text-red-400">{totalSelected}</span>{' '}
              track{totalSelected !== 1 ? 's' : ''} from this playlist. This action cannot be undone.
            </p>
            <div className="mb-6 max-h-48 overflow-y-auto rounded-lg bg-[#1a1a1a] p-3">
              <ul className="space-y-1 text-sm text-gray-400">
                {tracks
                  .filter((t) => selectedTrackUris.has(t.track.uri))
                  .map((t, i) => (
                    <li key={`${t.track.uri}-confirm-${i}`} className="truncate">
                      <span className="text-white">{t.track.name}</span>
                      <span className="text-gray-500"> - {t.track.artists.map((a) => a.name).join(', ')}</span>
                    </li>
                  ))}
              </ul>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                disabled={removing}
                className="rounded-lg bg-[#333333] px-5 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-[#444444] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRemoveSelected}
                disabled={removing}
                className="rounded-lg bg-red-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
              >
                {removing ? 'Removing...' : 'Confirm Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PlaylistDetail;
