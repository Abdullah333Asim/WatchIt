# Assignment 1: Observability Report

## Part A: Your Project

**The Problem:** 
Finding the right movie is often overwhelming due to endless scrolling on streaming platforms, fragmented watchlists, and generic recommendations that fail to account for a user's specific viewing history. 

**Intended Users:** 
Movie enthusiasts and casual viewers who want an interactive, streamlined way to discover new films, manage their personal watchlists, and receive highly personalized curation.

**The Solution:** 
WatchIt is a premium, AI-powered movie recommendation and discovery Single Page Application (SPA). It provides an interactive, Tinder-style swiping interface allowing users to categorize movies as Watched, Watchlist, Pass, or Ignore. The core feature is "Cine Noir," a sophisticated AI chat assistant powered by a high-concurrency race between Gemini, Groq, and Cerebras APIs. The AI acts as a virtual film curator, analyzing the user's PostgreSQL database of swiped movies to deliver rapid, contextual recommendations. 

**What Works:** 
The interactive swipe matcher (including desktop keyboard navigation), dynamic TMDB metadata backfilling, personalized dashboard filtering, Firebase authentication, and the full AI chat curator are fully functional and integrated with the Drizzle ORM/PostgreSQL backend.

**How to Try It:** 
The live production build is deployed at: https://watchit.up.railway.app/

To run the observability environment locally for this assignment:
1. Clone the repository and switch to the `assignment-1-observability` branch.
2. Run `npm install` to install frontend (React/Vite) and backend (Node.js/Express) dependencies.
3. Configure your local `.env` file with your PostgreSQL connection string and required API keys (TMDB, Gemini/Groq/Cerebras).
4. Start the application servers using `npm run dev`.
5. Start the local monitoring infrastructure by running `docker compose up -d` to spin up Prometheus and Grafana.