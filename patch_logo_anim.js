import fs from 'fs';
let code = fs.readFileSync('src/components/LogoAnimation.tsx', 'utf-8');

const correctCode = `import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";

export default function LogoAnimation({ trigger }: { trigger: number }) {
  const [isAnim, setIsAnim] = useState(true);
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    
    if (trigger > 1) {
      setIsAnim(false);
      const t = setTimeout(() => {
        setIsAnim(true);
      }, 1200); // Wait 1.2s then go back to WatchIt
      return () => clearTimeout(t);
    }
  }, [trigger]);

  return (
    <div className="flex items-baseline font-display font-bold text-2xl tracking-tighter text-white drop-shadow-lg">
      <motion.span layout>W</motion.span>
      
      <div className="relative flex items-baseline">
        <motion.span layout>a</motion.span>
        
        {/* THE 'A' MANEUVER */}
        <motion.div
          className="absolute bottom-0 flex items-baseline pointer-events-none origin-center"
          initial={false}
          animate={{ 
            x: isAnim ? 0 : 54, 
            opacity: 1 
          }}
          transition={{ duration: 1.2, ease: "easeInOut" }}
        >
          {/* Crossfade A -> a */}
          <motion.span className="absolute bottom-0 left-0 text-red-500" initial={false} animate={{ opacity: isAnim ? 0 : 1 }} transition={{ duration: 1.2, ease: "easeInOut" }}>A</motion.span>
          <motion.span className="absolute bottom-0 left-0 text-white" initial={false} animate={{ opacity: isAnim ? 1 : 0 }} transition={{ duration: 1.2, ease: "easeInOut" }}>a</motion.span>
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
            initial={{ width: 0, opacity: 0, margin: 0 }}
            animate={{ width: "auto", opacity: 0, marginLeft: "0.375rem" }} /* 0.375rem = ml-1.5 */
            exit={{ width: 0, opacity: 0, margin: 0 }} 
            transition={{ duration: 1.2, ease: "easeInOut" }}
            className="overflow-hidden whitespace-nowrap"
          >
            A
          </motion.span>
        )}
      </AnimatePresence>

      <motion.span 
        layout 
        initial={false}
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
            initial={{ x: -56, opacity: 0 }} 
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -56, opacity: 0 }}
            transition={{ duration: 1.2, ease: "easeInOut" }}
          >
            t
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}
`;

fs.writeFileSync('src/components/LogoAnimation.tsx', correctCode);
