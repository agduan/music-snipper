import { useState } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import { auth } from '../firebase';

function Login({ onClose }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      const messages = {
        'auth/invalid-credential': 'Invalid email or password',
        'auth/email-already-in-use': 'An account with this email already exists',
        'auth/weak-password': 'Password must be at least 6 characters',
        'auth/invalid-email': 'Invalid email address',
      };
      setError(messages[err.code] || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>&times;</button>
        <h2 className="modal-title">{isSignUp ? 'Create account' : 'Sign in'}</h2>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              className="form-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              className="form-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Stored by Google auth, I don't see"
              required
            />
          </div>

          {error && <div className="login-error">{error}</div>}

          <button className="save-button login-button" type="submit" disabled={loading}>
            {loading ? '...' : isSignUp ? 'Create account' : 'Sign in'}
          </button>
        </form>

        <button
          className="login-toggle"
          onClick={() => {
            setIsSignUp(!isSignUp);
            setError('');
          }}
        >
          {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
        </button>
      </div>
    </div>
  );
}

export default Login;
