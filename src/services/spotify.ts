import type {
  SpotifyUser,
  SpotifyPlaylist,
  PlaylistTrack,
  AudioFeatures,
} from '../types/spotify';

const API_BASE = 'https://api.spotify.com/v1';

class SpotifyService {
  private accessToken: string = '';
  private lastRequestTime = 0;
  private readonly minRequestInterval = 100; // ms between requests

  setAccessToken(token: string) {
    this.accessToken = token;
  }

  private async throttle() {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    if (elapsed < this.minRequestInterval) {
      await new Promise((resolve) => setTimeout(resolve, this.minRequestInterval - elapsed));
    }
    this.lastRequestTime = Date.now();
  }

  private async fetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const maxRetries = 5;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      await this.throttle();

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

      if (response.status === 429 && attempt < maxRetries) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '3', 10);
        const waitMs = Math.max(retryAfter * 1000, 2000 * (attempt + 1));
        console.log(`Rate limited on ${endpoint}, waiting ${waitMs / 1000}s (attempt ${attempt + 1}/${maxRetries})...`);
        await new Promise((resolve) => setTimeout(resolve, waitMs));
        continue;
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

    throw new Error(`Rate limited on ${endpoint} after ${maxRetries} retries`);
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

  async getPlaylistItems(
    playlistId: string,
    limit = 100,
    offset = 0
  ): Promise<{
    items: Record<string, unknown>[];
    total: number;
    next: string | null;
  }> {
    return this.fetch(
      `/playlists/${playlistId}/items?limit=${limit}&offset=${offset}`
    );
  }

  async getAllPlaylistTracks(playlistId: string): Promise<PlaylistTrack[]> {
    const tracks: PlaylistTrack[] = [];
    let offset = 0;
    const limit = 100;
    let total = Infinity;

    while (offset < total) {
      const response = await this.getPlaylistItems(playlistId, limit, offset);
      // Spotify renamed "track" to "item" in the response — normalize it
      const normalized: PlaylistTrack[] = response.items
        .map((entry: Record<string, unknown>) => {
          const trackData = entry.track ?? entry.item;
          if (!trackData || typeof trackData !== 'object') return null;
          const td = trackData as Record<string, unknown>;
          if (!td.uri || td.type !== 'track') return null;
          return { added_at: entry.added_at as string, track: td } as unknown as PlaylistTrack;
        })
        .filter((item): item is PlaylistTrack => item !== null);
      tracks.push(...normalized);
      total = response.total;
      offset += limit;
    }

    return tracks;
  }

  async getAudioFeatures(trackIds: string[]): Promise<AudioFeatures[]> {
    const features: AudioFeatures[] = [];
    // API accepts max 100 IDs at a time
    for (let i = 0; i < trackIds.length; i += 100) {
      if (i > 0) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
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
      await this.fetch(`/playlists/${playlistId}/items`, {
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
      await this.fetch(`/playlists/${playlistId}/items`, {
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
