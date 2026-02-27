import { useEffect, useRef, useState } from 'react';

function YouTubePlayer({ url, startSeconds, endSeconds }) {
  const playerRef = useRef(null);
  const intervalRef = useRef(null);
  const [player, setPlayer] = useState(null);

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
      }
      if (player) {
        player.destroy();
      }
    };
  }, [videoId, startSeconds, endSeconds]);

  const createPlayer = () => {
    if (!videoId || !playerRef.current) return;

    const newPlayer = new window.YT.Player(playerRef.current, {
      videoId,
      playerVars: {
        start: startSeconds,
        autoplay: 1,
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

    setPlayer(newPlayer);
  };

  if (!videoId) {
    return <div style={{ color: 'white', padding: '20px' }}>Invalid YouTube URL</div>;
  }

  return <div ref={playerRef} style={{ width: '100%', height: '100%' }} />;
}

export default YouTubePlayer;
