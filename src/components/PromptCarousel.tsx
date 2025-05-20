import React, { useState, useEffect, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ProductContext } from '../context/ProductContext';

const examplePrompts = [
  "Travel starter kit for Europe",
  "Dorm room essentials for college",
  "Beginner cooking set for new chefs",
  "Podcast starter pack for beginners",
  "Home office setup essentials",
  "Hiking gear for beginners",
  "Photography starter kit",
  "Plant parent starter pack",
  "Gaming setup for streamers",
  "Art supplies for beginners",
  "Meditation and mindfulness kit",
  "Home barista coffee setup",
  "Camping essentials for beginners",
  "Gardening starter kit",
  "Yoga beginner equipment",
  "Baking essentials kit",
  "DIY tool set for beginners",
  "Music production starter pack",
  "Rock climbing gear basics",
  "Sewing starter kit"
];

const PromptCarousel: React.FC = () => {
  const [displayPrompts, setDisplayPrompts] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const { setSearchTerm } = useContext(ProductContext);

  // Shuffle array using Fisher-Yates algorithm
  const shuffleArray = (array: string[]) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // Initialize with shuffled prompts
  useEffect(() => {
    setDisplayPrompts(shuffleArray(examplePrompts));
  }, []);

  // Rotate through prompts
  useEffect(() => {
    if (displayPrompts.length === 0) return;

    const interval = setInterval(() => {
      setActiveIndex((current) => {
        const next = (current + 1) % displayPrompts.length;
        // Reshuffle when we reach the end
        if (next === 0) {
          setDisplayPrompts(shuffleArray(examplePrompts));
        }
        return next;
      });
    }, 3000);
    
    return () => clearInterval(interval);
  }, [displayPrompts]);

  const handlePromptClick = (prompt: string) => {
    setSearchTerm(prompt);
  };

  if (displayPrompts.length === 0) return null;

  return (
    <div className="relative mt-12">
      <div className="relative h-24 flex items-center justify-center overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeIndex}
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -40, opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="absolute w-full text-center cursor-pointer"
            onClick={() => handlePromptClick(displayPrompts[activeIndex])}
          >
            <p className="text-xl font-medium bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent hover:scale-105 transform transition-transform">
              "{displayPrompts[activeIndex]}"
            </p>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default PromptCarousel;