export function formatTimestamp(seconds) {
  if (seconds == null) return '';
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

export function formatSnippetTimestampRange(startSeconds, endSeconds) {
  if (startSeconds == null) return '';
  if (endSeconds != null) {
    return `${formatTimestamp(startSeconds)} – ${formatTimestamp(endSeconds)}`;
  }
  return formatTimestamp(startSeconds);
}
