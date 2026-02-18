import type {
  SpotifyUser,
  SpotifyPlaylist,
  PlaylistTrack,
  AudioFeatures,
} from '../types/spotify';

const API_BASE = 'https://api.spotify.com/v1';

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class SpotifyService {
  private accessToken: string = '';
  private lastRequestTime = 0;
  private readonly minRequestInterval = 100; // ms between requests
  private playlistsCache: CacheEntry<SpotifyPlaylist[]> | null = null;
  private tracksCache = new Map<string, CacheEntry<PlaylistTrack[]>>();
  private audioFeaturesCache = new Map<string, CacheEntry<AudioFeatures[]>>();

  setAccessToken(token: string) {
    this.accessToken = token;
    // Clear caches when token changes (new login)
    this.playlistsCache = null;
    this.tracksCache.clear();
    this.audioFeaturesCache.clear();
  }

  clearCache() {
    this.playlistsCache = null;
    this.tracksCache.clear();
    this.audioFeaturesCache.clear();
  }

  private isCacheValid<T>(entry: CacheEntry<T> | null | undefined): entry is CacheEntry<T> {
    return entry != null && (Date.now() - entry.timestamp) < CACHE_TTL;
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
    if (this.isCacheValid(this.playlistsCache)) {
      return this.playlistsCache.data;
    }

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

    this.playlistsCache = { data: playlists, timestamp: Date.now() };
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
    const cached = this.tracksCache.get(playlistId);
    if (this.isCacheValid(cached)) {
      return cached.data;
    }

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

    this.tracksCache.set(playlistId, { data: tracks, timestamp: Date.now() });
    return tracks;
  }

  async getAudioFeatures(trackIds: string[]): Promise<AudioFeatures[]> {
    const cacheKey = trackIds.sort().join(',');
    const cached = this.audioFeaturesCache.get(cacheKey);
    if (this.isCacheValid(cached)) {
      return cached.data;
    }

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

    this.audioFeaturesCache.set(cacheKey, { data: features, timestamp: Date.now() });
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
    this.tracksCache.delete(playlistId);
    this.playlistsCache = null;
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
    this.tracksCache.delete(playlistId);
    this.playlistsCache = null;
  }

  async deletePlaylist(playlistId: string): Promise<void> {
    await this.fetch(`/playlists/${playlistId}/followers`, {
      method: 'DELETE',
    });
  }
}

export const spotifyService = new SpotifyService();
