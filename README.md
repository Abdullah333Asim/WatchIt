# WatchIt 🎬 — AI-Powered Movie Recommendation & Discovery App

WatchIt is a premium, highly responsive Vite/React Single Page Application designed to simplify movie discovery. Users can interactively swipe through recommendations, chat with a highly sophisticated AI movie curator, build watchlists, and manage their cinematic profile.

The live application is deployed at: **https://watch-it-rn.vercel.app/**

---

## 🌟 Key Features

* **Interactive Swipe Matcher**: A fluid, doom-scrolling card interface to categorize movies as *Watched*, *Watchlist*, *Pass*, or *Ignore*.
* **Cine Noir AI Chat Assistant**: Speak with *Cine Noir*, a sophisticated film curator.
* **Metadata Backfilling**: Integrates directly with the TMDB API to dynamically fetch movie synopsis, rating averages, runtimes, year indicators, and reviews on demand.
* **Personalized Dashboard & Filtering**: Seamless list management for Watched and Watchlist items with search filters for release year, genre tags, and star ratings.
* **Premium Accent Themes**: The application dynamically extracts the dominant color from current movie poster cards to generate atmospheric, ambient background glow transitions.

---

## 🛠️ Technology Stack

* **Frontend**: React 19, Vite, Tailwind CSS, Motion (Framer Motion), Lucide React.
* **Backend**: Node.js, Express, TypeScript (`tsx`).
* **Database & ORM**: PostgreSQL, Drizzle ORM.
* **Authentication**: Firebase Authentication (Google OAuth) with a secure guest account fallback option.
* **APIs**:
  * TMDB API (Movie Metadata and Imagery)
  * Google Gemini API (`gemini-3.8-flash`)
  * OpenRouter API (`meta-llama/llama-3.1-8b-instruct`)

---
