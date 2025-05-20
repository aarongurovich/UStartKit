import React, { useContext } from 'react';
import SearchPage from './components/SearchPage';
import LoadingPage from './components/LoadingPage';
import ResultsPage from './components/ResultsPage';
import { ProductProvider, ProductContext } from './context/ProductContext';

function App() {
  return (
    <ProductProvider>
      <div className="min-h-screen bg-gray-950 flex flex-col">
        <PageContent />
      </div>
    </ProductProvider>
  );
}

const PageContent = () => {
  const { isLoading, products } = useContext(ProductContext);

  if (isLoading) {
    return <LoadingPage />;
  }

  if (products.length > 0) {
    return <ResultsPage />;
  }

  return <SearchPage />;
};

export default App;