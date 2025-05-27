import React from 'react';
import SearchForm from './SearchForm';
import PromptCarousel from './PromptCarousel';
import { Package } from 'lucide-react';
import { motion } from 'framer-motion';

const SearchPage: React.FC = () => {
  return (
    <main className="flex-1 container mx-auto px-4 py-24 max-w-2xl flex flex-col items-center justify-center min-h-screen">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-16"
      >
        <div className="flex items-center justify-center gap-4 mb-8">
          <Package className="h-16 w-16 text-gradient from-indigo-400 to-purple-400" />
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            UStartKit
          </h1>
        </div>
        <p className="text-2xl text-gray-400 max-w-lg mx-auto">
          Generate AI-Powered starter kits for any hobby, activity, or interest
        </p>
      </motion.div>
      <div className="w-full max-w-2xl mx-auto">
        <SearchForm />
        <PromptCarousel />
      </div>
    </main>
  );
};

export default SearchPage;