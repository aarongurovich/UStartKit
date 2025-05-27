import React, { useContext, useState, useCallback, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { searchAmazonProducts } from '../services/api';
import { ProductContext } from '../context/ProductContext';

const COOLDOWN_PERIOD = 2000;

const DESKTOP_PLACEHOLDER = "What starter kit are you looking for?";
const MOBILE_PLACEHOLDER = "Search starter kits...";
const MOBILE_BREAKPOINT = 768;

const MAX_TEXTAREA_HEIGHT = 100; // Max height in pixels (e.g., approx 3-4 lines)

const SearchForm: React.FC = () => {
  const { 
    searchTerm, 
    setSearchTerm, 
    setProducts, 
    setIsLoading, 
    setError 
  } = useContext(ProductContext);

  const [lastSearchTime, setLastSearchTime] = useState<number>(0);
  const [currentPlaceholder, setCurrentPlaceholder] = useState(DESKTOP_PLACEHOLDER);

  const formRef = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < MOBILE_BREAKPOINT) {
        setCurrentPlaceholder(MOBILE_PLACEHOLDER);
      } else {
        setCurrentPlaceholder(DESKTOP_PLACEHOLDER);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (textareaRef.current) {
      const ta = textareaRef.current;
      // console.log(`[ResizableTextarea] searchTerm changed: "${searchTerm}"`);
      // console.log(`[ResizableTextarea] Current height before adjustment: ${ta.style.height}`);
      ta.style.height = '1px'; 
      const scrollHeight = ta.scrollHeight;
      // console.log(`[ResizableTextarea] Measured scrollHeight: ${scrollHeight}px`);
      if (scrollHeight > MAX_TEXTAREA_HEIGHT) {
        ta.style.height = `${MAX_TEXTAREA_HEIGHT}px`;
        ta.style.overflowY = 'auto';
        // console.log(`[ResizableTextarea] Applied MAX_TEXTAREA_HEIGHT: ${MAX_TEXTAREA_HEIGHT}px, overflowY: auto`);
      } else {
        ta.style.height = `${scrollHeight}px`;
        ta.style.overflowY = 'hidden';
        // console.log(`[ResizableTextarea] Applied scrollHeight: ${scrollHeight}px, overflowY: hidden`);
      }
    } else {
      // console.log("[ResizableTextarea] textareaRef.current is null or undefined.");
    }
  }, [searchTerm]);

  const handleSearchTermChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setSearchTerm(event.target.value);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault(); 
      if (formRef.current) {
        if (typeof formRef.current.requestSubmit === 'function') {
          formRef.current.requestSubmit();
        } else {
          const submitButton = formRef.current.querySelector('button[type="submit"]');
          if (submitButton instanceof HTMLElement) {
              submitButton.click();
          }
        }
      }
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    const now = Date.now();
    if (now - lastSearchTime < COOLDOWN_PERIOD) {
      setError(`Please wait ${Math.ceil((COOLDOWN_PERIOD - (now - lastSearchTime)) / 1000)} seconds.`);
      return;
    }
    setIsLoading(true);
    setError('');
    setProducts([]);
    setLastSearchTime(now);
    try {
      const results = await searchAmazonProducts(searchTerm);
      if (results.length === 0) setError('No products found. Please try a different search term.');
      else if (results.length < 5) {
        setError(`Only ${results.length} products found. Try more general terms.`);
        setProducts(results);
      } else setProducts(results);
    } catch (err) {
      let msg = err instanceof Error ? err.message : 'Something went wrong.';
      if (msg.includes('429')) msg = 'High traffic. Please try again soon.';
      setError(msg);
      console.error('Error searching products:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.form 
      ref={formRef}
      onSubmit={handleSubmit} 
      className="relative"
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="relative group">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl blur-xl opacity-20 group-hover:opacity-30 transition-opacity"></div>
        <textarea
          ref={textareaRef}
          value={searchTerm}
          onChange={handleSearchTermChange}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder={currentPlaceholder}
          className={
            "w-full min-w-0 resize-none " + 
            "overflow-hidden " + 
            "py-5 md:py-7 " + 
            "px-5 md:px-8 " + 
            "pr-20 md:pr-24 " + // Increased padding-right to avoid overlap with the search button
            "text-base sm:text-lg md:text-xl " + 
            "bg-gray-900/50 text-white placeholder-gray-400 " +
            "border border-gray-700/50 rounded-2xl shadow-sm backdrop-blur-sm " +
            "focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent " +
            "transition-all hover:shadow-lg hover:shadow-indigo-500/10"
          }
          required
        />
        <button
          type="submit"
          className="absolute right-4 top-1/2 -translate-y-1/2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white p-4 rounded-xl hover:shadow-lg hover:shadow-indigo-500/20 hover:scale-105 transform transition-all duration-200"
          aria-label="Search"
        >
          <Search className="h-6 w-6" />
        </button>
      </div>
    </motion.form>
  );
};

export default SearchForm;