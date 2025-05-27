import React, { useContext, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Shield, Sparkles, Crown } from 'lucide-react';
import ProductCard from './ProductCard';
import { ProductContext } from '../context/ProductContext';
import Header from './Header';

const ResultsPage: React.FC = () => {
  const { products, searchTerm, setProducts, setSearchTerm, selectedTier, setSelectedTier } = useContext(ProductContext);

  const filteredProducts = useMemo(() => {
    return products.filter(p => p.tier === selectedTier);
  }, [products, selectedTier]);

  const handleStartOver = () => {
    setProducts([]);
    setSearchTerm('');
  };

  const tiers = [
    { id: 'essential', name: 'Essential', icon: Shield, description: 'Budget-friendly basics' },
    { id: 'premium', name: 'Premium', icon: Sparkles, description: 'Mid-range quality' },
    { id: 'luxury', name: 'Luxury', icon: Crown, description: 'High-end options' }
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

          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            {tiers.map(({ id, name, icon: Icon, description }) => (
              <button
                key={id}
                onClick={() => setSelectedTier(id as typeof selectedTier)}
                className={`flex flex-col items-center justify-start p-3 sm:p-6 rounded-xl border transition-all h-full ${
                  selectedTier === id
                    ? 'bg-indigo-500/20 border-indigo-500/50 text-white'
                    : 'bg-gray-900/50 border-gray-800/50 text-gray-400 hover:bg-gray-900/70 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5 sm:w-6 sm:h-6 mb-1 sm:mb-2" />
                <span className="font-medium text-sm sm:text-lg text-center">{name}</span>
                <span className="text-xs text-center text-gray-400 hidden sm:block">{description}</span>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
            {filteredProducts.map((product, index) => (
              <ProductCard key={product.link} product={product} index={index} />
            ))}
          </div>

          <p className="text-xs text-gray-500 mt-8">
            As an Amazon Associate I earn from qualifying purchases.
          </p>
        </motion.div>
      </main>
    </>
  );
};

export default ResultsPage;