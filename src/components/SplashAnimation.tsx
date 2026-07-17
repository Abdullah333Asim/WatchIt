import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";

export default function SplashAnimation({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState<'start' | 'animate' | 'exit'>('start');
  const isAnim = phase === 'animate' || phase === 'exit';

  useEffect(() => {
    // 1. Initial pause so user reads "Watch AI"
    const t1 = setTimeout(() => setPhase('animate'), 800);
    // 2. Wait for animation to finish, then fade out screen
    const t2 = setTimeout(() => setPhase('exit'), 3500);
    // 3. Unmount completely
    const t3 = setTimeout(onComplete, 4000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onComplete]);

  return (
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
                initial={{ x: 136, opacity: 1 }}
                animate={{ 
                  x: isAnim ? 0 : 136, 
                  opacity: 1 
                }}
                transition={{ duration: 1.2, ease: "easeInOut" }}
              >
                {/* Crossfade A -> a */}
                <motion.span className="absolute bottom-0 left-0 text-red-500" initial={{ opacity: 1 }} animate={{ opacity: isAnim ? 0 : 1 }} transition={{ duration: 1.2, ease: "easeInOut" }}>A</motion.span>
                <motion.span className="absolute bottom-0 left-0 text-white" initial={{ opacity: 0 }} animate={{ opacity: isAnim ? 1 : 0 }} transition={{ duration: 1.2, ease: "easeInOut" }}>a</motion.span>
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

            <motion.span 
              layout 
              initial={{ color: "#ef4444" }} 
              animate={{ color: isAnim ? "#ffffff" : "#ef4444" }}
              transition={{ duration: 1.2, ease: "easeInOut" }}
            >
              I
            </motion.span>

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
  );
}