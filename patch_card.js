import fs from 'fs';
let code = fs.readFileSync('src/components/SwipeView.tsx', 'utf-8');

// Update Card props
code = code.replace(
  'function Card({ movie, onSwipe, onColorExtracted, onClick }: { movie: Movie, onSwipe: (action: \'Watched\' | \'Pass\' | \'Watchlist\' | \'Not Interested\') => void, onColorExtracted: (color: string) => void, onClick?: () => void }) {',
  'function Card({ movie, onSwipe, onColorExtracted, onClick, isActive = true }: { movie: Movie, onSwipe: (action: \'Watched\' | \'Pass\' | \'Watchlist\' | \'Not Interested\') => void, onColorExtracted: (color: string) => void, onClick?: () => void, isActive?: boolean }) {'
);

// Add useEffect for keyboard
const useEffectToInject = `  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = async (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (isDragging.current) return;

      let action: 'Watched' | 'Pass' | 'Watchlist' | 'Not Interested' | null = null;
      let targetX = 0;
      let targetY = 0;

      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          action = 'Not Interested';
          targetY = 1000;
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          action = 'Watchlist';
          targetY = -1000;
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          action = 'Pass';
          targetX = -1000;
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          action = 'Watched';
          targetX = 1000;
          break;
        default:
          return;
      }

      e.preventDefault();
      isDragging.current = true;
      await controls.start({ x: targetX, y: targetY, transition: { duration: 0.3 } });
      onSwipe(action);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, onSwipe, controls]);`;

code = code.replace(
  '  const isDragging = useRef(false);\n\n  useEffect(() => {',
  '  const isDragging = useRef(false);\n\n' + useEffectToInject + '\n\n  useEffect(() => {'
);

// Update SwipeView's render of Card
code = code.replace(
  '          onClick={() => setSelectedMovie(movie)}\n        />',
  '          onClick={() => setSelectedMovie(movie)}\n          isActive={!selectedMovie}\n        />'
);

fs.writeFileSync('src/components/SwipeView.tsx', code);
