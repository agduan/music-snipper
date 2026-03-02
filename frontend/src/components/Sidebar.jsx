import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { List, Plus, Music, Trash2 } from 'lucide-react';
import { getTagColor } from '../utils/tagColors';

function Sidebar({
  mode,
  setMode,
  snippets,
  selectedSnippet,
  setSelectedSnippet,
  onSaveSnippet,
  onSaveEdit,
  onUpdateSnippet,
  onDeleteSnippet,
  editingSnippet,
  dark,
  readOnly,
  onRequestLogin,
}) {
  const [editingTitleId, setEditingTitleId] = useState(null);
  const [titleValue, setTitleValue] = useState('');
  const [formData, setFormData] = useState({
    url: '',
    label: '',
    title: '',
    start: '',
    end: '',
    tags: '',
    thumbnail_url: '',
  });

  const formatTimestamp = (seconds) => {
    if (seconds == null) return '';
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  const relativeTime = (dateStr) => {
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    const diffMs = now - then;
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months}mo ago`;
    const years = Math.floor(months / 12);
    return `${years}y ago`;
  };

  useEffect(() => {
    if (mode === 'edit' && editingSnippet) {
      setFormData({
        url: editingSnippet.url || '',
        label: editingSnippet.label || '',
        title: editingSnippet.title || '',
        start: formatTimestamp(editingSnippet.start_seconds),
        end: formatTimestamp(editingSnippet.end_seconds),
        tags: (editingSnippet.tags || []).join(', '),
        thumbnail_url: editingSnippet.thumbnail_url || '',
      });
    } else if (mode === 'add') {
      setFormData({ url: '', label: '', title: '', start: '', end: '', tags: '', thumbnail_url: '' });
    }
  }, [mode, editingSnippet]);

  const handleModeChange = (newMode) => {
    setMode(newMode);
    if (newMode === 'add') {
      setFormData({ url: '', label: '', title: '', start: '', end: '', tags: '', thumbnail_url: '' });
    }
  };

  const parseTimestamp = (input) => {
    if (!input) return null;
    if (input.includes(':')) {
      const [min, sec] = input.split(':').map(Number);
      return min * 60 + sec;
    }
    return parseInt(input, 10);
  };

  const extractYouTubeId = (url) => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
    return match ? match[1] : null;
  };

  const handleUrlChange = async (url) => {
    setFormData((prev) => ({ ...prev, url }));

    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      try {
        const videoId = extractYouTubeId(url);
        if (videoId) {
          const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
          const response = await fetch(
            `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
          );
          const data = await response.json();
          setFormData((prev) => ({ ...prev, title: data.title, url, thumbnail_url: thumbnailUrl }));
        }
      } catch (error) {
        console.error('Failed to fetch YouTube title:', error);
      }
    } else if (url.includes('open.spotify.com')) {
      try {
        const response = await fetch(
          `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`
        );
        const data = await response.json();
        setFormData((prev) => ({
          ...prev,
          title: data.title,
          url,
          thumbnail_url: data.thumbnail_url || '',
        }));
      } catch (error) {
        console.error('Failed to fetch Spotify title:', error);
      }
    }
  };

  const handleSubmit = () => {
    const platform = formData.url.includes('youtube.com') || formData.url.includes('youtu.be')
      ? 'youtube'
      : 'spotify';

    const startSeconds = parseTimestamp(formData.start);
    const endSeconds = formData.end ? parseTimestamp(formData.end) : null;

    if (!formData.url || !formData.title || startSeconds === null) {
      alert('Please fill in URL, title, and start timestamp');
      return;
    }

    const tags = formData.tags
      ? formData.tags.split(',').map((t) => t.trim()).filter(Boolean)
      : [];

    const data = {
      url: formData.url,
      platform,
      label: formData.label || '',
      title: formData.title,
      start_seconds: startSeconds,
      end_seconds: endSeconds,
      thumbnail_url: formData.thumbnail_url || null,
      tags,
    };

    if (mode === 'edit') {
      onSaveEdit(data);
    } else {
      onSaveSnippet(data);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSubmit();
    }
  };

  const isFormMode = mode === 'add' || mode === 'edit';

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <button
          className={`icon-button ${mode === 'list' ? 'active' : ''}`}
          onClick={() => handleModeChange('list')}
          title="Browse snippets"
        >
          <List size={20} />
        </button>
        <button
          className={`icon-button ${mode === 'add' ? 'active' : ''}`}
          onClick={() => (readOnly ? onRequestLogin() : handleModeChange('add'))}
          title={readOnly ? 'Sign in to add snippets' : 'Add snippet'}
        >
          <Plus size={20} />
        </button>
      </div>

      {!isFormMode ? (
        <div className="snippet-list">
          {snippets.map((snippet) => (
            <motion.div
              key={snippet.id}
              layout
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className={`snippet-item ${selectedSnippet?.id === snippet.id ? 'selected' : ''}`}
              onClick={() => setSelectedSnippet(snippet)}
            >
              {snippet.thumbnail_url ? (
                <img
                  className="snippet-item-thumb"
                  src={snippet.thumbnail_url}
                  alt=""
                  loading="lazy"
                />
              ) : (
                <div className="snippet-item-thumb-placeholder">
                  <Music size={18} />
                </div>
              )}
              <div className="snippet-item-content">
                {snippet.label && (
                  <div className="snippet-item-label">{snippet.label}</div>
                )}
                {!readOnly && editingTitleId === snippet.id ? (
                  <input
                    className="snippet-item-title-input"
                    value={titleValue}
                    onChange={(e) => setTitleValue(e.target.value)}
                    onBlur={() => {
                      if (titleValue && titleValue !== snippet.title) {
                        onUpdateSnippet(snippet.id, { title: titleValue });
                      }
                      setEditingTitleId(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') e.target.blur();
                      if (e.key === 'Escape') setEditingTitleId(null);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                  />
                ) : (
                  <div
                    className="snippet-item-title"
                    onDoubleClick={(e) => {
                      if (readOnly) return;
                      e.stopPropagation();
                      setEditingTitleId(snippet.id);
                      setTitleValue(snippet.title);
                    }}
                  >
                    {snippet.title}
                  </div>
                )}
                <div className="snippet-item-meta">
                  <span className="snippet-item-date">
                    {new Date(snippet.saved_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                    {snippet.start_seconds != null && (
                      <span className="snippet-item-timestamp">
                        {' · '}
                        {snippet.end_seconds != null
                          ? `${formatTimestamp(snippet.start_seconds)} - ${formatTimestamp(snippet.end_seconds)}`
                          : formatTimestamp(snippet.start_seconds)}
                      </span>
                    )}
                  </span>
                  {snippet.tags && snippet.tags.length > 0 && (
                    <div className="snippet-item-tags">
                      {snippet.tags.map((tag) => (
                        <span
                          key={tag}
                          className="tag-dot"
                          style={{ backgroundColor: getTagColor(tag, dark).dot }}
                          title={tag}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="add-form" onKeyDown={handleKeyDown}>
          {mode === 'edit' && (
            <div className="form-mode-label">Editing snippet</div>
          )}
          <div className="form-group">
            <label className="form-label">YouTube or Spotify URL</label>
            <input
              className="form-input"
              type="text"
              value={formData.url}
              onChange={(e) => handleUrlChange(e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
            />
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <input
              className="form-input"
              type="text"
              value={formData.label}
              onChange={(e) => setFormData({ ...formData, label: e.target.value })}
              placeholder="e.g. that one piano part"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Song Title</label>
            <input
              className="form-input"
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Auto-filled from URL"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Start (mm:ss or seconds)</label>
            <input
              className="form-input"
              type="text"
              value={formData.start}
              onChange={(e) => setFormData({ ...formData, start: e.target.value })}
              placeholder="1:30 or 90"
            />
          </div>

          <div className="form-group">
            <label className="form-label">End (optional)</label>
            <input
              className="form-input"
              type="text"
              value={formData.end}
              onChange={(e) => setFormData({ ...formData, end: e.target.value })}
              placeholder="2:00 or 120"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Tags (comma-separated)</label>
            <input
              className="form-input"
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              placeholder="jazz, piano, chill"
            />
          </div>

          <div className="form-actions">
            <button className="save-button" onClick={handleSubmit}>
              {mode === 'edit' ? 'Save changes' : 'Save'} ({'\u2318\u21B5'})
            </button>
            {mode === 'edit' && (
              <button className="cancel-button" onClick={() => setMode('list')}>
                Cancel
              </button>
            )}
          </div>
          {mode === 'edit' && editingSnippet && (
            <button
              className="delete-button-form"
              onClick={() => {
                if (confirm('Delete this snippet?')) {
                  onDeleteSnippet(editingSnippet.id);
                  setMode('list');
                }
              }}
            >
              <Trash2 size={14} />
              <span>Delete snippet</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default Sidebar;
