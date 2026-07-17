import fs from 'fs';
let code = fs.readFileSync('src/components/SplashAnimation.tsx', 'utf-8');

code = code.replace(/x: 155/g, 'x: 145');

fs.writeFileSync('src/components/SplashAnimation.tsx', code);
