import { motion } from "framer-motion";
import { ConfettiBackground } from "./effects";

export function BirthdayTemplate({ data, themeColor }: { data: Record<string, string>; themeColor: string }) {
  const photos = [data.photo_1, data.photo_2, data.photo_3].filter(Boolean);

  return (
    <div
      className="relative min-h-screen flex flex-col items-center justify-center px-6 py-16 text-center overflow-hidden"
      style={{ background: `linear-gradient(160deg, ${themeColor}, #1a0a12)` }}
    >
      <ConfettiBackground color={themeColor} />

      <motion.div
        initial={{ scale: 0, rotate: -10 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 12, delay: 0.1 }}
        className="text-6xl mb-4 relative z-10"
      >
        🎂
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.6 }}
        className="font-heading text-3xl md:text-5xl font-bold text-white mb-2 relative z-10"
      >
        {data.headline || "Happy Birthday!"}
      </motion.h1>

      {data.recipient_name && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="text-xl text-white/80 mb-8 relative z-10"
        >
          for {data.recipient_name} 🎈
        </motion.p>
      )}

      {data.message && (
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.6 }}
          className="max-w-lg text-white/90 leading-relaxed whitespace-pre-wrap mb-10 relative z-10"
        >
          {data.message}
        </motion.p>
      )}

      {photos.length > 0 && (
        <div className="flex flex-wrap gap-3 justify-center relative z-10 max-w-lg">
          {photos.map((url, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.8, rotate: i % 2 === 0 ? -6 : 6 }}
              animate={{ opacity: 1, scale: 1, rotate: i % 2 === 0 ? -4 : 4 }}
              transition={{ delay: 1.3 + i * 0.2, type: "spring", stiffness: 150 }}
              className="w-28 h-28 md:w-36 md:h-36 rounded-lg overflow-hidden shadow-xl border-4 border-white/90"
            >
              <img src={url} alt="" className="w-full h-full object-cover" />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
