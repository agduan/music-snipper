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
import { extractDominantColor } from './utils/albumColor';
import { defaultSnippets } from './data/defaultSnippets';
import Login from './components/Login';
import Sidebar from './components/Sidebar';
import MainPanel from './components/MainPanel';
import './styles/App.css';

function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showLogin, setShowLogin] = useState(false);
  const [mode, setMode] = useState('list');
  const [snippets, setSnippets] = useState([]);
  const [selectedSnippet, setSelectedSnippet] = useState(null);
  const [addFormNote, setAddFormNote] = useState('');
  const [editingSnippet, setEditingSnippet] = useState(null);
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark');
  const [sprayOn, setSprayOn] = useState(() => localStorage.getItem('spray') !== 'off');
  const [sprayColor, setSprayColor] = useState('#8C7E6F');

  useEffect(() => {
    if (selectedSnippet?.thumbnail_url) {
      extractDominantColor(selectedSnippet.thumbnail_url)
        .then(setSprayColor)
        .catch(() => setSprayColor('#8C7E6F'));
    } else {
      setSprayColor('#8C7E6F');
    }
  }, [selectedSnippet?.thumbnail_url]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  useEffect(() => {
    localStorage.setItem('spray', sprayOn ? 'on' : 'off');
  }, [sprayOn]);

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
      setSnippets(defaultSnippets);
      setSelectedSnippet(defaultSnippets.length > 0 ? defaultSnippets[0] : null);
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
      if (data.length > 0 && !selectedSnippet) {
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

  // Parse hex to 0-1 RGB for feColorMatrix
  const hexToMatrix = (hex) => {
    const m = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
    if (!m) return '0.55 0 0 0 0  0.49 0 0 0 0  0.44 0 0 0 0  0 0 0 0 1';
    const r = (parseInt(m[1], 16) / 255).toFixed(3);
    const g = (parseInt(m[2], 16) / 255).toFixed(3);
    const b = (parseInt(m[3], 16) / 255).toFixed(3);
    return `${r} 0 0 0 0  ${g} 0 0 0 0  ${b} 0 0 0 0  0 0 0 0 1`;
  };
  const spraySvg = `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180"><filter id="s"><feTurbulence type="fractalNoise" baseFrequency="0.015" numOctaves="2" result="n"/><feComponentTransfer in="n" result="norm"><feFuncR type="linear" slope="1.2" intercept="0.3"/><feFuncG type="linear" slope="1.2" intercept="0.3"/><feFuncB type="linear" slope="1.2" intercept="0.3"/><feFuncA type="discrete" tableValues="1"/></feComponentTransfer><feColorMatrix in="norm" type="matrix" values="${hexToMatrix(sprayColor)}" result="colored"/></filter><rect width="180" height="180" fill="white" filter="url(%23s)"/></svg>`
  )}`;

  return (
    <div className="app-wrapper">
      {sprayOn && (
        <div
          className="spray-overlay"
          style={{
            backgroundColor: sprayColor,
            backgroundImage: `url(${spraySvg})`,
          }}
          aria-hidden
        />
      )}
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
          <button
            className="spray-toggle"
            onClick={() => setSprayOn((s) => !s)}
            title={sprayOn ? 'Turn spray off' : 'Turn spray on'}
            aria-label={sprayOn ? 'Turn spray off' : 'Turn spray on'}
          >
            <img
              src={sprayOn ? '/spray.png' : '/spray%20off.png'}
              alt=""
              className={`spray-toggle-img ${sprayOn ? 'spray-on' : ''}`}
            />
          </button>
        </div>
        <div className="app-title-group">
          <img src="/favicon.png" alt="" className="app-favicon" />
          <h1 className="app-title">alex{'\u2019'}s music</h1>
          <p className="app-subtitle">BANGERS all the time. Save music snippets.</p>
          <p className="app-subtitle">TO-DO: 1) Unchop spray effect 2) Add Spotify timestamping 3) Friend password 4) Mobile</p>
        </div>
        <div className="app-header-right">
          {user ? (
            <button className="auth-link" onClick={() => signOut(auth)}>
              It{'\u2019'}s {user.email.slice(0, 4)}!
            </button>
          ) : (
            <button className="auth-link" onClick={() => setShowLogin(true)}>
              Sign in to save snippets king!!!
            </button>
          )}
        </div>
      </header>
      <div className="app">
        <Sidebar
          mode={mode}
          setMode={(m) => {
            setMode(m);
            if (m !== 'edit') setEditingSnippet(null);
          }}
          snippets={snippets}
          selectedSnippet={selectedSnippet}
          setSelectedSnippet={setSelectedSnippet}
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
        />
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
        />
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
