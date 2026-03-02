import { useEffect, useRef } from 'react';

function YouTubePlayer({ url, startSeconds, endSeconds }) {
  const containerRef = useRef(null);
  const playerInstanceRef = useRef(null);
  const intervalRef = useRef(null);

  const extractVideoId = (url) => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
    return match ? match[1] : null;
  };

  const videoId = extractVideoId(url);

  useEffect(() => {
    // Load YouTube IFrame API
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

      window.onYouTubeIframeAPIReady = () => {
        createPlayer();
      };
    } else {
      createPlayer();
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      const p = playerInstanceRef.current;
      if (p && typeof p.destroy === 'function') {
        try {
          p.destroy();
        } catch (_) {}
        playerInstanceRef.current = null;
      }
    };
  }, [videoId, startSeconds, endSeconds]);

  const createPlayer = () => {
    if (!videoId || !containerRef.current) return;

    const newPlayer = new window.YT.Player(containerRef.current, {
      videoId,
      playerVars: {
        start: startSeconds,
        autoplay: 1,
        rel: 0,
      },
      events: {
        onStateChange: (event) => {
          // Start polling when video is playing
          if (event.data === window.YT.PlayerState.PLAYING && endSeconds) {
            intervalRef.current = setInterval(() => {
              const currentTime = newPlayer.getCurrentTime();
              if (currentTime >= endSeconds) {
                newPlayer.pauseVideo();
                clearInterval(intervalRef.current);
              }
            }, 100);
          }
        },
      },
    });

    playerInstanceRef.current = newPlayer;
  };

  if (!videoId) {
    return <div style={{ color: 'white', padding: '20px' }}>Invalid YouTube URL</div>;
  }

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}

export default YouTubePlayer;
