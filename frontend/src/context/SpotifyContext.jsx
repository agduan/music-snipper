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

export function SpotifyProvider({ children }) {
  const [deviceId, setDeviceId] = useState(null);
  const [player, setPlayer] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState(null);

  const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
  const cleanupRef = useRef(null);

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
      if (!window.Spotify || !window.Spotify.Player) return false;

      const spotifyPlayer = new window.Spotify.Player({
        name: "Music Snipper",
        getOAuthToken: (cb) => {
          getToken().then((token) => {
            if (token) cb(token);
          });
        },
        volume: 0.8,
      });

      spotifyPlayer.addListener('ready', ({ device_id }) => {
        setDeviceId(device_id);
        setIsReady(true);
        setError(null);
      });

      spotifyPlayer.addListener('not_ready', () => {
        setDeviceId(null);
        setIsReady(false);
      });

      spotifyPlayer.addListener('initialization_error', ({ message }) => {
        setError(message);
      });

      spotifyPlayer.addListener('authentication_error', ({ message }) => {
        setError(message);
      });

      spotifyPlayer.addListener('account_error', ({ message }) => {
        setError(message);
      });

      spotifyPlayer.connect();
      setPlayer(spotifyPlayer);

      return () => {
        spotifyPlayer.disconnect();
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

  const disconnect = useCallback(() => {
    if (player) player.disconnect();
    setPlayer(null);
    setDeviceId(null);
    setIsReady(false);
    disconnectSpotify();
    setError(null);
  }, [player]);

  const playTrack = useCallback(
    async (trackUri, startMs, endMs) => {
      const token = await getToken();
      if (!token || !deviceId) {
        setError('Not ready. Try disconnecting and reconnecting Spotify.');
        return { ok: false, error: 'Not ready' };
      }

      if (player?.activateElement) player.activateElement();
      setError(null);

      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      const transferRes = await fetch('https://api.spotify.com/v1/me/player', {
        method: 'PUT',
        headers,
        body: JSON.stringify({ device_ids: [deviceId], play: false }),
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

      if (transferRes.ok) {
        await new Promise((r) => setTimeout(r, 200));
      }

      const playRes = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          uris: [trackUri],
          position_ms: startMs ?? 0,
        }),
      });

      if (!playRes.ok) {
        const errBody = await playRes.json().catch(() => ({}));
        const msg = errBody?.error?.message || `Play failed: ${playRes.status}`;
        if (playRes.status === 404) {
          setError('No active device. Make sure "Music Snipper" appears in Spotify Connect devices.');
        } else if (playRes.status === 403) {
          setError('Spotify Premium required.');
        } else {
          setError(msg);
        }
        return { ok: false, error: msg };
      }

      if (endMs != null && player) {
        const checkPosition = () => {
          player.getCurrentState().then((state) => {
            if (!state) return;
            const pos = state.position;
            if (pos >= endMs) {
              player.pause();
              return;
            }
            setTimeout(checkPosition, 200);
          });
        };
        setTimeout(checkPosition, 500);
      }

      return { ok: true };
    },
    [deviceId, player, getToken]
  );

  const hasToken = !!getStoredToken();

  const value = {
    hasToken,
    isReady,
    deviceId,
    error,
    connect,
    disconnect,
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
