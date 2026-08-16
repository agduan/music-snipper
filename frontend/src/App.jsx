import { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { defaultSnippets } from './data/defaultSnippets';
import { useMediaQuery } from './hooks/useMediaQuery';
import Login from './components/Login';
import Sidebar from './components/Sidebar';
import MainPanel from './components/MainPanel';
import './styles/App.css';

function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showLogin, setShowLogin] = useState(false);
  const [mode, setMode] = useState('list');
  const [browseView, setBrowseView] = useState('list');
  const [snippets, setSnippets] = useState([]);
  const [selectedSnippet, setSelectedSnippet] = useState(null);
  const [addFormNote, setAddFormNote] = useState('');
  const [editingSnippet, setEditingSnippet] = useState(null);
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark');
  const isMobile = useMediaQuery('(max-width: 767px)');
  const [mobileView, setMobileView] = useState('list');

  useEffect(() => {
    if (isMobile && mobileView === 'detail' && !selectedSnippet) {
      setMobileView('list');
    }
  }, [isMobile, mobileView, selectedSnippet]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  useEffect(() => {
    return onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthLoading(false);
      if (firebaseUser) setShowLogin(false);
    });
  }, []);

  useEffect(() => {
    if (user) {
      fetchSnippets();
    } else {
      const sorted = [...defaultSnippets].sort((a, b) => new Date(b.saved_at) - new Date(a.saved_at));
      setSnippets(sorted);
      setSelectedSnippet(sorted.length > 0 ? sorted[0] : null);
      setMode('list');
    }
  }, [user]);

  const sortBySavedAt = (list) =>
    [...list].sort((a, b) => new Date(b.saved_at) - new Date(a.saved_at));

  const fetchSnippets = async () => {
    try {
      const q = query(
        collection(db, 'snippets'),
        where('uid', '==', user.uid),
        orderBy('saved_at', 'desc')
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setSnippets(data);
      if (data.length > 0) {
        setSelectedSnippet(data[0]);
      }
    } catch (error) {
      console.error('Failed to fetch snippets:', error);
    }
  };

  const handleSaveSnippet = async (snippetData) => {
    if (!user) {
      setShowLogin(true);
      return;
    }
    try {
      const newData = {
        ...snippetData,
        note: addFormNote,
        saved_at: new Date().toISOString(),
        uid: user.uid,
      };
      const docRef = await addDoc(collection(db, 'snippets'), newData);
      const newSnippet = { id: docRef.id, ...newData };
      setSnippets(sortBySavedAt([newSnippet, ...snippets]));
      setSelectedSnippet(newSnippet);
      setMode('list');
      setBrowseView('list');
      setAddFormNote('');
    } catch (error) {
      console.error('Failed to save snippet:', error);
    }
  };

  const getRelativeTime = (dateStr) => {
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

  const handleEditSnippet = (snippet) => {
    setEditingSnippet(snippet);
    setAddFormNote(snippet.note || '');
    setMode('edit');
    if (isMobile) setMobileView('list');
  };

  const handleSelectSnippet = (snippet) => {
    setSelectedSnippet(snippet);
    if (isMobile) setMobileView('detail');
  };

  const handleSaveEdit = async (snippetData) => {
    if (!editingSnippet) return;
    try {
      const updates = {
        url: snippetData.url,
        platform: snippetData.platform,
        label: snippetData.label || '',
        title: snippetData.title,
        start_seconds: snippetData.start_seconds,
        end_seconds: snippetData.end_seconds,
        thumbnail_url: snippetData.thumbnail_url || editingSnippet.thumbnail_url || null,
        tags: snippetData.tags || [],
        note: addFormNote,
      };
      await updateDoc(doc(db, 'snippets', editingSnippet.id), updates);
      const updatedSnippet = { ...editingSnippet, ...updates };
      setSnippets(sortBySavedAt(snippets.map((s) => s.id === editingSnippet.id ? updatedSnippet : s)));
      setSelectedSnippet(updatedSnippet);
      setEditingSnippet(null);
      setMode('list');
      setAddFormNote('');
    } catch (error) {
      console.error('Failed to update snippet:', error);
    }
  };

  const handleUpdateSnippet = async (id, updates) => {
    try {
      await updateDoc(doc(db, 'snippets', id), updates);
      const updated = snippets.map((s) =>
        s.id === id ? { ...s, ...updates } : s
      );
      setSnippets(sortBySavedAt(updated));
      if (selectedSnippet?.id === id) {
        setSelectedSnippet({ ...selectedSnippet, ...updates });
      }
    } catch (error) {
      console.error('Failed to update snippet:', error);
    }
  };

  const handleDeleteSnippet = async (id) => {
    try {
      await deleteDoc(doc(db, 'snippets', id));
      setSnippets(snippets.filter((s) => s.id !== id));
      if (selectedSnippet?.id === id) {
        setSelectedSnippet(null);
      }
    } catch (error) {
      console.error('Failed to delete snippet:', error);
    }
  };

  if (authLoading) return null;

  return (
    <div className="app-wrapper">
      <header className="app-header">
        <div className="app-header-left">
          <button
            className="theme-toggle"
            onClick={() => setDark((d) => !d)}
            title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label="Toggle theme"
          >
            {dark ? (
              <img src="/rest.png" alt="Quarter rest" className="theme-icon-img" />
            ) : '\u266A'}
          </button>
        </div>
        <div className="app-title-group">
          <img src="/favicon.png" alt="" className="app-favicon" />
          <div className="app-title-copy">
            <h1 className="app-title">alex{'\u2019'}s music</h1>
            <p className="app-subtitle">Save music snippets</p>
          </div>
        </div>
        <div className="app-header-right">
          {user ? (
            <button className="auth-link" onClick={() => signOut(auth)}>
              <span className="auth-link">Sign out</span>
            </button>
          ) : (
            <button className="auth-link" onClick={() => setShowLogin(true)}>
              <span className="auth-link">Sign in</span>
            </button>
          )}
        </div>
      </header>
      <div
        className={[
          'app',
          browseView === 'grid' && mode === 'list' && 'browse-grid',
          browseView === 'grid' &&
            mode === 'list' &&
            selectedSnippet &&
            !isMobile &&
            'browse-grid-detail',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {(!isMobile || mobileView === 'list') && (
          <Sidebar
            mode={mode}
            setMode={(m) => {
              setMode(m);
              if (m !== 'edit') setEditingSnippet(null);
              if (isMobile && (m === 'add' || m === 'list')) setMobileView('list');
            }}
            browseView={browseView}
            setBrowseView={(v) => {
              setBrowseView(v);
              if (v === 'grid' && !isMobile) setSelectedSnippet(null);
            }}
            snippets={snippets}
            selectedSnippet={selectedSnippet}
            setSelectedSnippet={isMobile ? handleSelectSnippet : setSelectedSnippet}
            onSaveSnippet={handleSaveSnippet}
            onSaveEdit={handleSaveEdit}
            onUpdateSnippet={handleUpdateSnippet}
            onDeleteSnippet={handleDeleteSnippet}
            editingSnippet={editingSnippet}
            addFormNote={addFormNote}
            setAddFormNote={setAddFormNote}
            dark={dark}
            readOnly={!user}
            onRequestLogin={() => setShowLogin(true)}
            isMobile={isMobile}
          />
        )}
        {(!isMobile || mobileView === 'detail') && (
          <MainPanel
            mode={mode}
            selectedSnippet={selectedSnippet}
            onUpdateSnippet={handleUpdateSnippet}
            onDeleteSnippet={handleDeleteSnippet}
            onEditSnippet={handleEditSnippet}
            addFormNote={addFormNote}
            setAddFormNote={setAddFormNote}
            dark={dark}
            readOnly={!user}
            isMobile={isMobile}
            onBackToList={isMobile ? () => setMobileView('list') : undefined}
          />
        )}
      </div>
      {snippets.length > 0 && (
        <div className="stats-footer">
          {user ? (
            <>
              {snippets.length} snippet{snippets.length !== 1 ? 's' : ''} saved
              {snippets[0]?.saved_at && ` \u00b7 last added ${getRelativeTime(snippets[0].saved_at)}`}
            </>
          ) : (
            'Sign in to save your own snippets'
          )}
        </div>
      )}
      {showLogin && <Login onClose={() => setShowLogin(false)} />}
    </div>
  );
}

export default App;
