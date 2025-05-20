import React, { useContext, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Info, Star, DollarSign, Award, Sparkles, Shield, Crown } from 'lucide-react';
import ProductCard from './ProductCard';
import { ProductContext } from '../context/ProductContext';
import Header from './Header';

const ResultsPage: React.FC = () => {
  const { products, searchTerm, setProducts, setSearchTerm, selectedTier, setSelectedTier } = useContext(ProductContext);

  const filteredProducts = useMemo(() => {
    return products.filter(p => p.tier === selectedTier);
  }, [products, selectedTier]);

  const stats = useMemo(() => {
    if (!filteredProducts.length) return null;
    
    const prices = filteredProducts.map(p => parseFloat(p.price.replace(/[^0-9.]/g, '')));
    const validPrices = prices.filter(p => !isNaN(p));
    const totalReviews = filteredProducts.reduce((sum, p) => sum + p.reviews, 0);
    
    const bestValue = filteredProducts.reduce((best, current) => {
      const currentPrice = parseFloat(current.price.replace(/[^0-9.]/g, ''));
      const currentScore = (current.rating * Math.log(current.reviews + 1)) / currentPrice;
      const bestPrice = parseFloat(best.price.replace(/[^0-9.]/g, ''));
      const bestScore = (best.rating * Math.log(best.reviews + 1)) / bestPrice;
      return currentScore > bestScore ? current : best;
    }, filteredProducts[0]);

    return {
      averagePrice: validPrices.reduce((a, b) => a + b, 0) / validPrices.length,
      minPrice: Math.min(...validPrices),
      maxPrice: Math.max(...validPrices),
      totalItems: filteredProducts.length,
      averageRating: filteredProducts.reduce((a, b) => a + b.rating, 0) / filteredProducts.length,
      totalReviews,
      bestValue,
    };
  }, [filteredProducts]);

  const handleStartOver = () => {
    setProducts([]);
    setSearchTerm('');
  };

  const tiers = [
    { id: 'essential', name: 'Essential', icon: Shield, description: 'Budget-friendly basics to get started' },
    { id: 'premium', name: 'Premium', icon: Sparkles, description: 'Mid-range quality for enthusiasts' },
    { id: 'luxury', name: 'Luxury', icon: Crown, description: 'High-end options for professionals' }
  ] as const;

  return (
    <>
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-7xl">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="space-y-8"
        >
          {/* Header Section */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold mb-2 text-white">
                Your {searchTerm} Starter Kit
              </h2>
              <p className="text-gray-400">Click any product to view it on Amazon</p>
            </div>
            <button
              onClick={handleStartOver}
              className="flex items-center gap-2 px-4 py-2 text-gray-300 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Start Over
            </button>
          </div>

          {/* Tier Selection */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {tiers.map(({ id, name, icon: Icon, description }) => (
              <button
                key={id}
                onClick={() => setSelectedTier(id as typeof selectedTier)}
                className={`flex flex-col items-center gap-2 p-6 rounded-xl border transition-all ${
                  selectedTier === id
                    ? 'bg-indigo-500/20 border-indigo-500/50 text-white'
                    : 'bg-gray-900/50 border-gray-800/50 text-gray-400 hover:bg-gray-900/70 hover:text-white'
                }`}
              >
                <Icon className="w-6 h-6" />
                <span className="font-medium text-lg">{name}</span>
                <span className="text-sm text-gray-400">{description}</span>
              </button>
            ))}
          </div>

          {/* Stats Grid */}
          {stats && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="grid grid-cols-1 sm:grid-cols-3 gap-4"
            >
              {/* Price Analysis */}
              <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-gray-800/50">
                <div className="flex items-center gap-3 mb-3">
                  <DollarSign className="w-5 h-5 text-green-400" />
                  <h3 className="text-lg font-semibold text-white">Price Range</h3>
                </div>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-bold text-white">${stats.minPrice.toFixed(2)}</p>
                  <p className="text-gray-400">-</p>
                  <p className="text-xl font-semibold text-gray-400">${stats.maxPrice.toFixed(2)}</p>
                </div>
                <p className="text-sm text-gray-400 mt-2">Average: ${stats.averagePrice.toFixed(2)}</p>
              </div>

              {/* Quality Score */}
              <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-gray-800/50">
                <div className="flex items-center gap-3 mb-3">
                  <Star className="w-5 h-5 text-yellow-400" />
                  <h3 className="text-lg font-semibold text-white">Quality Score</h3>
                </div>
                <p className="text-3xl font-bold text-white mb-1">{stats.averageRating.toFixed(1)}</p>
                <p className="text-sm text-gray-400">{stats.totalReviews.toLocaleString()} total reviews</p>
              </div>

              {/* Best Value Pick */}
              <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-gray-800/50">
                <div className="flex items-center gap-3 mb-3">
                  <Award className="w-5 h-5 text-purple-400" />
                  <h3 className="text-lg font-semibold text-white">Best Value Pick</h3>
                </div>
                <p className="text-lg font-semibold text-white mb-1 line-clamp-1">{stats.bestValue.name}</p>
                <p className="text-sm text-gray-400">{stats.bestValue.price} · {stats.bestValue.rating} ★</p>
              </div>
            </motion.div>
          )}

          {/* Info Box */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-indigo-500/10 backdrop-blur-sm border border-indigo-500/20 rounded-xl p-6"
          >
            <div className="flex items-start gap-4">
              <Info className="w-6 h-6 text-indigo-400 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-semibold text-indigo-400 mb-2">About This Starter Kit</h3>
                <p className="text-gray-300">
                  This curated selection represents essential items to get started with {searchTerm}. 
                  Each tier offers a complete set of necessary items at different price points and quality levels.
                  All products have been carefully chosen based on quality ratings, verified reviews, and 
                  suitability for beginners.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Products Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
            {filteredProducts.map((product, index) => (
              <ProductCard key={product.link} product={product} index={index} />
            ))}
          </div>

          {/* Amazon Associates Disclosure */}
          <p className="text-xs text-gray-500 mt-8">
            As an Amazon Associate I earn from qualifying purchases.
          </p>
        </motion.div>
      </main>
    </>
  );
};

export default ResultsPage;