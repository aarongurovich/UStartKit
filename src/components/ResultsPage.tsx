import React, { useContext, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import ProductCard from './ProductCard';
import { ProductContext } from '../context/ProductContext';
import Header from './Header';
import { Product } from '../types/types';
import MobileSlideshow from './MobileSlideshow';

const ResultsPage: React.FC = () => {
  const {
    products,
    searchTerm,
    setProducts,
    setSearchTerm,
    isLoading: isAmazonProductsLoading,
  } = useContext(ProductContext);

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleStartOver = () => {
    setProducts([]);
    setSearchTerm('');
  };

  const startOverButtonClasses = "flex items-center justify-center gap-2 px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-all duration-300 transform hover:scale-105 shadow-lg";

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
              <p className="text-gray-400">
                All product tiers for each category
              </p>
            </div>
            <button
              onClick={handleStartOver}
              className={startOverButtonClasses}
            >
              <ArrowLeft className="w-4 h-4" />
              Start Over
            </button>
          </div>

          <motion.div className="space-y-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            {products.slice(0, 8).map((groupedProduct, groupIndex) => {
              const tiers = [groupedProduct.tiers.essential, groupedProduct.tiers.premium, groupedProduct.tiers.luxury].filter(Boolean) as Product[];

              return (
                <div key={groupIndex} className="p-4 sm:p-6 border-b border-gray-800/50 last:border-b-0">
                  <h3 className="text-xl sm:text-2xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 mb-1 text-center">
                    {groupedProduct.productTypeConcept}
                  </h3>
                  <p className="text-gray-400 text-sm mb-4 text-center">{groupedProduct.explanation}</p>

                  {isMobile ? (
                    tiers.length > 0 ? (
                      <MobileSlideshow products={tiers} />
                    ) : (
                      <div className="w-full h-[380px] border border-dashed border-gray-700 rounded-lg p-4 flex items-center justify-center text-gray-500 text-center">
                        No product versions found
                      </div>
                    )
                  ) : (
                    <div className="mt-6 mb-8 flex items-start justify-center flex-wrap gap-6">
                      {tiers.length > 0 ? (
                        tiers.map((product, tierIndex) => (
                          <ProductCard key={tierIndex} product={product} index={groupIndex * 3 + tierIndex} />
                        ))
                      ) : (
                        <div className="w-full h-[380px] border border-dashed border-gray-700 rounded-lg p-4 flex items-center justify-center text-gray-500 text-center">
                          No product versions found for this category.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
            {products.length === 0 && !isAmazonProductsLoading && (
               <div className="text-center py-10 text-gray-400">
                  <p className="text-xl">No product categories found for "{searchTerm}".</p>
                  <p>Try refining your search.</p>
               </div>
            )}
             <p className="text-xs text-gray-500 mt-8 text-center">
              As an Amazon Associate I earn from qualifying purchases.
            </p>
          </motion.div>

          <div className="mt-12 mb-8 flex justify-center">
              <button
              onClick={handleStartOver}
              className={startOverButtonClasses}
              >
              <ArrowLeft className="w-5 h-5" />
              Start Over
              </button>
          </div>
        </motion.div>
      </main>
    </>
  );
};

export default ResultsPage;