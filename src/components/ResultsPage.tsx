import React, { useContext, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, BookOpen, Package, ExternalLink, AlertCircle, Image as ImageIcon, Youtube, Book, Shield, Sparkles } from 'lucide-react';
import ProductCard from './ProductCard';
import { ProductContext } from '../context/ProductContext';
import Header from './Header';
import { searchLearningResources } from '../services/api';
import { LearningResource, Product } from '../types/types';
import MobileSlideshow from './MobileSlideshow';

const ResultsPage: React.FC = () => {
  const {
    products,
    searchTerm,
    setProducts,
    setSearchTerm,
    learningResources,
    setLearningResources,
    isLearningResourcesLoading,
    setIsLearningResourcesLoading,
    learningResourcesError,
    setLearningResourcesError,
    isLoading: isAmazonProductsLoading,
  } = useContext(ProductContext);

  const [activeTab, setActiveTab] = useState<'starterProducts' | 'learningResources'>('starterProducts');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (!isAmazonProductsLoading && products.length > 0 && searchTerm && learningResources.length === 0 && !learningResourcesError && !isLearningResourcesLoading) {
      const fetchResources = async () => {
        setIsLearningResourcesLoading(true);
        setLearningResourcesError('');
        try {
          const resources = await searchLearningResources(searchTerm);
          setLearningResources(resources);
        } catch (err) {
          setLearningResourcesError(err instanceof Error ? err.message : 'Failed to load learning resources.');
          console.error(err);
        } finally {
          setIsLearningResourcesLoading(false);
        }
      };
      fetchResources();
    }
  }, [
    isAmazonProductsLoading,
    products.length,
    searchTerm,
    learningResources.length,
    isLearningResourcesLoading,
    learningResourcesError,
    setLearningResources,
    setIsLearningResourcesLoading,
    setLearningResourcesError,
  ]);

  useEffect(() => {
    if (activeTab === 'learningResources' && searchTerm && learningResources.length === 0 && !learningResourcesError && !isLearningResourcesLoading) {
      const fetchResources = async () => {
        setIsLearningResourcesLoading(true);
        setLearningResourcesError('');
        try {
          const resources = await searchLearningResources(searchTerm);
          setLearningResources(resources);
        } catch (err) {
          setLearningResourcesError(err instanceof Error ? err.message : 'Failed to load learning resources.');
          console.error(err);
        } finally {
          setIsLearningResourcesLoading(false);
        }
      };
      fetchResources();
    }
  }, [activeTab, searchTerm, learningResources.length, setLearningResources, setIsLearningResourcesLoading, setLearningResourcesError, learningResourcesError, isLearningResourcesLoading]);


  const handleStartOver = () => {
    setProducts([]);
    setSearchTerm('');
    setLearningResources([]);
    setLearningResourcesError('');
    setActiveTab('starterProducts');
    // Note: We no longer clear advanced options here, as their state lives in the context.
  };

  const tabButtonClasses = (tabName: 'starterProducts' | 'learningResources') =>
    `py-3 px-4 sm:px-6 rounded-t-lg font-medium transition-colors flex items-center gap-2 text-sm sm:text-base ${
      activeTab === tabName
        ? 'bg-gray-800/70 text-indigo-400 border-b-2 border-indigo-500'
        : 'text-gray-400 hover:text-white hover:bg-gray-800/40'
    }`;

    const startOverButtonClasses = "flex items-center justify-center gap-2 px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-all duration-300 transform hover:scale-105 shadow-lg";


  const renderResourceTypeIcon = (type: LearningResource['type']) => {
    switch (type) {
      case 'Book': return <Book className="w-5 h-5 text-yellow-400 flex-shrink-0" />;
      case 'Online Course': return <Sparkles className="w-5 h-5 text-purple-400 flex-shrink-0" />;
      case 'YouTube': return <Youtube className="w-5 h-5 text-red-500 flex-shrink-0" />;
      case 'Community': return <Shield className="w-5 h-5 text-green-400 flex-shrink-0" />;
      case 'Website/Blog': return <ExternalLink className="w-5 h-5 text-blue-400 flex-shrink-0" />;
      default: return <BookOpen className="w-5 h-5 text-gray-400 flex-shrink-0" />;
    }
  };

  const renderLearningResourceCard = (resource: LearningResource, index: number) => (
    <motion.a
      key={index}
      href={resource.link}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="group bg-gray-800/60 hover:bg-gray-700/70 rounded-xl overflow-hidden shadow-lg transition-all duration-300 border border-gray-700/50 flex flex-col"
    >
      {resource.image ? (
        <img
          src={resource.image}
          alt={resource.title}
          className="w-full h-48 object-cover"
        />
      ) : (
        <div className="w-full h-48 bg-gray-700/50 flex items-center justify-center">
          <ImageIcon className="w-16 h-16 text-gray-500" />
        </div>
      )}
      <div className="p-5 flex flex-col justify-between flex-grow">
        <div>
          <div className="flex items-center mb-2">
            {renderResourceTypeIcon(resource.type)}
            <span className="ml-2 text-xs text-indigo-400 uppercase tracking-wider font-semibold">{resource.type} {resource.source ? `• ${resource.source}` : ''}</span>
          </div>
          <h4 className="text-lg font-semibold text-white group-hover:text-indigo-300 transition-colors mb-1 line-clamp-2">{resource.title}</h4>
          <p className="text-sm text-gray-300 line-clamp-3 mb-3">{resource.description}</p>
        </div>
        <div className="flex items-center text-xs text-gray-400 group-hover:text-indigo-300 transition-colors">
          View Resource <ExternalLink className="w-3 h-3 ml-1.5" />
        </div>
      </div>
    </motion.a>
  );

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
                {activeTab === 'starterProducts' ? "All product tiers for each category" : "Explore resources to help you get started"}
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

          <div className="border-b border-gray-700/50">
            <nav className="flex -mb-px space-x-1">
              <button onClick={() => setActiveTab('starterProducts')} className={tabButtonClasses('starterProducts')}>
                <Package className="w-5 h-5" />
                Starter Products
              </button>
              <button onClick={() => setActiveTab('learningResources')} className={tabButtonClasses('learningResources')}>
                <BookOpen className="w-5 h-5" />
                Learning Resources
              </button>
            </nav>
          </div>

          {activeTab === 'starterProducts' && (
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
          )}

          {activeTab === 'learningResources' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-gray-900/50 backdrop-blur-sm border border-gray-800/50 rounded-xl p-6"
            >
              {isLearningResourcesLoading && (
                <div className="flex justify-center items-center py-10">
                  <div className="w-16 h-16 rounded-full border-4 border-gray-700 border-t-indigo-500 animate-spin"></div>
                  <p className="ml-4 text-gray-300">Fetching learning resources...</p>
                </div>
              )}

              {learningResourcesError && !isLearningResourcesLoading && (
                 <div className="flex flex-col items-center justify-center text-center bg-red-900/30 p-6 rounded-lg border border-red-700/50">
                    <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                    <p className="text-red-400 text-lg font-semibold">Failed to Load Resources</p>
                    <p className="text-red-300/80 mb-4 text-sm">{learningResourcesError}</p>
                    <button
                        onClick={() => {
                            setLearningResources([]);
                            setLearningResourcesError('');
                             const fetchResources = async () => {
                                setIsLearningResourcesLoading(true);
                                try {
                                const resources = await searchLearningResources(searchTerm);
                                setLearningResources(resources);
                                } catch (err) {
                                setLearningResourcesError(err instanceof Error ? err.message : 'Failed to load learning resources.');
                                console.error(err);
                                } finally {
                                setIsLearningResourcesLoading(false);
                                }
                            };
                            fetchResources();
                        }}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm transition-colors"
                    >
                        Try Again
                    </button>
                </div>
              )}

              {!isLearningResourcesLoading && !learningResourcesError && learningResources.length === 0 && (
                <p className="text-gray-500 text-center py-10 text-lg">No learning resources found for "{searchTerm}".</p>
              )}

              {!isLearningResourcesLoading && !learningResourcesError && learningResources.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {learningResources.map((resource, index) => renderLearningResourceCard(resource, index))}
                </div>
              )}
            </motion.div>
          )}

            {/* */}
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