import React, { createContext, useState, ReactNode } from 'react';
import { Product, ProductContextType } from '../types/types';

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
  };

  return (
    <ProductContext.Provider value={value}>
      {children}
    </ProductContext.Provider>
  );
};