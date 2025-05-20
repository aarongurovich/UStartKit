import React from 'react';
import { motion } from 'framer-motion';

const LoadingAnimation: React.FC = () => {
  return (
    <motion.div 
      className="my-16 flex flex-col items-center justify-center"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="relative">
        <div className="w-16 h-16 rounded-full border-4 border-gray-800"></div>
        <motion.div 
          className="absolute top-0 left-0 w-16 h-16 rounded-full border-4 border-transparent border-t-indigo-400"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        ></motion.div>
      </div>
      <motion.p 
        className="mt-6 text-lg text-gray-400"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        Curating your perfect starter kit...
      </motion.p>
    </motion.div>
  );
};

export default LoadingAnimation;