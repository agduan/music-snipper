# Music Snippet Saver

Save bits of songs with notes from YouTube or Spotify. User can auto-play songs from start to end timestamps on YouTube, but not on Spotify, which hates me.

![Homepage](./homepage.png)

## Usage

1. Sign up or sign in
2. Click **+** and paste a YouTube or Spotify URL
3. Enter timestamp(s) and notes
4. Scroll through your other snippets

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Firebase Setup

1. Create a project at [Firebase Console](https://console.firebase.google.com)
2. Enable **Firestore** and **Authentication** (Email/Password)
3. Add a Web app and copy the config into `frontend/src/firebase.js`

## Deploy

```bash
npm run deploy
```

## Tech

React + Vite · Firestore · Firebase Auth & Hosting