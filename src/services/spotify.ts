import type {
  SpotifyUser,
  SpotifyPlaylist,
  PlaylistTrack,
  AudioFeatures,
} from '../types/spotify';

const API_BASE = 'https://api.spotify.com/v1';

class SpotifyService {
  private accessToken: string = '';

  setAccessToken(token: string) {
    this.accessToken = token;
  }

  private async fetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (response.status === 401) {
      throw new Error('UNAUTHORIZED');
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      const message = error?.error?.message || `API error: ${response.status}`;
      const detail = `[${response.status}] ${endpoint} — ${message}`;
      console.error('Spotify API error:', detail, error);
      throw new Error(detail);
    }

    if (response.status === 204) return {} as T;
    return response.json();
  }

  async getCurrentUser(): Promise<SpotifyUser> {
    return this.fetch<SpotifyUser>('/me');
  }

  async getPlaylists(limit = 50, offset = 0): Promise<{
    items: SpotifyPlaylist[];
    total: number;
    next: string | null;
  }> {
    return this.fetch(`/me/playlists?limit=${limit}&offset=${offset}`);
  }

  async getAllPlaylists(): Promise<SpotifyPlaylist[]> {
    const playlists: SpotifyPlaylist[] = [];
    let offset = 0;
    const limit = 50;
    let total = Infinity;

    while (offset < total) {
      const response = await this.getPlaylists(limit, offset);
      const validPlaylists = response.items.filter(
        (item): item is SpotifyPlaylist => item !== null && item !== undefined
      );
      playlists.push(...validPlaylists);
      total = response.total;
      offset += limit;
    }

    return playlists;
  }

  private async fetchFullUrl<T>(url: string): Promise<T> {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.status === 401) {
      throw new Error('UNAUTHORIZED');
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      const message = error?.error?.message || `API error: ${response.status}`;
      console.error('Spotify API error:', url, response.status, error);
      throw new Error(message);
    }

    return response.json();
  }

  async getPlaylist(playlistId: string): Promise<{
    name: string;
    tracks: { items: PlaylistTrack[]; total: number; next: string | null };
  }> {
    return this.fetch(`/playlists/${playlistId}`);
  }

  async getPlaylistTracks(
    playlistId: string,
    limit = 100,
    offset = 0
  ): Promise<{
    items: PlaylistTrack[];
    total: number;
    next: string | null;
  }> {
    return this.fetch(
      `/playlists/${playlistId}/tracks?limit=${limit}&offset=${offset}`
    );
  }

  async getAllPlaylistTracks(playlistId: string): Promise<PlaylistTrack[]> {
    const tracks: PlaylistTrack[] = [];

    try {
      // Primary approach: use /playlists/{id}/tracks
      let offset = 0;
      const limit = 100;
      let total = Infinity;

      while (offset < total) {
        const response = await this.getPlaylistTracks(playlistId, limit, offset);
        const validTracks = response.items.filter((item) => item.track !== null);
        tracks.push(...validTracks);
        total = response.total;
        offset += limit;
      }

      return tracks;
    } catch {
      console.log('Tracks endpoint failed, trying full playlist endpoint...');
    }

    // Fallback: fetch tracks from /playlists/{id}
    const playlist = await this.getPlaylist(playlistId);
    const firstPage = playlist.tracks;
    const validTracks = firstPage.items.filter((item) => item?.track !== null);
    tracks.push(...validTracks);

    // Follow pagination via full next URLs
    let nextUrl = firstPage.next;
    while (nextUrl) {
      const page = await this.fetchFullUrl<{
        items: PlaylistTrack[];
        next: string | null;
      }>(nextUrl);
      const valid = page.items.filter((item) => item?.track !== null);
      tracks.push(...valid);
      nextUrl = page.next;
    }

    return tracks;
  }

  async getAudioFeatures(trackIds: string[]): Promise<AudioFeatures[]> {
    const features: AudioFeatures[] = [];
    // API accepts max 100 IDs at a time
    for (let i = 0; i < trackIds.length; i += 100) {
      const batch = trackIds.slice(i, i + 100);
      const response = await this.fetch<{ audio_features: (AudioFeatures | null)[] }>(
        `/audio-features?ids=${batch.join(',')}`
      );
      features.push(
        ...response.audio_features.filter((f): f is AudioFeatures => f !== null)
      );
    }
    return features;
  }

  async removeTracksFromPlaylist(
    playlistId: string,
    trackUris: string[]
  ): Promise<void> {
    // API accepts max 100 tracks at a time
    for (let i = 0; i < trackUris.length; i += 100) {
      const batch = trackUris.slice(i, i + 100);
      await this.fetch(`/playlists/${playlistId}/tracks`, {
        method: 'DELETE',
        body: JSON.stringify({
          tracks: batch.map((uri) => ({ uri })),
        }),
      });
    }
  }

  async addTracksToPlaylist(
    playlistId: string,
    trackUris: string[]
  ): Promise<void> {
    for (let i = 0; i < trackUris.length; i += 100) {
      const batch = trackUris.slice(i, i + 100);
      await this.fetch(`/playlists/${playlistId}/tracks`, {
        method: 'POST',
        body: JSON.stringify({ uris: batch }),
      });
    }
  }

  async deletePlaylist(playlistId: string): Promise<void> {
    await this.fetch(`/playlists/${playlistId}/followers`, {
      method: 'DELETE',
    });
  }
}

export const spotifyService = new SpotifyService();
