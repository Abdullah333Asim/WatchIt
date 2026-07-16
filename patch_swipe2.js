import fs from 'fs';
let code = fs.readFileSync('src/components/SwipeView.tsx', 'utf-8');

const oldEffect = `  useEffect(() => {
    cachedCurrentIndex = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    cachedPage = page;
  }, [page]);

  useEffect(() => {
    if (initialFetched && movies.length > 0 && page === cachedPage && !loading) {
      // Don't refetch on mount if already fetched
      return;
    }
    fetchMovies(page);
  }, [page]);`;

const newEffect = `  const lastFetchedPage = useRef(initialFetched ? cachedPage : 0);

  useEffect(() => {
    cachedCurrentIndex = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    cachedPage = page;
    if (page === lastFetchedPage.current) {
      return;
    }
    lastFetchedPage.current = page;
    fetchMovies(page);
  }, [page]);`;

code = code.replace(oldEffect, newEffect);
fs.writeFileSync('src/components/SwipeView.tsx', code);
