import fs from 'fs';

let code = fs.readFileSync('src/components/ProfileView.tsx', 'utf-8');

code = code.replace(
  'import { fetchWithUser } from "../lib/api";',
  'import { fetchWithUser } from "../lib/api";\nimport { logout } from "../lib/firebase.ts";'
);

code = code.replace(
  /onClick=\{\(\) => \{ localStorage\.removeItem\("userId"\); window\.location\.reload\(\); \}\}/,
  'onClick={async () => { await logout(); window.location.reload(); }}'
);

fs.writeFileSync('src/components/ProfileView.tsx', code);
