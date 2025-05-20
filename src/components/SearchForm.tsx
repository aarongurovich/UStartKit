import React, { useContext, useState, useCallback } from 'react';
import { Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { searchAmazonProducts } from '../services/api';
import { ProductContext } from '../context/ProductContext';

const COOLDOWN_PERIOD = 2000; // 2 seconds cooldown between searches

const SearchForm: React.FC = () => {
  const { 
    searchTerm, 
    setSearchTerm, 
    setProducts, 
    setIsLoading, 
    setError 
  } = useContext(ProductContext);
  const [lastSearchTime, setLastSearchTime] = useState<number>(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    const now = Date.now();
    const timeSinceLastSearch = now - lastSearchTime;
    
    if (timeSinceLastSearch < COOLDOWN_PERIOD) {
      setError(`Please wait ${Math.ceil((COOLDOWN_PERIOD - timeSinceLastSearch) / 1000)} seconds before searching again.`);
      return;
    }
    
    setIsLoading(true);
    setError('');
    setProducts([]);
    setLastSearchTime(now);
    
    try {
      const results = await searchAmazonProducts(searchTerm);
      if (results.length === 0) {
        setError('No products found. Please try a different search term.');
      } else if (results.length < 5) {
        setError(`Only ${results.length} products found. Try using more general search terms for better results.`);
        setProducts(results); // Still show the products we found
      } else {
        setProducts(results);
      }
    } catch (error) {
      let errorMessage = error instanceof Error ? error.message : 'Something went wrong. Please try again.';
      
      // Handle specific error cases
      if (errorMessage.includes('429')) {
        errorMessage = 'We\'re experiencing high traffic. Please try again in a few moments.';
      } else if (errorMessage.includes('Insufficient products')) {
        errorMessage = 'Not enough products found. Try using more general search terms or a different category.';
      }
      
      setError(errorMessage);
      console.error('Error searching products:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.form 
      onSubmit={handleSubmit} 
      className="relative"
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="relative group">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl blur-xl opacity-20 group-hover:opacity-30 transition-opacity"></div>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="What starter kit are you looking for?"
          className="w-full py-7 px-8 pr-16 text-xl bg-gray-900/50 text-white placeholder-gray-400 border border-gray-700/50 rounded-2xl shadow-sm backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition-all hover:shadow-lg hover:shadow-indigo-500/10"
          required
        />
        <button
          type="submit"
          className="absolute right-4 top-1/2 -translate-y-1/2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white p-4 rounded-xl hover:shadow-lg hover:shadow-indigo-500/20 hover:scale-105 transform transition-all duration-200"
          aria-label="Search"
        >
          <Search className="h-6 w-6" />
        </button>
      </div>
    </motion.form>
  );
};

export default SearchForm;