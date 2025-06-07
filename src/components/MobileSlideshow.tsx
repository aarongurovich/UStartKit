import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Product } from '../types/types';
import ProductCard from './ProductCard';

const variants = {
  enter: (direction: number) => {
    return {
      x: direction > 0 ? 300 : -300,
      opacity: 0,
    };
  },
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => {
    return {
      zIndex: 0,
      x: direction < 0 ? 300 : -300,
      opacity: 0,
    };
  },
};

const swipeConfidenceThreshold = 10000;
const swipePower = (offset: number, velocity: number) => {
  return Math.abs(offset) * velocity;
};

interface MobileSlideshowProps {
  products: Product[];
}

const MobileSlideshow: React.FC<MobileSlideshowProps> = ({ products }) => {
  const [[page, direction], setPage] = useState([0, 0]);

  const productIndex = (page % products.length + products.length) % products.length;

  const paginate = (newDirection: number) => {
    setPage([page + newDirection, newDirection]);
  };
  
  const goTo = (newIndex: number) => {
    const newDirection = newIndex > productIndex ? 1 : -1;
    setPage([newIndex, newDirection]);
  }

  return (
    <div className="flex flex-col items-center justify-center w-full h-[440px] relative">
      <div className="w-full h-[380px] relative flex items-center justify-center overflow-hidden">
        <AnimatePresence initial={false} custom={direction}>
          <motion.div
            key={page}
            className="absolute w-full h-full flex items-center justify-center"
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 },
            }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={1}
            onDragEnd={(e, { offset, velocity }) => {
              const swipe = swipePower(offset.x, velocity.x);

              if (swipe < -swipeConfidenceThreshold) {
                paginate(1);
              } else if (swipe > swipeConfidenceThreshold) {
                paginate(-1);
              }
            }}
          >
            <ProductCard product={products[productIndex]} index={productIndex} />
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex justify-center space-x-2 pt-4">
        {products.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            className={`w-2 h-2 rounded-full transition-colors duration-300 ${
              productIndex === i ? 'bg-white' : 'bg-white/40'
            }`}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

export default MobileSlideshow;