export interface SpotifyImage {
  url: string;
  height: number | null;
  width: number | null;
}

export interface SpotifyUser {
  id: string;
  display_name: string | null;
  images: SpotifyImage[];
  email?: string;
}

export interface SpotifyPlaylist {
  id: string;
  name: string;
  description: string | null;
  images: SpotifyImage[];
  tracks?: { total: number };
  items?: { total: number; href: string };
  owner: { id: string; display_name: string | null };
  public: boolean;
  snapshot_id: string;
}

export interface SpotifyArtist {
  id: string;
  name: string;
  genres?: string[];
}

export interface SpotifyAlbum {
  id: string;
  name: string;
  images: SpotifyImage[];
  release_date: string;
}

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: SpotifyArtist[];
  album: SpotifyAlbum;
  duration_ms: number;
  uri: string;
  popularity: number;
  preview_url: string | null;
}

export interface PlaylistTrack {
  added_at: string;
  track: SpotifyTrack;
}

export interface AudioFeatures {
  id: string;
  tempo: number;
  energy: number;
  danceability: number;
  valence: number;
  acousticness: number;
  instrumentalness: number;
  speechiness: number;
  liveness: number;
  loudness: number;
  key: number;
  mode: number;
  time_signature: number;
}

export interface PlaylistTrackWithFeatures extends PlaylistTrack {
  audioFeatures?: AudioFeatures;
}
