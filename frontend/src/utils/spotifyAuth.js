const SPOTIFY_AUTH = 'https://accounts.spotify.com/authorize';
const SPOTIFY_TOKEN = 'https://accounts.spotify.com/api/token';
const SCOPES = ['user-modify-playback-state', 'user-read-playback-state'];

function generateRandomString(length) {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const values = crypto.getRandomValues(new Uint8Array(length));
  return values.reduce((acc, x) => acc + possible[x % possible.length], '');
}

async function sha256(plain) {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return crypto.subtle.digest('SHA-256', data);
}

function base64URLEncode(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

export async function generateCodeChallenge() {
  const codeVerifier = generateRandomString(64);
  const hashed = await sha256(codeVerifier);
  const codeChallenge = base64URLEncode(hashed);
  return { codeVerifier, codeChallenge };
}

export function getRedirectUri() {
  const { origin } = window.location;
  return origin.endsWith('/') ? origin.slice(0, -1) : origin;
}

export function initiateAuth(clientId) {
  generateCodeChallenge().then(({ codeVerifier, codeChallenge }) => {
    localStorage.setItem('spotify_code_verifier', codeVerifier);
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      scope: SCOPES.join(' '),
      redirect_uri: getRedirectUri(),
      code_challenge_method: 'S256',
      code_challenge: codeChallenge,
      state: generateRandomString(16),
    });
    window.location.href = `${SPOTIFY_AUTH}?${params.toString()}`;
  });
}

export async function exchangeCodeForToken(clientId, code) {
  const codeVerifier = localStorage.getItem('spotify_code_verifier');
  if (!codeVerifier) throw new Error('No code verifier found');

  const res = await fetch(SPOTIFY_TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: getRedirectUri(),
      client_id: clientId,
      code_verifier: codeVerifier,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = err.error_description || err.error || `Token exchange failed: ${res.status}`;
    const hint =
      res.status === 400 && (err.error === 'invalid_grant' || err.error === 'invalid_request')
        ? ' Ensure redirect URI in Spotify Dashboard exactly matches: ' + getRedirectUri()
        : '';
    throw new Error(msg + hint);
  }

  const data = await res.json();
  localStorage.removeItem('spotify_code_verifier');
  localStorage.setItem('spotify_access_token', data.access_token);
  localStorage.setItem('spotify_refresh_token', data.refresh_token);
  localStorage.setItem('spotify_token_expires_at', String(Date.now() + data.expires_in * 1000));
  return data.access_token;
}

export async function refreshAccessToken(clientId) {
  const refreshToken = localStorage.getItem('spotify_refresh_token');
  if (!refreshToken) return null;

  const res = await fetch(SPOTIFY_TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
    }),
  });

  if (!res.ok) return null;

  const data = await res.json();
  localStorage.setItem('spotify_access_token', data.access_token);
  localStorage.setItem('spotify_token_expires_at', String(Date.now() + data.expires_in * 1000));
  if (data.refresh_token) {
    localStorage.setItem('spotify_refresh_token', data.refresh_token);
  }
  return data.access_token;
}

export function getStoredToken() {
  return localStorage.getItem('spotify_access_token');
}

export function isTokenExpired() {
  const expiresAt = localStorage.getItem('spotify_token_expires_at');
  if (!expiresAt) return true;
  return Date.now() > parseInt(expiresAt, 10) - 60000; // 1 min buffer
}

export function disconnectSpotify() {
  localStorage.removeItem('spotify_access_token');
  localStorage.removeItem('spotify_refresh_token');
  localStorage.removeItem('spotify_token_expires_at');
}
