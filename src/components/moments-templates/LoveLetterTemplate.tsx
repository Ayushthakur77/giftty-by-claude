import { motion } from "framer-motion";
import { FloatingHearts } from "./effects";

export function LoveLetterTemplate({ data, themeColor }: { data: Record<string, string>; themeColor: string }) {
  const photos = [data.photo_1, data.photo_2].filter(Boolean);

  return (
    <div
      className="relative min-h-screen flex flex-col items-center px-6 py-16 overflow-hidden"
      style={{ background: `linear-gradient(160deg, ${themeColor}, #2a0f1a)` }}
    >
      <FloatingHearts color="#ffffffaa" />

      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 180, damping: 14 }}
        className="text-5xl mb-6 relative z-10"
      >
        💌
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 30, rotateX: -15 }}
        animate={{ opacity: 1, y: 0, rotateX: 0 }}
        transition={{ delay: 0.3, duration: 0.7 }}
        className="relative z-10 bg-cream rounded-lg shadow-2xl px-6 py-8 md:px-10 md:py-12 max-w-lg w-full"
      >
        {data.recipient_name && (
          <p className="font-script text-2xl text-maroon mb-1">Dear {data.recipient_name},</p>
        )}
        {data.headline && (
          <h1 className="font-heading text-xl md:text-2xl font-bold text-gray-900 mb-4">{data.headline}</h1>
        )}
        {data.message && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.8 }}
            className="text-gray-700 leading-relaxed whitespace-pre-wrap mb-4"
          >
            {data.message}
          </motion.p>
        )}
        {data.signoff && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.3 }}
            className="font-script text-xl text-maroon text-right mt-6"
          >
            {data.signoff}
          </motion.p>
        )}
      </motion.div>

      {photos.length > 0 && (
        <div className="flex gap-4 justify-center mt-8 relative z-10">
          {photos.map((url, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.85, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: 1.6 + i * 0.2 }}
              className="w-32 h-32 md:w-40 md:h-40 rounded-lg overflow-hidden shadow-xl border-4 border-white/90"
            >
              <img src={url} alt="" className="w-full h-full object-cover" />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
