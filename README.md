# 🎮 Lumina Tracker

A self-hosted game collection tracker with a premium dark UI. Manage your library across Steam, GOG, and other platforms with cover art from SteamGridDB.

![React](https://img.shields.io/badge/React-19-blue?logo=react)
![Vite](https://img.shields.io/badge/Vite-8-purple?logo=vite)
![Express](https://img.shields.io/badge/Express-5-black?logo=express)
![License](https://img.shields.io/badge/License-MIT-green)

## ✨ Features

- **Collection Management** — Add, edit, and delete games with title, developer, year, status, and comments
- **Cover Art** — Upload local images or search [SteamGridDB](https://www.steamgriddb.com/) with built-in crop tool (2:3 aspect ratio)
- **Multi-Platform Tracking** — Tag games with multiple platforms (Steam, GOG, PS5, etc.)
- **Tags & Collections** — Organize with custom tags and collections, all with autocomplete
- **Smart Filtering** — Filter by platform, tag, collection, status, or search by title/developer
- **Hidden Games** — Hide games from the main view without deleting them
- **Duplicate Detection** — Warns when adding a game that already exists
- **Steam Import** — Bulk import your Steam library with developer and year data
- **GOG Import** — Bulk import your GOG library
- **Infinite Scroll** — Handles 1000+ games smoothly with lazy loading
- **Responsive** — Works on desktop and mobile
- **Self-Hosted** — All data stored locally in a JSON file, no cloud dependency

## 📸 Screenshots

*Add your screenshots here*

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite 8 |
| Backend | Express 5, Node.js |
| Styling | Vanilla CSS (glassmorphism, dark theme) |
| Icons | Lucide React |
| Image Crop | react-easy-crop |
| Cover Art API | SteamGridDB |
| Data Storage | JSON file |

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ ([download](https://nodejs.org/))
- **pnpm** (recommended) or npm

```bash
# Install pnpm if you don't have it
npm install -g pnpm
```

### Installation

```bash
# Clone the repository
git clone https://github.com/vladimir-peshin/lumina-tracker.git
cd lumina-tracker

# Install dependencies
pnpm install

# Create your environment file
cp .env.example .env
```

### Configuration

Edit `.env` and add your API keys:

```env
# Required — for cover art search
STEAMGRIDDB_API_KEY=your_key_here

# Optional — for Steam library import
STEAM_API_KEY=your_key_here
STEAM_ID=your_steam_id_here

# Optional — for GOG library import
GOG_USERNAME=your_gog_username
```

**Where to get the keys:**

| Key | Where | Required |
|-----|-------|----------|
| `STEAMGRIDDB_API_KEY` | [SteamGridDB → Preferences → API](https://www.steamgriddb.com/profile/preferences/api) | ✅ Yes |
| `STEAM_API_KEY` | [Steam Web API Key](https://steamcommunity.com/dev/apikey) | ❌ Only for import |
| `STEAM_ID` | Your Steam profile → URL contains your 64-bit ID | ❌ Only for import |
| `GOG_USERNAME` | Your GOG public profile username | ❌ Only for import |

### Running

```bash
# Start both frontend and backend
pnpm start
```

This launches:
- **Frontend** → `http://localhost:5173` (Vite dev server)
- **Backend** → `http://localhost:3001` (Express API)

The browser will open automatically.

## 📦 Platform-Specific Notes

### macOS

```bash
# Install Node.js via Homebrew
brew install node

# Install pnpm
brew install pnpm

# Then follow the Quick Start above
```

### Windows

```powershell
# Option 1: Install Node.js from https://nodejs.org/
# Option 2: Using winget
winget install OpenJS.NodeJS

# Install pnpm
npm install -g pnpm

# Then follow the Quick Start above
```

> **Note:** If you encounter `EACCES` permission errors on Windows, run your terminal as Administrator.

### Linux (Ubuntu/Debian)

```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install pnpm
npm install -g pnpm

# Then follow the Quick Start above
```

### Linux (Arch)

```bash
sudo pacman -S nodejs npm
npm install -g pnpm
```

## 📥 Importing Game Libraries

### Steam Import

Imports all owned games from your Steam account (skips DLCs, soundtracks, etc.):

```bash
node scripts/import_steam.cjs
```

- Fetches game details (developer, year) from the Steam Store API
- Adds `Steam` platform tag to games that already exist
- Rate-limited to 1 request per 2 seconds to respect API limits
- Progress is saved after each game (safe to interrupt)

### GOG Import

Imports games from a public GOG profile:

```bash
node scripts/import_gog.cjs
```

- Requires your GOG profile to be public
- Adds `GOG` platform tag to duplicates

## 📁 Project Structure

```
lumina-tracker/
├── src/
│   ├── App.jsx          # Main app (grid, modal, filters)
│   ├── cropUtils.js     # Image cropping utility
│   ├── index.css        # All styles (design system)
│   └── main.jsx         # React entry point
├── scripts/
│   ├── import_steam.cjs # Steam library importer
│   └── import_gog.cjs   # GOG library importer
├── server.cjs           # Express backend (API + image proxy)
├── data.json            # Game collection data (created on first run)
├── public/covers/       # Saved cover art images
├── .env                 # Your API keys (git-ignored)
├── .env.example         # Template for .env
├── vite.config.js       # Vite config with API proxy
└── package.json
```

## 🔧 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/games` | List all games |
| `POST` | `/api/games` | Create a new game |
| `PUT` | `/api/games/:id` | Update a game |
| `DELETE` | `/api/games/:id` | Delete a game |
| `GET` | `/api/search-games?query=...` | Search SteamGridDB |
| `GET` | `/api/game-grids/:gameId` | Get cover art for a game |
| `GET` | `/api/proxy-image?url=...` | CORS proxy for images |

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
