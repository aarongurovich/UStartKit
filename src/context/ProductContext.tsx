import React, { createContext, useState, ReactNode } from 'react';
import { GroupedProduct, ProductContextType, LearningResource } from '../types/types';

export const ProductContext = createContext<ProductContextType>({
  products: [],
  setProducts: () => {},
  isLoading: false,
  setIsLoading: () => {},
  error: '',
  setError: () => {},
  searchTerm: '',
  setSearchTerm: () => {},
  learningResources: [],
  setLearningResources: () => {},
  isLearningResourcesLoading: false,
  setIsLearningResourcesLoading: () => {},
  learningResourcesError: '',
  setLearningResourcesError: () => {},
  
  // Advanced Search State
  age: '',
  setAge: () => {},
  gender: '',
  setGender: () => {},
  level: 'Beginner',
  setLevel: () => {},
  mustHaves: '',
  setMustHaves: () => {},
  other: '',
  setOther: () => {},
});

interface ProductProviderProps {
  children: ReactNode;
}

export const ProductProvider: React.FC<ProductProviderProps> = ({ children }) => {
  const [products, setProducts] = useState<GroupedProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [learningResources, setLearningResources] = useState<LearningResource[]>([]);
  const [isLearningResourcesLoading, setIsLearningResourcesLoading] = useState(false);
  const [learningResourcesError, setLearningResourcesError] = useState('');

  // State for advanced options is now managed here
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [level, setLevel] = useState('Beginner');
  const [mustHaves, setMustHaves] = useState('');
  const [other, setOther] = useState('');

  const value = {
    products,
    setProducts,
    isLoading,
    setIsLoading,
    error,
    setError,
    searchTerm,
    setSearchTerm,
    learningResources,
    setLearningResources,
    isLearningResourcesLoading,
    setIsLearningResourcesLoading,
    learningResourcesError,
    setLearningResourcesError,
    age, setAge,
    gender, setGender,
    level, setLevel,
    mustHaves, setMustHaves,
    other, setOther
  };

  return (
    <ProductContext.Provider value={value}>
      {children}
    </ProductContext.Provider>
  );
};