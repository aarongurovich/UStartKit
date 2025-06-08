import React, { useContext, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, ChevronDown, SlidersHorizontal } from 'lucide-react';
import { ProductContext } from '../context/ProductContext';

interface AdvancedSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MAX_TEXTAREA_HEIGHT = 80; // Reduced height
const MAX_SEARCH_CHARACTERS = 50;


const AdvancedSearchModal: React.FC<AdvancedSearchModalProps> = ({ isOpen, onClose }) => {
  const {
    searchTerm, setSearchTerm,
    age, setAge,
    gender, setGender,
    level, setLevel,
    mustHaves, setMustHaves,
    other, setOther
  } = useContext(ProductContext);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen && textareaRef.current) {
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
  }, [searchTerm, isOpen]);

  const handleSearchTermChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setSearchTerm(event.target.value.slice(0, MAX_SEARCH_CHARACTERS));
  };


  const inputBaseStyles = "w-full bg-gray-800/80 backdrop-blur-sm text-white placeholder-gray-500 border border-gray-600/50 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition-all text-sm";
  const inputStyles = `${inputBaseStyles} px-3 py-1.5 sm:py-2`;
  const selectStyles = `${inputBaseStyles} appearance-none pr-8 pl-3 py-1.5 sm:py-2`;
  const labelStyles = "block text-xs sm:text-sm font-medium text-gray-300 mb-1";

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-start sm:items-center justify-center z-50 p-4 overflow-y-auto"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 20, opacity: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 200 }}
            className="bg-gray-900 border border-gray-700/50 rounded-xl shadow-2xl w-full max-w-lg p-4 sm:p-5 relative mt-8 sm:mt-0"
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-white transition-colors z-10">
              <X className="h-5 w-5" />
            </button>
            
            <div className="flex items-center gap-2 mb-4">
                <SlidersHorizontal className="h-5 w-5 text-indigo-400"/>
                <h2 className="text-lg sm:text-xl font-bold text-white">Advanced Search</h2>
            </div>
            
            <div className="space-y-3 sm:space-y-4">
              <div>
                <label htmlFor="main-search" className={labelStyles}>Starter Kit For:</label>
                <textarea
                  ref={textareaRef}
                  id="main-search"
                  value={searchTerm}
                  onChange={handleSearchTermChange}
                  rows={1}
                  placeholder="What are you looking for?"
                  maxLength={MAX_SEARCH_CHARACTERS}
                  className={
                    "w-full min-w-0 resize-none " +
                    "overflow-hidden " +
                    "py-2 px-3 " +
                    "text-sm " +
                    "bg-gray-800/80 text-white placeholder-gray-500 " +
                    "border border-gray-600/50 rounded-md shadow-sm backdrop-blur-sm " +
                    "focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent " +
                    "transition-all"
                  }
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-3">
                <div>
                  <label htmlFor="age" className={labelStyles}>Age</label>
                  <input type="number" id="age" value={age} onChange={e => setAge(e.target.value)} className={inputStyles} placeholder="e.g., 25" />
                </div>

                <div>
                  <label htmlFor="gender" className={labelStyles}>Gender</label>
                  <div className="relative">
                    <select id="gender" value={gender} onChange={e => setGender(e.target.value)} className={selectStyles}>
                      <option value="">Any</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                      <ChevronDown className="h-4 w-4" />
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="level" className={labelStyles}>Level</label>
                  <div className="relative">
                    <select id="level" value={level} onChange={e => setLevel(e.target.value)} className={selectStyles}>
                      <option value="Beginner">Beginner</option>
                      <option value="Amateur">Amateur</option>
                      <option value="Advanced">Advanced</option>
                    </select>
                     <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                      <ChevronDown className="h-4 w-4" />
                    </div>
                  </div>
                </div>

                <div className="sm:col-span-3">
                  <label htmlFor="must-haves" className={labelStyles}>Products that MUST be included</label>
                  <textarea id="must-haves" value={mustHaves} onChange={e => setMustHaves(e.target.value)} rows={2} className={inputStyles} placeholder="e.g., A mechanical keyboard..."></textarea>
                </div>

                <div className="sm:col-span-3">
                  <label htmlFor="other" className={labelStyles}>Other notes or preferences</label>
                  <textarea id="other" value={other} onChange={e => setOther(e.target.value)} rows={2} className={inputStyles} placeholder="e.g., I prefer sustainable products..."></textarea>
                </div>
              </div>
              
              <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    form="search-form"
                    className="w-full sm:w-auto bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold px-4 py-2 rounded-lg hover:shadow-lg hover:shadow-indigo-500/20 hover:scale-105 transform transition-all duration-200 flex items-center justify-center gap-2 text-sm"
                    aria-label="Search with advanced options"
                    onClick={onClose}
                  >
                    <Search className="h-4 w-4" />
                    <span>Search</span>
                  </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AdvancedSearchModal;