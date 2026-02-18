import { useState, useEffect, useCallback } from 'react';
import { generateCodeChallenge } from '../utils/pkce';
import { spotifyService } from '../services/spotify';
import type { SpotifyUser } from '../types/spotify';

const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
const REDIRECT_URI = import.meta.env.VITE_SPOTIFY_REDIRECT_URI || `${window.location.origin}/callback`;
const SCOPES = [
  'user-read-private',
  'user-read-email',
  'playlist-read-private',
  'playlist-read-collaborative',
  'playlist-modify-public',
  'playlist-modify-private',
].join(' ');

const TOKEN_KEY = 'spotify_access_token';
const REFRESH_TOKEN_KEY = 'spotify_refresh_token';
const EXPIRY_KEY = 'spotify_token_expiry';
const VERIFIER_KEY = 'spotify_code_verifier';

// Guard against StrictMode double-execution of the callback
let callbackInProgress = false;

export function useAuth() {
  const [user, setUser] = useState<SpotifyUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isTokenExpired = useCallback(() => {
    const expiry = localStorage.getItem(EXPIRY_KEY);
    if (!expiry) return true;
    return Date.now() > parseInt(expiry, 10);
  }, []);

  const clearAuth = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(EXPIRY_KEY);
    setUser(null);
  }, []);

  const refreshAccessToken = useCallback(async (): Promise<string | null> => {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!refreshToken) return null;

    try {
      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: CLIENT_ID,
        }),
      });

      if (!response.ok) {
        clearAuth();
        return null;
      }

      const data = await response.json();
      const expiresAt = Date.now() + data.expires_in * 1000;
      localStorage.setItem(TOKEN_KEY, data.access_token);
      localStorage.setItem(EXPIRY_KEY, expiresAt.toString());
      if (data.refresh_token) {
        localStorage.setItem(REFRESH_TOKEN_KEY, data.refresh_token);
      }
      spotifyService.setAccessToken(data.access_token);
      return data.access_token;
    } catch {
      clearAuth();
      return null;
    }
  }, [clearAuth]);

  const getValidToken = useCallback(async (): Promise<string | null> => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token && !isTokenExpired()) {
      return token;
    }
    return refreshAccessToken();
  }, [isTokenExpired, refreshAccessToken]);

  const login = useCallback(async () => {
    const { codeVerifier, codeChallenge } = await generateCodeChallenge();
    localStorage.setItem(VERIFIER_KEY, codeVerifier);

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: CLIENT_ID,
      scope: SCOPES,
      redirect_uri: REDIRECT_URI,
      code_challenge_method: 'S256',
      code_challenge: codeChallenge,
    });

    window.location.href = `https://accounts.spotify.com/authorize?${params}`;
  }, []);

  const handleCallback = useCallback(async (code: string) => {
    const codeVerifier = localStorage.getItem(VERIFIER_KEY);
    if (!codeVerifier) throw new Error('No code verifier found');

    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
        client_id: CLIENT_ID,
        code_verifier: codeVerifier,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error_description || 'Token exchange failed');
    }

    const data = await response.json();
    const expiresAt = Date.now() + data.expires_in * 1000;
    localStorage.setItem(TOKEN_KEY, data.access_token);
    localStorage.setItem(REFRESH_TOKEN_KEY, data.refresh_token);
    localStorage.setItem(EXPIRY_KEY, expiresAt.toString());
    localStorage.removeItem(VERIFIER_KEY);

    spotifyService.setAccessToken(data.access_token);
    const userProfile = await spotifyService.getCurrentUser();
    setUser(userProfile);
  }, []);

  const logout = useCallback(() => {
    clearAuth();
  }, [clearAuth]);

  // On mount: check for existing token or callback code
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      try {
        // Check if this is a callback
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const authError = params.get('error');

        if (authError) {
          setError(`Spotify auth error: ${authError}`);
          window.history.replaceState({}, '', '/');
          setIsLoading(false);
          return;
        }

        if (code) {
          // Clear URL immediately to prevent StrictMode double-execution
          window.history.replaceState({}, '', '/');

          if (callbackInProgress) {
            setIsLoading(false);
            return;
          }
          callbackInProgress = true;

          try {
            await handleCallback(code);
          } finally {
            callbackInProgress = false;
          }
          setIsLoading(false);
          return;
        }

        // Try to use existing token
        const token = await getValidToken();
        if (token) {
          spotifyService.setAccessToken(token);
          const userProfile = await spotifyService.getCurrentUser();
          setUser(userProfile);
        }
      } catch (err) {
        console.error('Auth init error:', err);
        clearAuth();
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, [handleCallback, getValidToken, clearAuth]);

  // Set up token refresh interval
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(async () => {
      if (isTokenExpired()) {
        const token = await refreshAccessToken();
        if (!token) clearAuth();
      }
    }, 60_000); // check every minute
    return () => clearInterval(interval);
  }, [user, isTokenExpired, refreshAccessToken, clearAuth]);

  return { user, isLoading, error, login, logout, getValidToken };
}
