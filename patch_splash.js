import fs from 'fs';
let code = fs.readFileSync('src/components/SplashAnimation.tsx', 'utf-8');

// Change timings
code = code.replace(
  "const t2 = setTimeout(() => setPhase('exit'), 2500);",
  "const t2 = setTimeout(() => setPhase('exit'), 3500);"
);
code = code.replace(
  "const t3 = setTimeout(onComplete, 3000);",
  "const t3 = setTimeout(onComplete, 4000);"
);

// Fix layout and alignments
const newRender = `  return (
    <AnimatePresence>
      {phase !== 'exit' && (
        <motion.div 
          className="fixed inset-0 z-[100] bg-black flex items-center justify-center font-display font-bold text-6xl tracking-tighter text-white overflow-hidden"
          exit={{ opacity: 0, transition: { duration: 0.5 } }}
        >
          <div className="flex items-baseline">
            <motion.span layout>W</motion.span>
            
            <div className="relative flex items-baseline">
              <motion.span layout>a</motion.span>
              
              {/* THE 'A' MANEUVER */}
              <motion.div
                className="absolute bottom-0 flex items-baseline pointer-events-none origin-center"
                initial={{ x: 155, rotate: 0, opacity: 1 }}
                animate={{ 
                  x: isAnim ? 0 : 155, 
                  rotate: isAnim ? -360 : 0, 
                  opacity: isAnim ? 0 : 1 
                }}
                transition={{ duration: 1.2, ease: "easeInOut" }}
              >
                {/* Crossfade A -> a */}
                <motion.span className="absolute bottom-0 left-0" animate={{ opacity: isAnim ? 0 : 1 }} transition={{ duration: 0.6 }}>A</motion.span>
                <motion.span className="absolute bottom-0 left-0" animate={{ opacity: isAnim ? 1 : 0 }} transition={{ duration: 0.6 }}>a</motion.span>
              </motion.div>
            </div>

            <motion.span layout>t</motion.span>
            <motion.span layout>c</motion.span>
            <motion.span layout>h</motion.span>

            {/* Space and 'A' placeholder that shrinks to 0 */}
            <AnimatePresence>
              {!isAnim && (
                <motion.span 
                  layout 
                  exit={{ width: 0, opacity: 0, margin: 0 }} 
                  transition={{ duration: 1.2, ease: "easeInOut" }}
                  className="opacity-0 overflow-hidden whitespace-nowrap ml-4"
                >
                  A
                </motion.span>
              )}
            </AnimatePresence>

            <motion.span layout transition={{ duration: 1.2, ease: "easeInOut" }}>I</motion.span>

            {/* THE 't' DUPLICATION */}
            <AnimatePresence>
              {isAnim && (
                <motion.span 
                  layout 
                  initial={{ x: -140, opacity: 0 }} 
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ duration: 1.2, ease: "easeInOut" }}
                >
                  t
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );`;

code = code.replace(/  return \([\s\S]*\);\n}/, newRender + '\n}');

fs.writeFileSync('src/components/SplashAnimation.tsx', code);
