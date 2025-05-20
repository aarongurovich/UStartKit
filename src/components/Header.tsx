import React from 'react';
import { Package } from 'lucide-react';

const Header: React.FC = () => {
  return (
    <header className="bg-gray-950/50 backdrop-blur-sm border-b border-gray-800/50 py-4 sticky top-0 z-10">
      <div className="container mx-auto px-4 flex items-center justify-center max-w-2xl">
        <div className="flex items-center gap-2">
          <Package className="h-6 w-6 text-gradient from-indigo-400 to-purple-400" />
          <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            UStartKit
          </h1>
        </div>
      </div>
    </header>
  );
}

export default Header;