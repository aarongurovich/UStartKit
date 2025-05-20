import React, { useContext } from 'react';
import ProductCard from './ProductCard';
import LoadingAnimation from './LoadingAnimation';
import { ProductContext } from '../context/ProductContext';
import { motion } from 'framer-motion';

const ResultsDisplay: React.FC = () => {
  const { products, isLoading, error, searchTerm } = useContext(ProductContext);

  if (isLoading) {
    return <LoadingAnimation />;
  }

  if (error) {
    return (
      <motion.div 
        className="my-8 p-8 bg-red-50 rounded-2xl text-center"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <p className="text-red-600 mb-4">{error}</p>
        <button 
          className="px-6 py-3 bg-red-100 text-red-700 rounded-xl hover:bg-red-200 transition-colors"
          onClick={() => window.location.reload()}
        >
          Try Again
        </button>
      </motion.div>
    );
  }

  if (products.length === 0 && searchTerm) {
    return (
      <div className="my-8 text-center text-gray-500">
        <p>Enter your desired starter kit above and click search</p>
      </div>
    );
  }

  if (products.length === 0) {
    return null;
  }

  return (
    <motion.div 
      className="my-12"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 mb-8">
        Here's your personalized {searchTerm} starter kit:
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {products.map((product, index) => (
          <ProductCard key={index} product={product} index={index} />
        ))}
      </div>
    </motion.div>
  );
};

export default ResultsDisplay;