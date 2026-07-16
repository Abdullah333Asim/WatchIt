import fs from 'fs';
let code = fs.readFileSync('src/components/ChatView.tsx', 'utf-8');

// Replace the old MessageContent definition and add watchlistIds prop
code = code.replace(
  `const MessageContent = ({ content }: { content: string }) => {
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

  const handleAddWatchlist = async (movieId: string) => {`,
  `const MessageContent = ({ content, existingWatchlistIds }: { content: string, existingWatchlistIds: Set<string> }) => {
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setAddedIds(new Set(existingWatchlistIds));
  }, [existingWatchlistIds]);

  const handleAddWatchlist = async (movieId: string) => {`
);

// Add watchlist state to ChatView
code = code.replace(
  `export default function ChatView({ onSidebarToggle }: { onSidebarToggle?: (isOpen: boolean) => void }) {
  const [messages, setMessages] = useState<Message[]>([]);`,
  `export default function ChatView({ onSidebarToggle }: { onSidebarToggle?: (isOpen: boolean) => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [watchlistIds, setWatchlistIds] = useState<Set<string>>(new Set());`
);

// Fetch watchlist in ChatView's fetchConversations or a new useEffect
code = code.replace(
  `  useEffect(() => {
    fetchConversations();
  }, []);`,
  `  useEffect(() => {
    fetchConversations();
    fetchWatchlist();
  }, []);

  const fetchWatchlist = async () => {
    try {
      const res = await fetchWithUser('/api/profile');
      if (res.ok) {
        const data = await res.json();
        const ids = data.history
          .filter((item: any) => item.action === 'Watchlist' || item.action === 'Watched')
          .map((item: any) => item.id);
        setWatchlistIds(new Set(ids));
      }
    } catch (e) {}
  };`
);

// Also pass watchlistIds to MessageContent
code = code.replace(
  `<MessageContent content={msg.content} />`,
  `<MessageContent content={msg.content} existingWatchlistIds={watchlistIds} />`
);

fs.writeFileSync('src/components/ChatView.tsx', code);
