import fs from 'fs';
let code = fs.readFileSync('src/components/ChatView.tsx', 'utf-8');

const oldMessageContent = `const MessageContent = ({ content }: { content: string }) => {
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  const handleAddWatchlist = async (movieId: string) => {`;
  
const newMessageContent = `const MessageContent = ({ content }: { content: string }) => {
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const checkWatchlist = async () => {
      try {
        const res = await fetchWithUser('/api/profile');
        if (res.ok) {
          const data = await res.json();
          const watchlistIds = data.history
            .filter((item: any) => item.action === 'Watchlist' || item.action === 'Watched')
            .map((item: any) => item.id);
          setAddedIds(new Set(watchlistIds));
        }
      } catch (e) {}
    };
    checkWatchlist();
  }, []);

  const handleAddWatchlist = async (movieId: string) => {`;

code = code.replace(oldMessageContent, newMessageContent);
fs.writeFileSync('src/components/ChatView.tsx', code);
