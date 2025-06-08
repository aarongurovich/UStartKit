export interface Product {
  name: string;
  reasonForInclusion: string;
  link: string;
  image: string;
  price: string; 
  rating: number;
  reviews: number;
  tier: 'essential' | 'premium' | 'luxury';
}

export interface ProductTypeData { 
  productType: string;
  explanation: string;
  startingPrice: number;
}

export interface GroupedProduct {
  productTypeConcept: string;
  explanation: string; 
  tiers: {
    essential?: Product;
    premium?: Product;
    luxury?: Product;
  };
}

export interface LearningResource {
  title: string;
  link: string;
  type: 'Book' | 'Online Course' | 'YouTube' | 'Community' | 'Website/Blog' | 'Other';
  description: string;
  source?: string;
  image: string;
}

export interface AdvancedOptions {
  age?: string;
  gender?: string;
  level?: 'Beginner' | 'Amateur' | 'Advanced' | string;
  mustHaves?: string;
  other?: string;
}

export interface ProductContextType {
  products: GroupedProduct[];
  setProducts: React.Dispatch<React.SetStateAction<GroupedProduct[]>>;
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  error: string;
  setError: React.Dispatch<React.SetStateAction<string>>;
  searchTerm: string;
  setSearchTerm: React.Dispatch<React.SetStateAction<string>>;

  learningResources: LearningResource[];
  setLearningResources: React.Dispatch<React.SetStateAction<LearningResource[]>>;
  isLearningResourcesLoading: boolean;
  setIsLearningResourcesLoading: React.Dispatch<React.SetStateAction<boolean>>;
  learningResourcesError: string;
  setLearningResourcesError: React.Dispatch<React.SetStateAction<string>>;

  // Advanced Search State
  age: string;
  setAge: React.Dispatch<React.SetStateAction<string>>;
  gender: string;
  setGender: React.Dispatch<React.SetStateAction<string>>;
  level: string;
  setLevel: React.Dispatch<React.SetStateAction<string>>;
  mustHaves: string;
  setMustHaves: React.Dispatch<React.SetStateAction<string>>;
  other: string;
  setOther: React.Dispatch<React.SetStateAction<string>>;
}