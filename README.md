# WatchIt 🎬 — AI-Powered Movie Recommendation & Discovery App

WatchIt is a premium, highly responsive Vite/React Single Page Application designed to simplify movie discovery. Users can interactively swipe through recommendations, chat with a highly sophisticated AI movie curator, build watchlists, and manage their cinematic profile.

The live application is deployed at: **[https://watchit.up.railway.app/](https://watchit.up.railway.app/)**

---

## 🌟 Key Features

* **Interactive Swipe Matcher**: A fluid, Tinder-style card interface to categorize movies as *Watched*, *Watchlist*, *Pass*, or *Ignore*. Fully supports desktop keyboard navigation (`W`/`A`/`S`/`D` or arrow keys).
* **Cine Noir AI Chat Assistant**: Speak with *Cine Noir*, a sophisticated film curator operating in a virtual dark theater lobby. Powered by a high-concurrency race between Gemini, Groq, and Cerebras API nodes for rapid response delivery.
* **Metadata Backfilling**: Integrates directly with the TMDB API to dynamically fetch missing poster paths, rating averages, runtimes, and year indicators on demand.
* **Personalized Dashboard & Filtering**: Seamless list management for Watched and Watchlist items with search filters for release year, genre tags, and star ratings.
* **Premium Accent Themes**: The application dynamically extracts the dominant color from current movie poster cards to generate atmospheric, ambient background glow transitions.
* **Technical SEO & Social Link Unfurling**: Pre-configured with complete Open Graph (OG) and Twitter Card tags optimized for high-quality preview cards on WhatsApp, Discord, Twitter/X, and Facebook.

---

## 🛠️ Technology Stack

* **Frontend**: React 19, Vite, Tailwind CSS, Motion (Framer Motion), Lucide React.
* **Backend**: Node.js, Express, TypeScript (`tsx`).
* **Database & ORM**: PostgreSQL, Drizzle ORM.
* **Authentication**: Firebase Authentication (Google OAuth) with a secure guest account fallback option.
* **APIs**:
  * TMDB API (Movie Metadata and Imagery)
  * Google Gemini API (`gemini-3-flash-preview`)
  * Groq API (`llama-3.3-70b-versatile`)
  * Cerebras Cloud SDK (`llama3.1-70b`)

---