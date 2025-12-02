# EmptyDomai - AI Domain Generator

AI-powered Chrome extension for generating smart domain names, checking availability in real-time, and saving favorites.

## Features

- **AI-Powered Domain Generation**: Generate creative, brandable domain name suggestions using OpenAI
- **Real-Time Availability Check**: Instantly check if domains are available using DNS and RDAP lookups
- **Multiple TLD Support**: Search across .com, .io, .ai, .co, .net, and many more
- **Context Menu Integration**: Generate domains from selected text on any webpage
- **Search History**: Keep track of all your domain searches
- **Favorites**: Save and organize your favorite domain finds
- **Customizable Settings**: Configure default TLDs, styles, and generation preferences
- **Secure**: API keys stored locally, never sent to external servers

## Prerequisites

- Node.js 18+
- npm or yarn
- Google Chrome browser
- OpenAI API key
- Firebase project (for authentication and data storage)

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/emptydomai.git
cd emptydomai
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Firebase

1. Create a new Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Google Authentication in Firebase Auth
3. Create a Firestore database
4. Copy your Firebase config and update `src/services/firebase.ts`:

```typescript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

### 4. Configure OAuth2 (for Chrome Extension)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create OAuth 2.0 credentials for a Chrome Extension
3. Get your Client ID and update `manifest.json`:

```json
"oauth2": {
  "client_id": "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com",
  "scopes": [
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile"
  ]
}
```

### 5. Build the Extension

```bash
npm run build
```

### 6. Load the Extension in Chrome

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `dist` folder from the project

## Development

### Start Development Mode

```bash
npm run dev
```

This will watch for changes and rebuild automatically.

### Project Structure

```
emptydomai/
├── src/
│   ├── background/      # Service worker (background script)
│   ├── content/         # Content script for page interaction
│   ├── popup/           # Popup UI (React)
│   ├── options/         # Options page (React)
│   ├── components/      # Shared React components
│   ├── hooks/           # Custom React hooks
│   ├── services/        # API and data services
│   ├── types/           # TypeScript type definitions
│   └── styles/          # CSS styles (Tailwind)
├── icons/               # Extension icons
├── manifest.json        # Chrome extension manifest
├── popup.html           # Popup entry point
├── options.html         # Options page entry point
└── vite.config.ts       # Vite build configuration
```

## Usage

### Basic Domain Generation

1. Click the EmptyDomai extension icon
2. Enter keywords or brand ideas
3. Select preferred TLDs (.com, .io, etc.)
4. Click "Generate Domains"
5. View results with availability status
6. Save favorites by clicking the star icon

### Context Menu Generation

1. Select text on any webpage
2. Right-click and select "Generate Domains with EmptyDomai"
3. View generated domains based on selected content

### Settings

Access settings to:
- Add your OpenAI API key
- Set default TLDs
- Configure domain style preferences
- Adjust generation parameters

## API Key Security

**Your API keys are stored locally in your browser and are never sent to our servers.**

- Keys are stored in `chrome.storage.local`
- Keys are only used for direct API calls from your browser
- No server-side component has access to your keys

## Firestore Data Model

### Collections

**users**
```
{
  uid: string,
  email: string,
  displayName: string,
  photoURL: string,
  createdAt: timestamp,
  plan: "free" | "pro",
  settings: {
    defaultTlds: string[],
    defaultLanguage: string,
    defaultStyle: string,
    defaultLength: string,
    maxSuggestions: number
  }
}
```

**searches**
```
{
  userId: string,
  params: {
    inputType: string,
    inputText: string,
    tlds: string[],
    style: string,
    language: string,
    length: string,
    maxSuggestions: number
  },
  results: DomainResult[],
  createdAt: timestamp
}
```

**favorites**
```
{
  userId: string,
  domain: string,
  tld: string,
  fullDomain: string,
  sourceSearchId: string,
  notes: string,
  createdAt: timestamp
}
```

## Future Improvements

- [ ] Additional AI providers (Anthropic, Google Gemini)
- [ ] Premium subscription tiers
- [ ] Bulk domain export
- [ ] Price comparison across registrars
- [ ] Domain monitoring/alerts
- [ ] Team collaboration features

## Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Build**: Vite
- **Backend**: Firebase (Auth, Firestore)
- **AI**: OpenAI API (GPT-4)
- **Extension**: Chrome Manifest V3

## License

MIT License - see LICENSE file for details.

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## Support

For issues and feature requests, please use the GitHub issue tracker.
