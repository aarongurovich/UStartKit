export interface Product {
  name: string;
  description: string;
  link: string;
  image: string;
  price: string;
  rating: number;
  reviews: number;
  tier: 'essential' | 'premium' | 'luxury';
}

export interface LearningResource {
  title: string;
  link: string;
  type: 'Book' | 'Online Course' | 'YouTube' | 'Community' | 'Website/Blog' | 'Other';
  description: string;
  source?: string;
  image?: string; // Ensure this line is present
}

export interface ProductContextType {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  error: string;
  setError: React.Dispatch<React.SetStateAction<string>>;
  searchTerm: string;
  setSearchTerm: React.Dispatch<React.SetStateAction<string>>;
  selectedTier: 'essential' | 'premium' | 'luxury';
  setSelectedTier: React.Dispatch<React.SetStateAction<'essential' | 'premium' | 'luxury'>>;

  learningResources: LearningResource[];
  setLearningResources: React.Dispatch<React.SetStateAction<LearningResource[]>>;
  isLearningResourcesLoading: boolean;
  setIsLearningResourcesLoading: React.Dispatch<React.SetStateAction<boolean>>;
  learningResourcesError: string;
  setLearningResourcesError: React.Dispatch<React.SetStateAction<string>>;
}