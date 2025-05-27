import React, { createContext, useState, ReactNode } from 'react';
import { Product, ProductContextType, LearningResource } from '../types/types';

export const ProductContext = createContext<ProductContextType>({
  products: [],
  setProducts: () => {},
  isLoading: false,
  setIsLoading: () => {},
  error: '',
  setError: () => {},
  searchTerm: '',
  setSearchTerm: () => {},
  selectedTier: 'essential',
  setSelectedTier: () => {},

  learningResources: [],
  setLearningResources: () => {},
  isLearningResourcesLoading: false,
  setIsLearningResourcesLoading: () => {},
  learningResourcesError: '',
  setLearningResourcesError: () => {},
});

interface ProductProviderProps {
  children: ReactNode;
}

export const ProductProvider: React.FC<ProductProviderProps> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTier, setSelectedTier] = useState<'essential' | 'premium' | 'luxury'>('essential');

  const [learningResources, setLearningResources] = useState<LearningResource[]>([]);
  const [isLearningResourcesLoading, setIsLearningResourcesLoading] = useState(false);
  const [learningResourcesError, setLearningResourcesError] = useState('');

  const value = {
    products,
    setProducts,
    isLoading,
    setIsLoading,
    error,
    setError,
    searchTerm,
    setSearchTerm,
    selectedTier,
    setSelectedTier,
    learningResources,
    setLearningResources,
    isLearningResourcesLoading,
    setIsLearningResourcesLoading,
    learningResourcesError,
    setLearningResourcesError,
  };

  return (
    <ProductContext.Provider value={value}>
      {children}
    </ProductContext.Provider>
  );
};