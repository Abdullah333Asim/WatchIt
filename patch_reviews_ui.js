import fs from 'fs';

let code = fs.readFileSync('src/components/SwipeView.tsx', 'utf-8');

const updatedReviewsComponent = `
function MovieReviews({ movieId }: { movieId: string }) {
  const [reviews, setReviews] = useState<{author: string, content: string}[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    fetch(\`/api/movies/\${movieId}/reviews\`)
      .then(res => res.json())
      .then(data => {
        if (isMounted) {
          setReviews(data || []);
          setLoading(false);
        }
      })
      .catch(err => {
        console.error("Failed to fetch reviews", err);
        if (isMounted) {
          setReviews([]);
          setLoading(false);
        }
      });
    return () => { isMounted = false; };
  }, [movieId]);

  if (loading) {
    return (
      <div className="space-y-4 mt-8 border-t border-white/10 pt-6">
        <h3 className="text-xs font-bold tracking-widest text-white/50 uppercase">User Reviews</h3>
        <div className="animate-pulse space-y-3">
          <div className="h-3 bg-white/10 rounded w-1/4"></div>
          <div className="h-8 bg-white/10 rounded w-full"></div>
          <div className="h-3 bg-white/10 rounded w-1/4 mt-4"></div>
          <div className="h-8 bg-white/10 rounded w-full"></div>
        </div>
      </div>
    );
  }

  if (reviews.length === 0) return null;

  return (
    <div className="space-y-4 mt-8 border-t border-white/10 pt-6">
      <h3 className="text-xs font-bold tracking-widest text-white/50 uppercase">User Reviews</h3>
      <div className="space-y-4">
        {reviews.map((r, i) => (
          <div key={i} className="bg-white/5 p-4 rounded-xl border border-white/5">
            <div className="text-xs font-bold text-white mb-1.5">{r.author}</div>
            <p className="text-sm text-white/70 italic">"{r.content}"</p>
          </div>
        ))}
      </div>
    </div>
  );
}
`;

// Simple replacement for the whole function MovieReviews
const startIdx = code.indexOf('function MovieReviews');
if (startIdx !== -1) {
    code = code.substring(0, startIdx) + updatedReviewsComponent;
    fs.writeFileSync('src/components/SwipeView.tsx', code);
} else {
    console.log("Could not find MovieReviews in SwipeView.tsx");
}
