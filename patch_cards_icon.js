import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const cardsIconCode = `
function CardsIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="7" y="5" width="10" height="14" rx="2" transform="rotate(-15 12 19)" />
      <rect x="7" y="5" width="10" height="14" rx="2" transform="rotate(15 12 19)" />
      <rect x="7" y="5" width="10" height="14" rx="2" fill="#1c1b1b" />
    </svg>
  );
}
`;

if (!code.includes('function CardsIcon')) {
    code = code + '\n' + cardsIconCode;
}

code = code.replace(
    'icon={<LayoutGrid className="w-[18px] h-[18px] flex-shrink-0" />}',
    'icon={<CardsIcon className="w-[18px] h-[18px] flex-shrink-0" />}'
);

fs.writeFileSync('src/App.tsx', code);
