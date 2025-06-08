import React, { createContext, useState, ReactNode } from 'react';
import { GroupedProduct, ProductContextType } from '../types/types';

export const ProductContext = createContext<ProductContextType>({
  products: [],
  setProducts: () => {},
  isLoading: false,
  setIsLoading: () => {},
  error: '',
  setError: () => {},
  searchTerm: '',
  setSearchTerm: () => {},
  
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