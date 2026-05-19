import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  initiateAuth,
  exchangeCodeForToken,
  refreshAccessToken,
  getStoredToken,
  isTokenExpired,
  disconnectSpotify,
} from '../utils/spotifyAuth';

const SpotifyContext = createContext(null);

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

export function SpotifyProvider({ children }) {
  const [deviceId, setDeviceId] = useState(null);
  const [player, setPlayer] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState(null);
  const [nowPlaying, setNowPlaying] = useState(null);

  const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
  const cleanupRef = useRef(null);
  const snippetMonitorRef = useRef(null);
  const playerRef = useRef(null);
  const deviceIdRef = useRef(null);

  const clearSnippetMonitor = () => {
    if (snippetMonitorRef.current) {
      clearInterval(snippetMonitorRef.current);
      snippetMonitorRef.current = null;
    }
  };

  const getToken = useCallback(async () => {
    if (!clientId) return null;
    if (!isTokenExpired()) return getStoredToken();
    return refreshAccessToken(clientId);
  }, [clientId]);

  const [tokenReady, setTokenReady] = useState(!!getStoredToken());

  useEffect(() => {
    if (!clientId) return;

    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (code) {
      window.history.replaceState({}, '', window.location.pathname || '/');
      exchangeCodeForToken(clientId, code)
        .then(() => setTokenReady(true))
        .catch((err) => setError(err.message));
      return;
    }
    setTokenReady(!!getStoredToken());
  }, [clientId]);

  useEffect(() => {
    if (!clientId || !tokenReady || !getStoredToken()) return;

    const initPlayer = () => {
      if (!window.Spotify?.Player) return false;

      const spotifyPlayer = new window.Spotify.Player({
        name: 'Music Snipper',
        getOAuthToken: (cb) => {
          getToken().then((token) => {
            if (token) cb(token);
          });
        },
        volume: 0.8,
      });

      spotifyPlayer.addListener('ready', ({ device_id }) => {
        deviceIdRef.current = device_id;
        setDeviceId(device_id);
        setIsReady(true);
        setError(null);
      });

      spotifyPlayer.addListener('not_ready', () => {
        deviceIdRef.current = null;
        setDeviceId(null);
        setIsReady(false);
        setNowPlaying(null);
      });

      spotifyPlayer.addListener('player_state_changed', (state) => {
        if (!state?.track_window?.current_track) {
          setNowPlaying(null);
          return;
        }
        const track = state.track_window.current_track;
        setNowPlaying({
          name: track.name,
          artist: track.artists.map((a) => a.name).join(', '),
          paused: state.paused,
          position: state.position,
        });
      });

      spotifyPlayer.addListener('initialization_error', ({ message }) => {
        setError(message);
      });

      spotifyPlayer.addListener('authentication_error', ({ message }) => {
        setError(`${message} Try disconnecting and connecting again.`);
      });

      spotifyPlayer.addListener('account_error', ({ message }) => {
        setError(message);
      });

      spotifyPlayer.connect();
      playerRef.current = spotifyPlayer;
      setPlayer(spotifyPlayer);

      return () => {
        spotifyPlayer.disconnect();
        playerRef.current = null;
        deviceIdRef.current = null;
      };
    };

    if (window.Spotify?.Player) {
      cleanupRef.current = initPlayer();
    } else {
      window.onSpotifyWebPlaybackSDKReady = () => {
        cleanupRef.current = initPlayer();
      };
    }

    return () => {
      window.onSpotifyWebPlaybackSDKReady = () => {};
      clearSnippetMonitor();
      if (typeof cleanupRef.current === 'function') cleanupRef.current();
    };
  }, [clientId, tokenReady, getToken]);

  const connect = useCallback(() => {
    if (!clientId) {
      setError('Spotify Client ID not configured. Add VITE_SPOTIFY_CLIENT_ID to .env');
      return;
    }
    setError(null);
    initiateAuth(clientId);
  }, [clientId]);

  const stopSnippet = useCallback(() => {
    clearSnippetMonitor();
    const p = playerRef.current;
    if (p) {
      try {
        p.pause();
      } catch (_) {}
    }
  }, []);

  const disconnect = useCallback(() => {
    stopSnippet();
    const p = playerRef.current;
    if (p) p.disconnect();
    playerRef.current = null;
    deviceIdRef.current = null;
    setPlayer(null);
    setDeviceId(null);
    setIsReady(false);
    setNowPlaying(null);
    disconnectSpotify();
    setError(null);
  }, [stopSnippet]);

  const playTrack = useCallback(
    async (trackUri, startMs, endMs) => {
      const waitUntilPlaying = async (p, maxMs) => {
        const deadline = Date.now() + maxMs;
        while (Date.now() < deadline) {
          const state = await p.getCurrentState();
          if (state && !state.paused) return true;
          await delay(200);
        }
        return false;
      };

      clearSnippetMonitor();

      const start = Math.max(0, Number(startMs) || 0);
      const end = endMs != null ? Number(endMs) : null;

      const p = playerRef.current;
      const activeDeviceId = deviceIdRef.current;

      const token = await getToken();
      if (!token || !activeDeviceId || !p) {
        setError('Not ready. Disconnect Spotify, connect again, then retry.');
        return { ok: false, error: 'Not ready' };
      }

      if (p.activateElement) {
        try {
          await p.activateElement();
        } catch (_) {}
      }
      setError(null);

      const authHeaders = { Authorization: `Bearer ${token}` };
      const jsonHeaders = { ...authHeaders, 'Content-Type': 'application/json' };

      const transferRes = await fetch('https://api.spotify.com/v1/me/player', {
        method: 'PUT',
        headers: jsonHeaders,
        body: JSON.stringify({ device_ids: [activeDeviceId], play: false }),
      });

      if (!transferRes.ok && transferRes.status !== 404) {
        const errBody = await transferRes.json().catch(() => ({}));
        const msg = errBody?.error?.message || `Transfer failed: ${transferRes.status}`;
        if (transferRes.status === 403) {
          setError('Spotify Premium required for playback.');
        } else {
          setError(msg);
        }
        return { ok: false, error: msg };
      }

      await delay(300);

      const playRes = await fetch(
        `https://api.spotify.com/v1/me/player/play?device_id=${activeDeviceId}`,
        {
          method: 'PUT',
          headers: jsonHeaders,
          body: JSON.stringify({
            uris: [trackUri],
            position_ms: start,
          }),
        }
      );

      if (!playRes.ok) {
        const errBody = await playRes.json().catch(() => ({}));
        const msg = errBody?.error?.message || `Play failed: ${playRes.status}`;
        if (playRes.status === 404) {
          setError(
            'Music Snipper device not found. Disconnect Spotify, connect again, then use Play snippet.'
          );
        } else if (playRes.status === 403) {
          setError('Spotify Premium required. If you recently connected, disconnect and connect again.');
        } else {
          setError(msg);
        }
        return { ok: false, error: msg };
      }

      if (start > 0) {
        await delay(500);
        await fetch(
          `https://api.spotify.com/v1/me/player/seek?position_ms=${start}&device_id=${activeDeviceId}`,
          { method: 'PUT', headers: authHeaders }
        );
        try {
          await p.seek(start);
        } catch (_) {}
      }

      const started = await waitUntilPlaying(p, 8000);
      if (!started) {
        setError(
          'Playback did not start. Disconnect Spotify and connect again (Premium required, grants streaming access).'
        );
        return { ok: false, error: 'Playback did not start' };
      }

      if (end == null || end <= start) {
        return { ok: true };
      }

      const timeoutAt = Date.now() + (end - start) + 4000;

      return new Promise((resolve) => {
        const finish = (result) => {
          clearSnippetMonitor();
          resolve(result);
        };

        snippetMonitorRef.current = setInterval(async () => {
          if (Date.now() > timeoutAt) {
            try {
              await p.pause();
            } catch (_) {}
            finish({ ok: true });
            return;
          }

          const state = await p.getCurrentState();
          if (!state) return;

          if (state.position >= end) {
            try {
              await p.pause();
            } catch (_) {}
            finish({ ok: true });
          }
        }, 150);
      });
    },
    [getToken]
  );

  const hasToken = !!getStoredToken();

  const value = {
    hasToken,
    isReady,
    deviceId,
    error,
    nowPlaying,
    connect,
    disconnect,
    stopSnippet,
    getToken,
    playTrack,
    clientId,
  };

  return <SpotifyContext.Provider value={value}>{children}</SpotifyContext.Provider>;
}

export function useSpotify() {
  const ctx = useContext(SpotifyContext);
  if (!ctx) throw new Error('useSpotify must be used within SpotifyProvider');
  return ctx;
}
