import React, { useState } from 'react';
import { Star, ExternalLink, Shield, Sparkles, Crown } from 'lucide-react';
import { motion } from 'framer-motion';
import { Product } from '../types/types';

interface ProductCardProps {
  product: Product;
  index: number;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, index }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const TierIcon = {
    essential: Shield,
    premium: Sparkles,
    luxury: Crown
  }[product.tier];

  const tierColors = {
    essential: 'text-blue-400',
    premium: 'text-purple-400',
    luxury: 'text-yellow-400'
  }[product.tier];

  return (
    <motion.a
      href={product.link}
      target="_blank"
      rel="noopener noreferrer sponsored"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: imageLoaded ? 1 : 0, y: imageLoaded ? 0 : 20 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="block group relative bg-gray-900/50 backdrop-blur-sm border border-gray-800/50 rounded-xl overflow-hidden hover:shadow-2xl hover:shadow-indigo-500/20 transition-all duration-300 hover:scale-[1.02] cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/0 to-purple-500/0 group-hover:from-indigo-500/10 group-hover:to-purple-500/10 transition-all duration-300" />

      <div className={`absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-full bg-indigo-500/80 backdrop-blur-sm text-white text-xs font-medium transform transition-all duration-300 ${isHovered ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'}`}>
        <span>View on Amazon</span>
        <ExternalLink className="h-3 w-3" />
      </div>

      <div className="absolute top-3 left-3 flex items-center gap-1 px-2 py-1 rounded-full bg-gray-900/80 backdrop-blur-sm text-xs font-medium">
        <TierIcon className={`h-3 w-3 ${tierColors}`} />
        <span className={`capitalize ${tierColors}`}>{product.tier}</span>
      </div>

      <div className="p-4">
        <div className="mb-3">
          <h3 className="text-lg font-semibold text-white line-clamp-2 group-hover:text-indigo-400 transition-colors">
            {product.name}
          </h3>
        </div>

        <div className="flex items-center mb-3 text-sm">
          <div className="flex items-center text-yellow-500">
            <Star className="h-4 w-4 fill-current" />
            <span className="ml-1 font-medium">{product.rating}</span>
          </div>
          <span className="mx-2 text-gray-600">·</span>
          <span className="text-gray-400">{product.reviews} reviews</span>
          <span className="mx-2 text-gray-600">·</span>
          <motion.span
            className="font-semibold text-white"
            animate={{ scale: isHovered ? 1.05 : 1 }}
            transition={{ duration: 0.2 }}
          >
            {product.price}
          </motion.span>
        </div>

        <div className="relative bg-gray-800/50 rounded-lg mb-3 overflow-hidden group-hover:ring-2 ring-indigo-500/30 transition-all duration-300" style={{ paddingBottom: '75%' }}>
          <div className="absolute inset-0 flex items-center justify-center p-2">
            <img
              src={product.image}
              alt={product.name}
              className={`w-full h-full object-contain transform group-hover:scale-110 transition-all duration-500 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageLoaded(true)}
            />
          </div>
        </div>

        <p className="text-sm text-gray-300 mb-4 line-clamp-3 group-hover:text-gray-200 transition-colors">
          {product.reasonForInclusion}
        </p>
      </div>
    </motion.a>
  );
};

export default ProductCard;