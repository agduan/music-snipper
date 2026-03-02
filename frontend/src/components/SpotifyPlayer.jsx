import { useState } from 'react';
import { useSpotify } from '../context/SpotifyContext';

function SpotifyPlayer({ url, startSeconds, endSeconds }) {
  const { hasToken, isReady, connect, disconnect, playTrack, error } = useSpotify();
  const [isPlaying, setIsPlaying] = useState(false);

  const extractSpotifyId = (url) => {
    const match = url.match(/spotify\.com\/track\/([^?\s]+)/);
    return match ? match[1] : null;
  };

  const trackId = extractSpotifyId(url);

  const handlePlaySnippet = async () => {
    if (!trackId || !isReady) return;
    const startMs = startSeconds != null ? startSeconds * 1000 : 0;
    const endMs = endSeconds != null ? endSeconds * 1000 : null;
    const uri = `spotify:track:${trackId}`;
    setIsPlaying(true);
    await playTrack(uri, startMs, endMs);
    setIsPlaying(false);
  };

  const hasStart = startSeconds != null;
  const hasEnd = endSeconds != null;
  const canUseTimestamps = hasToken && isReady;

  if (!trackId) {
    return <div style={{ color: 'white', padding: '20px' }}>Invalid Spotify URL</div>;
  }

  const embedUrl = `https://open.spotify.com/embed/track/${trackId}`;

  return (
    <>
      <div className="spotify-player-wrapper">
        <iframe
          src={embedUrl}
          width="100%"
          height="80"
          frameBorder="0"
          allow="encrypted-media; autoplay; clipboard-write"
          title="Spotify Player"
          style={{ borderRadius: '8px' }}
        />
        <div className="spotify-controls-row">
          {canUseTimestamps && (hasStart || hasEnd) && (
            <button
              type="button"
              className="spotify-play-snippet-btn"
              onClick={handlePlaySnippet}
              disabled={isPlaying}
            >
              {isPlaying ? 'Playing…' : 'Play snippet'}
            </button>
          )}
          {!canUseTimestamps && (hasStart || hasEnd) && (
            <>
              <span className="spotify-notice">Connect Spotify (Premium required) for timestamp playback.</span>
              <button type="button" className="spotify-connect-btn" onClick={connect}>
                Connect Spotify
              </button>
            </>
          )}
          {hasToken && (
            isReady ? (
              <button type="button" className="spotify-disconnect-btn" onClick={disconnect}>
                Disconnect Spotify
              </button>
            ) : (
              <button type="button" className="spotify-connect-btn" onClick={connect}>
                {error ? 'Retry Spotify' : 'Connect Spotify'}
              </button>
            )
          )}
          {error && <span className="spotify-error">{error}</span>}
        </div>
      </div>
    </>
  );
}

export default SpotifyPlayer;
