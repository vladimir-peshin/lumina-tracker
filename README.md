# Lumina Tracker v2

A minimalist, high-performance video game collection tracker built with **Svelte 5**, **Bun**, and **SQLite**.

<img width="400" alt="list of games" src="https://github.com/user-attachments/assets/082d8c8f-e0ee-4aab-930d-3add87942ab1" />
<img width="400" alt="Screenshot 2026-04-07 at 18 41 46" src="https://github.com/user-attachments/assets/8d7509a6-4f3c-40e1-a701-8442ed1d4d44" />




## 🚀 Features

-   **Svelte 5 Runes**: Modern reactivity for a snappy UI.
-   **Local-First Store**: Uses **SQLite** via `bun:sqlite` for lightning-fast data operations and easy portability.
-   **Steam & GOG Sync**: Library import and metadata synchronization.
-   **SteamGridDB Integration**: Automated high-quality cover art fetching and cropping.
-   **Infinite Scrolling**: Smoothly renders thousands of games.
-   **Zero-Dependency Build**: Optimized production bundle tailored for **Bun**.

## 🛠️ Tech Stack

-   **Framework**: [SvelteKit](https://svelte.dev/) (SPA Mode)
-   **Runtime**: [Bun](https://bun.sh/)
-   **Database**: [SQLite](https://www.sqlite.org/)
-   **Icons**: [Lucide Svelte](https://lucide.dev/)
-   **Image Processing**: [Svelte Easy Crop](https://github.com/valentin-p/svelte-easy-crop)

## 📦 Setup

1.  **Install Bun**:
    ```bash
    curl -fsSL https://bun.sh/install | bash
    ```

2.  **Clone & Install**:
    ```bash
    git clone https://github.com/vladimir-peshin/lumina-tracker.git
    cd game-tracker
    bun install
    ```

3.  **Environment Variables**:
    Create a `.env` file based on `.env.example`:
    ```env
    # Steam
    STEAM_API_KEY=your_key
    STEAM_ID=your_id

    # GOG
    GOG_USERNAME=your_username

    # SteamGridDB (Optional but recommended for covers)
    STEAMGRIDDB_API_KEY=your_key
    ```

4.  **Run Development Server**:
    ```bash
    bun --bun run dev
    ```

## 🔄 Synchronization

To sync your library from Steam or GOG, run the following scripts from the root directory:

```bash
# Sync Steam Library
bun scripts/import_steam.js

# Sync GOG Library
bun scripts/import_gog.js

# Fix Metadata (Historical fixes)
bun scripts/fix_steam_metadata.js
bun scripts/fix_gog_metadata.js
```

## 🏗️ Production Build

To build and run the optimized production version:

```bash
bun run build
bun build/index.js
```

---

*Lumina Tracker is designed for those who value speed, simplicity, and total control over their collection data.*
