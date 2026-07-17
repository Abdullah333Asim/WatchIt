import fs from 'fs';

let code = fs.readFileSync('src/components/SwipeView.tsx', 'utf-8');

const reviewsComponent = `
function MovieReviews({ movieId }: { movieId: string }) {
  const [reviews, setReviews] = useState<{author: string, content: string}[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    // Simulate network request so it doesn't block UI
    setTimeout(() => {
      if (isMounted) {
        setReviews([
          { author: "MovieFan99", content: "Absolutely loved this! The cinematography was stunning." },
          { author: "CriticJoe", content: "A bit slow in the second act, but overall a solid experience." }
        ]);
        setLoading(false);
      }
    }, 600);
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

if (!code.includes('function MovieReviews')) {
    code = code + '\n' + reviewsComponent;
}

code = code.replace(
    '<h2 className="text-3xl font-display font-bold text-white leading-tight">{selectedMovie.title}</h2>',
    '<h2 className="text-2xl font-display font-bold text-white leading-tight">{selectedMovie.title}</h2>'
);

code = code.replace(
    '<div className="flex flex-wrap items-center gap-2 mb-6 text-sm text-[#c9c6c5] font-medium">',
    '<div className="flex flex-wrap items-center gap-2 mb-6 text-xs text-[#c9c6c5] font-medium">'
);

code = code.replace(
    '<h3 className="text-sm font-bold tracking-widest text-white/50 uppercase">Synopsis</h3>',
    '<h3 className="text-xs font-bold tracking-widest text-white/50 uppercase">Synopsis</h3>'
);

code = code.replace(
    '<p className="text-white/80 leading-relaxed">',
    '<p className="text-sm text-white/80 leading-relaxed">'
);

// Insert MovieReviews
if (!code.includes('<MovieReviews movieId={selectedMovie.id} />')) {
    code = code.replace(
        '</p>\n                </div>\n              </div>',
        '</p>\n                </div>\n                <MovieReviews movieId={selectedMovie.id} />\n              </div>'
    );
}

fs.writeFileSync('src/components/SwipeView.tsx', code);
