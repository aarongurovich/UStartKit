import React, { useState, useEffect, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ProductContext } from '../context/ProductContext';

const loadingMessages = [
  "Analyzing your requirements...",
  "Searching for the perfect items...",
  "Comparing product ratings...",
  "Finding the best value options...",
  "Organizing products by tier...",
  "Checking customer reviews...",
  "Curating your personalized kit...",
  "Ensuring quality selections...",
  "Almost ready with your kit...",
];

const LoadingPage: React.FC = () => {
  const [messageIndex, setMessageIndex] = useState(0);
  const { searchTerm } = useContext(ProductContext);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((current) => (current + 1) % loadingMessages.length);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <main className="fixed inset-0 flex items-center justify-center">
      <motion.div 
        className="text-center px-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="relative inline-flex items-center justify-center mb-8">
          <div className="w-20 h-20 rounded-full border-4 border-gray-800"></div>
          <motion.div 
            className="absolute inset-0 w-20 h-20 rounded-full border-4 border-transparent border-t-indigo-400"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          ></motion.div>
        </div>
        
        <div className="h-24 flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={messageIndex}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="text-center"
            >
              <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent mb-4">
                {loadingMessages[messageIndex]}
              </h2>
              <p className="text-gray-400">
                Building your perfect {searchTerm} starter kit
              </p>
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </main>
  );
};

export default LoadingPage;