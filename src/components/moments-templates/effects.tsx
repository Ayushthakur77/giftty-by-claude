import { motion } from "framer-motion";
import { useMemo } from "react";

/** Gently falling confetti pieces — used behind birthday/festival templates. */
export function ConfettiBackground({ color }: { color: string }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: 24 }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 2,
        duration: 4 + Math.random() * 3,
        size: 6 + Math.random() * 6,
        rotate: Math.random() * 360,
        emoji: ["🎉", "🎊", "✨"][i % 3],
      })),
    []
  );
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden z-0" aria-hidden>
      {pieces.map((p) => (
        <motion.span
          key={p.id}
          className="absolute select-none"
          style={{ left: `${p.left}%`, top: -20, fontSize: p.size * 2 }}
          initial={{ y: -40, opacity: 0, rotate: 0 }}
          animate={{ y: "110vh", opacity: [0, 1, 1, 0], rotate: p.rotate }}
          transition={{ delay: p.delay, duration: p.duration, repeat: Infinity, ease: "linear" }}
        >
          {p.emoji}
        </motion.span>
      ))}
    </div>
  );
}

/** Slowly rising, fading hearts — used behind romantic templates. */
export function FloatingHearts({ color }: { color: string }) {
  const hearts = useMemo(
    () =>
      Array.from({ length: 16 }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 3,
        duration: 5 + Math.random() * 4,
        size: 14 + Math.random() * 18,
      })),
    []
  );
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden z-0" aria-hidden>
      {hearts.map((h) => (
        <motion.span
          key={h.id}
          className="absolute select-none"
          style={{ left: `${h.left}%`, bottom: -40, fontSize: h.size, color }}
          initial={{ y: 0, opacity: 0 }}
          animate={{ y: "-110vh", opacity: [0, 0.8, 0.8, 0] }}
          transition={{ delay: h.delay, duration: h.duration, repeat: Infinity, ease: "linear" }}
        >
          ❤
        </motion.span>
      ))}
    </div>
  );
}
