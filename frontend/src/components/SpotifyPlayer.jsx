function SpotifyPlayer({ url, startSeconds, endSeconds }) {
  const extractSpotifyId = (url) => {
    const match = url.match(/spotify\.com\/track\/([^?\s]+)/);
    return match ? match[1] : null;
  };

  const trackId = extractSpotifyId(url);

  if (!trackId) {
    return <div style={{ color: 'white', padding: '20px' }}>Invalid Spotify URL</div>;
  }

  const embedUrl = `https://open.spotify.com/embed/track/${trackId}`;

  const formatTime = (seconds) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  const hasStart = startSeconds != null;
  const hasEnd = endSeconds != null;

  return (
    <>
      <iframe
        src={embedUrl}
        width="100%"
        height="80"
        frameBorder="0"
        allow="encrypted-media; autoplay; clipboard-write"
        title="Spotify Player"
        style={{ borderRadius: '8px' }}
      />
      {(hasStart || hasEnd) && (
        <p className="spotify-notice">
          {hasStart && hasEnd && (
            <>From {formatTime(startSeconds)} to {formatTime(endSeconds)}. </>
          )}
          {hasStart && !hasEnd && (
            <> From {formatTime(startSeconds)}. </>
          )}
          Spotify doesn{'\u2019'}t support timestamp playback.
        </p>
      )}
    </>
  );
}

export default SpotifyPlayer;
