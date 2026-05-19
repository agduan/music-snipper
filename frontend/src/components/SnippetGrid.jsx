import { Music } from 'lucide-react';
import { formatSnippetTimestampRange } from '../utils/formatTimestamp';

function SnippetGrid({ snippets, selectedSnippet, onSelectSnippet }) {
  return (
    <div className="snippet-grid">
      {snippets.map((snippet) => {
        const timestampLabel = formatSnippetTimestampRange(
          snippet.start_seconds,
          snippet.end_seconds
        );
        const savedDateLabel = snippet.saved_at
          ? new Date(snippet.saved_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })
          : '';

        return (
          <button
            key={snippet.id}
            type="button"
            className={`snippet-grid-card ${selectedSnippet?.id === snippet.id ? 'selected' : ''}`}
            onClick={() => onSelectSnippet(snippet)}
          >
            <div className="snippet-grid-cover">
              {savedDateLabel && (
                <div className="snippet-grid-date">
                  {savedDateLabel}
                </div>
              )}
              {snippet.thumbnail_url ? (
                <img src={snippet.thumbnail_url} alt="" loading="lazy" />
              ) : (
                <div className="snippet-grid-cover-placeholder">
                  <Music size={28} />
                </div>
              )}
            </div>
            <div className="snippet-grid-info">
              <div className="snippet-grid-title">{snippet.title}</div>
              {snippet.label && <div className="snippet-grid-label">{snippet.label}</div>}
              {timestampLabel && (
                <div className="snippet-grid-timestamp">{timestampLabel}</div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

export default SnippetGrid;
