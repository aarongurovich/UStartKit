import React, { useContext, useState, useEffect, useRef } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { motion } from 'framer-motion';
import { searchAmazonProducts } from '../services/api';
import { ProductContext } from '../context/ProductContext';
import { AdvancedOptions } from '../types/types';
import AdvancedSearchModal from './AdvancedSearchModal';

const COOLDOWN_PERIOD = 2000;

const DESKTOP_PLACEHOLDER = "What starter kit are you looking for?";
const MOBILE_PLACEHOLDER = "Search starter kits...";
const MOBILE_BREAKPOINT = 768;

const MAX_TEXTAREA_HEIGHT = 100;
const MAX_SEARCH_CHARACTERS = 50;

const SearchForm: React.FC = () => {
  const {
    searchTerm,
    setSearchTerm,
    setProducts,
    setIsLoading,
    setError,
    age,
    gender,
    level,
    mustHaves,
    other
  } = useContext(ProductContext);

  const [lastSearchTime, setLastSearchTime] = useState<number>(0);
  const [currentPlaceholder, setCurrentPlaceholder] = useState(DESKTOP_PLACEHOLDER);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
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
      ta.style.height = '1px';
      const scrollHeight = ta.scrollHeight;
      if (scrollHeight > MAX_TEXTAREA_HEIGHT) {
        ta.style.height = `${MAX_TEXTAREA_HEIGHT}px`;
        ta.style.overflowY = 'auto';
      } else {
        ta.style.height = `${scrollHeight}px`;
        ta.style.overflowY = 'hidden';
      }
    }
  }, [searchTerm]);

  const handleSearchTermChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setSearchTerm(event.target.value.slice(0, MAX_SEARCH_CHARACTERS));
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
    
    const advancedOptions: AdvancedOptions = {
      age: age || undefined,
      gender: gender || undefined,
      level: level || 'Beginner',
      mustHaves: mustHaves || undefined,
      other: other || undefined
    };

    try {
      const results = await searchAmazonProducts(searchTerm, advancedOptions);
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
    <>
      <motion.form
        id="search-form"
        ref={formRef}
        onSubmit={handleSubmit}
        className="w-full"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl blur-lg opacity-25 group-hover:opacity-30 transition-opacity"></div>
          <textarea
            ref={textareaRef}
            value={searchTerm}
            onChange={handleSearchTermChange}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder={currentPlaceholder}
            maxLength={MAX_SEARCH_CHARACTERS}
            className={
              "w-full min-w-0 resize-none " +
              "overflow-hidden relative " +
              "py-5 md:py-7 " +
              "px-5 md:px-8 " +
              "pr-20 md:pr-24 " +
              "text-base sm:text-lg md:text-xl " +
              "bg-gray-900/80 text-white placeholder-gray-400 " +
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
        <div className="text-right text-xs text-gray-500 mt-1 pr-2">
          {searchTerm.length} / {MAX_SEARCH_CHARACTERS}
        </div>

        <div className="flex justify-start mt-4 px-1">
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2.5 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 transform active:scale-95 bg-gray-800/60 hover:bg-gray-700/80 text-gray-400 hover:text-white"
            aria-expanded={isModalOpen}
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span>Advanced Search</span>
          </button>
        </div>
      </motion.form>

      <AdvancedSearchModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
};

export default SearchForm;