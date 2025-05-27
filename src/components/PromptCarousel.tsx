import React, { useState, useEffect, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ProductContext } from '../context/ProductContext';

const examplePrompts = [
  "International travel essentials",
  "College dorm room setup",
  "Beginner's kitchen essentials",
  "Equipment for starting a podcast",
  "Work-from-home office setup",
  "Essential gear for beginner hikers",
  "Getting started with digital photography",
  "Supplies for new houseplant enthusiasts",
  "Building an aspiring streamer's setup",
  "Art supplies for beginner painters and drawers",
  "Essentials for starting a meditation practice",
  "Creating a home coffee brewing station",
  "Gear for a first-time camper",
  "Supplies for starting a home vegetable garden",
  "What a beginner needs for yoga",
  "Essential tools for amateur bakers",
  "Tools for basic DIY home repairs",
  "Setting up a home music recording studio",
  "Gear for learning rock climbing",
  "Supplies for starting sewing and crafts"
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