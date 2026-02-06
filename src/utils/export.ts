import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import type { PlaylistTrackWithFeatures, SpotifyPlaylist } from '../types/spotify';

function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function tracksToCSV(
  tracks: PlaylistTrackWithFeatures[],
  includeAudioFeatures = false
): string {
  const headers = [
    'Track Name',
    'Artist(s)',
    'Album',
    'Duration',
    'Date Added',
    'Spotify URI',
    'Popularity',
    'Album Release Date',
  ];

  if (includeAudioFeatures) {
    headers.push('BPM', 'Energy', 'Danceability', 'Valence', 'Acousticness', 'Instrumentalness');
  }

  const rows = tracks.map((item) => {
    const row = [
      escapeCSV(item.track.name),
      escapeCSV(item.track.artists.map((a) => a.name).join('; ')),
      escapeCSV(item.track.album.name),
      formatDuration(item.track.duration_ms),
      item.added_at.split('T')[0],
      item.track.uri,
      item.track.popularity.toString(),
      item.track.album.release_date,
    ];

    if (includeAudioFeatures && item.audioFeatures) {
      row.push(
        Math.round(item.audioFeatures.tempo).toString(),
        item.audioFeatures.energy.toFixed(2),
        item.audioFeatures.danceability.toFixed(2),
        item.audioFeatures.valence.toFixed(2),
        item.audioFeatures.acousticness.toFixed(2),
        item.audioFeatures.instrumentalness.toFixed(2)
      );
    } else if (includeAudioFeatures) {
      row.push('', '', '', '', '', '');
    }

    return row.join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

export function downloadCSV(
  csv: string,
  playlistName: string
): void {
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `${playlistName.replace(/[^a-z0-9]/gi, '_')}_${timestamp}.csv`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  saveAs(blob, filename);
}

export async function downloadAllPlaylistsAsZip(
  playlists: { playlist: SpotifyPlaylist; tracks: PlaylistTrackWithFeatures[] }[],
  includeAudioFeatures = false
): Promise<void> {
  const zip = new JSZip();
  const timestamp = new Date().toISOString().split('T')[0];

  for (const { playlist, tracks } of playlists) {
    const csv = tracksToCSV(tracks, includeAudioFeatures);
    const safeName = playlist.name.replace(/[^a-z0-9]/gi, '_');
    zip.file(`${safeName}.csv`, csv);
  }

  const content = await zip.generateAsync({ type: 'blob' });
  saveAs(content, `spotify_playlists_backup_${timestamp}.zip`);
}
