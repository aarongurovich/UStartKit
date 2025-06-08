import React, { useContext, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, ChevronDown, SlidersHorizontal } from 'lucide-react';
import { ProductContext } from '../context/ProductContext';

interface AdvancedSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MAX_TEXTAREA_HEIGHT = 100;
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


  const inputBaseStyles = "w-full bg-gray-800/80 backdrop-blur-sm text-white placeholder-gray-500 border border-gray-600/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition-all";
  const inputStyles = `${inputBaseStyles} px-4 py-2.5`;
  const selectStyles = `${inputBaseStyles} appearance-none pr-10 pl-4 py-2.5`;
  const labelStyles = "block text-sm font-medium text-gray-300 mb-2";

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 200 }}
            className="bg-gray-900 border border-gray-700/50 rounded-2xl shadow-2xl w-full max-w-2xl p-6 sm:p-8 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors z-10">
              <X className="h-6 w-6" />
            </button>
            
            <div className="flex items-center gap-3 mb-6">
                <SlidersHorizontal className="h-6 w-6 text-indigo-400"/>
                <h2 className="text-2xl font-bold text-white">Advanced Search</h2>
            </div>
            
            <div className="space-y-5">
              <div>
                <label htmlFor="main-search" className={labelStyles}>Starter Kit For:</label>
                <textarea
                  ref={textareaRef}
                  id="main-search"
                  value={searchTerm}
                  onChange={handleSearchTermChange}
                  rows={1}
                  placeholder="What starter kit are you looking for?"
                  maxLength={MAX_SEARCH_CHARACTERS}
                  className={
                    "w-full min-w-0 resize-none " +
                    "overflow-hidden " +
                    "py-3 px-4 " +
                    "text-base " +
                    "bg-gray-800/80 text-white placeholder-gray-500 " +
                    "border border-gray-600/50 rounded-lg shadow-sm backdrop-blur-sm " +
                    "focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent " +
                    "transition-all"
                  }
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-5">
                <div>
                  <label htmlFor="age" className={labelStyles}>Age</label>
                  <input type="number" id="age" value={age} onChange={e => setAge(e.target.value)} className={inputStyles} placeholder="e.g., 25" />
                </div>

                <div className="relative">
                  <label htmlFor="gender" className={labelStyles}>Gender</label>
                  <select id="gender" value={gender} onChange={e => setGender(e.target.value)} className={selectStyles}>
                    <option value="">Any</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 top-10 flex items-center px-3 text-gray-400">
                    <ChevronDown className="h-4 w-4" />
                  </div>
                </div>

                <div className="relative">
                  <label htmlFor="level" className={labelStyles}>Level</label>
                  <select id="level" value={level} onChange={e => setLevel(e.target.value)} className={selectStyles}>
                    <option value="Beginner">Beginner</option>
                    <option value="Amateur">Amateur</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                   <div className="pointer-events-none absolute inset-y-0 right-0 top-10 flex items-center px-3 text-gray-400">
                    <ChevronDown className="h-4 w-4" />
                  </div>
                </div>

                <div className="md:col-span-3">
                  <label htmlFor="must-haves" className={labelStyles}>Products that MUST be included</label>
                  <textarea id="must-haves" value={mustHaves} onChange={e => setMustHaves(e.target.value)} rows={2} className={inputStyles} placeholder="e.g., A mechanical keyboard, a 144Hz monitor..."></textarea>
                </div>

                <div className="md:col-span-3">
                  <label htmlFor="other" className={labelStyles}>Other notes or preferences</label>
                  <textarea id="other" value={other} onChange={e => setOther(e.target.value)} rows={2} className={inputStyles} placeholder="e.g., I prefer sustainable products..."></textarea>
                </div>
              </div>
              
              <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    form="search-form"
                    className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold px-6 py-2.5 rounded-lg hover:shadow-lg hover:shadow-indigo-500/20 hover:scale-105 transform transition-all duration-200 flex items-center gap-2"
                    aria-label="Search with advanced options"
                    onClick={onClose}
                  >
                    <Search className="h-5 w-5" />
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