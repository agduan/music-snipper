import { useState } from 'react';
import { Pencil } from 'lucide-react';
import YouTubePlayer from './YouTubePlayer';
import SpotifyPlayer from './SpotifyPlayer';
import { getTagColor } from '../utils/tagColors';

function MainPanel({
  mode,
  selectedSnippet,
  onUpdateSnippet,
  onDeleteSnippet,
  onEditSnippet,
  addFormNote,
  setAddFormNote,
  dark,
  readOnly,
}) {
  const [editingDate, setEditingDate] = useState(false);
  const [dateValue, setDateValue] = useState('');
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState('');
  const [editingLocation, setEditingLocation] = useState(false);
  const [locationValue, setLocationValue] = useState('');

  const formatTime = (seconds) => {
    if (seconds == null) return null;
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  const formatSavedAt = (savedAt) => {
    if (!savedAt) return '';
    const d = new Date(savedAt);
    const hasTime =
      /T\d{2}:\d{2}/.test(savedAt) &&
      !/T00:00(:\d{2})?(\.\d+)?Z?$/i.test(savedAt);
    return hasTime
      ? d.toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        })
      : d.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
  };

  if (mode === 'add' || mode === 'edit') {
    return (
      <div className="main-panel">
        <div className="note-blank">
          <textarea
            value={addFormNote}
            onChange={(e) => setAddFormNote(e.target.value)}
          />
        </div>
      </div>
    );
  }

  if (!selectedSnippet) {
    return (
      <div className="main-panel">
        <div className="main-panel-empty">Select a snippet to view</div>
      </div>
    );
  }

  const handleDateDoubleClick = () => {
    if (readOnly) return;
    setEditingDate(true);
    setDateValue(selectedSnippet.saved_at);
  };

  const normalizeDateForStorage = (input) => {
    if (!input || typeof input !== 'string') return input;
    const trimmed = input.trim();
    // Date-only (YYYY-MM-DD): parse as local midnight to avoid timezone day-shift
    const dateOnlyMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (dateOnlyMatch) {
      const [, year, month, day] = dateOnlyMatch;
      const d = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
      if (!isNaN(d.getTime())) return d.toISOString();
    }
    return trimmed;
  };

  const handleDateSave = () => {
    const toSave = normalizeDateForStorage(dateValue);
    if (toSave !== selectedSnippet.saved_at) {
      onUpdateSnippet(selectedSnippet.id, { saved_at: toSave });
    }
    setEditingDate(false);
  };

  const handleDateKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleDateSave();
    } else if (e.key === 'Escape') {
      setEditingDate(false);
    }
  };

  const handleNoteBlur = (e) => {
    const newNote = e.target.value;
    if (newNote !== selectedSnippet.note) {
      onUpdateSnippet(selectedSnippet.id, { note: newNote });
    }
  };

  const startFormatted = formatTime(selectedSnippet.start_seconds);
  const endFormatted = formatTime(selectedSnippet.end_seconds);

  return (
    <div className="main-panel">
      <div className="snippet-view">
        <div className="snippet-view-inner">
          <div className="snippet-view-header">
            <div className="snippet-view-titles">
              {selectedSnippet.label && (
                <h1 className="snippet-label">{selectedSnippet.label}</h1>
              )}
              {editingTitle ? (
                <input
                  className="snippet-title-input"
                  value={titleValue}
                  onChange={(e) => setTitleValue(e.target.value)}
                  onBlur={() => {
                    if (titleValue && titleValue !== selectedSnippet.title) {
                      onUpdateSnippet(selectedSnippet.id, { title: titleValue });
                    }
                    setEditingTitle(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') e.target.blur();
                    if (e.key === 'Escape') setEditingTitle(false);
                  }}
                  autoFocus
                />
              ) : (
                <h2
                  className="snippet-title"
                  onDoubleClick={() => {
                    if (readOnly) return;
                    setEditingTitle(true);
                    setTitleValue(selectedSnippet.title);
                  }}
                >
                  {selectedSnippet.title}
                </h2>
              )}
            </div>
            {!readOnly && (
              <button
                className="edit-button"
                onClick={() => onEditSnippet(selectedSnippet)}
                title="Edit snippet"
              >
                <Pencil size={16} />
                <span>Edit</span>
              </button>
            )}
          </div>

          <div className="snippet-meta-row">
            <div className="snippet-meta" onDoubleClick={handleDateDoubleClick}>
              {editingDate ? (
                <input
                  type="text"
                  value={dateValue}
                  onChange={(e) => setDateValue(e.target.value)}
                  onBlur={handleDateSave}
                  onKeyDown={handleDateKeyDown}
                  autoFocus
                />
              ) : (
                formatSavedAt(selectedSnippet.saved_at)
              )}
            </div>

            {startFormatted != null && (
              <span className="timestamp-pill">
                {startFormatted}
                {endFormatted != null && <>{' - '}{endFormatted}</>}
              </span>
            )}

            {editingLocation ? (
              <input
                className="location-input"
                value={locationValue}
                onChange={(e) => setLocationValue(e.target.value)}
                onBlur={() => {
                  const trimmed = locationValue.trim();
                  if (trimmed !== (selectedSnippet.location || '')) {
                    onUpdateSnippet(selectedSnippet.id, { location: trimmed || null });
                  }
                  setEditingLocation(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') e.target.blur();
                  if (e.key === 'Escape') setEditingLocation(false);
                }}
                placeholder="add location"
                autoFocus
              />
            ) : (
              <span
                className="location-chip"
                onClick={() => {
                  if (readOnly) return;
                  setEditingLocation(true);
                  setLocationValue(selectedSnippet.location || '');
                }}
                title={readOnly ? '' : 'Click to add or edit location'}
              >
                <span className="location-chip-icon">{'\u26B2'}</span>
                {selectedSnippet.location || ''}
              </span>
            )}

            {selectedSnippet.tags && selectedSnippet.tags.length > 0 && (
              <div className="meta-tags">
                {selectedSnippet.tags.map((tag) => {
                  const color = getTagColor(tag, dark);
                  return (
                    <span
                      key={tag}
                      className="tag-chip"
                      style={{
                        backgroundColor: color.bg,
                        color: color.text ?? color.dot,
                      }}
                    >
                      {tag}
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          <div className={`player-container ${selectedSnippet.platform === 'spotify' ? 'player-spotify' : 'player-youtube'}`}>
            {selectedSnippet.platform === 'youtube' ? (
              <YouTubePlayer
                url={selectedSnippet.url}
                startSeconds={selectedSnippet.start_seconds}
                endSeconds={selectedSnippet.end_seconds}
              />
            ) : (
              <SpotifyPlayer
                url={selectedSnippet.url}
                startSeconds={selectedSnippet.start_seconds}
                endSeconds={selectedSnippet.end_seconds}
              />
            )}
          </div>

          <div className="note-section">
            <textarea
              className="note-textarea"
              defaultValue={selectedSnippet.note}
              key={selectedSnippet.id}
              onBlur={readOnly ? undefined : handleNoteBlur}
              readOnly={readOnly}
              placeholder=""
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default MainPanel;
