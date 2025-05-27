// No longer need OpenAI client here
// import OpenAI from 'openai';
import { Product, LearningResource } from '../types/types';

// The OpenAI client and SYSTEM_PROMPT_FOR_ESSENTIAL_PRODUCT_TYPES have been moved to the Supabase function.

// This function now calls your new Supabase Edge Function
async function getEssentialProductTypes(activity: string): Promise<string[]> {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Supabase URL or Anon Key is not configured in environment variables.");
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/product-types`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`
      },
      body: JSON.stringify({ activity: activity })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: `API call failed with status ${response.status}` }));
      console.error("Error fetching product types, response not OK:", response.status, errorData);
      throw new Error(errorData.error || `Failed to fetch product types: ${response.statusText}`);
    }

    const productTypes = await response.json();
    if (!Array.isArray(productTypes) || !productTypes.every(pt => typeof pt === 'string')) {
        console.error("Product types response is not an array of strings:", productTypes);
        throw new Error("Invalid format for product types received from API.");
    }
    
    // Basic validation for number of product types, can be adjusted or made more robust
    if (productTypes.length < 2 || productTypes.length > 8) {
      console.warn(`API returned ${productTypes.length} product types for "${activity}", which is outside the expected range 2-8. Using them anyway.`);
    }

    return productTypes.map(pt => pt.trim()).filter(pt => pt !== '');

  } catch (error: any) {
    console.error(`Error getting essential product types for "${activity}" from Supabase function:`, error.message);
    // Preserve some of the specific error messages if they are still relevant from the function's perspective
    if (error.message.includes("AI service might be unresponsive") || error.message.includes("AI response was not in the expected format")) {
        throw new Error(error.message);
    }
    throw new Error(`Failed to identify essential product types for "${activity}". Please try a different search term or check the AI service. Original error: ${error.message}`);
  }
}


export async function searchAmazonProducts(activity: string): Promise<Product[]> {
  if (!activity || activity.trim() === "") {
    console.warn("searchAmazonProducts called with empty activity string.");
    return [];
  }
  try {
    // Now calls the Supabase function `product-types` via the updated `getEssentialProductTypes`
    const productTypes = await getEssentialProductTypes(activity); // This now calls your Supabase function

    if (!productTypes || productTypes.length === 0) {
      throw new Error(`No essential product types could be determined for "${activity}". Please try a more specific or different term.`);
    }

    const allProductsAccumulated: Product[] = [];
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Supabase URL or Anon Key is not configured in environment variables.");
    }

    const productPromises = productTypes.map(productType => {
      return fetch(`${supabaseUrl}/functions/v1/amazon-search`, { // This remains the same
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`
        },
        body: JSON.stringify({
          baseKeywords: activity,
          productType: productType,
        })
      }).then(async response => {
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage = errorData?.error || `API call failed for product type: ${productType} with status ${response.status}`;
          console.warn(`Error fetching for ${productType}: ${errorMessage}. Full response: ${JSON.stringify(errorData)}`);
          return [];
        }
        const products = await response.json() as Product[];
        return Array.isArray(products) ? products : [];
      }).catch(networkError => {
        console.error(`Network error fetching products for type "${productType}":`, networkError);
        return [];
      });
    });

    const results = await Promise.all(productPromises);
    results.forEach(productsForType => {
      if (Array.isArray(productsForType)) {
        allProductsAccumulated.push(...productsForType);
      }
    });

    if (allProductsAccumulated.length === 0 && productTypes.length > 0) {
       throw new Error(`No products found for the starter kit: "${activity}", despite identifying product types. Try a broader or different search term, or check if the backend search is working.`);
    } else if (allProductsAccumulated.length === 0) {
         throw new Error(`No products found for the starter kit: "${activity}" because no product types were identified or no products matched. Try a broader or different search term.`);
    }
    
    const uniqueProductsMap = new Map<string, Product>();
    allProductsAccumulated.forEach(product => {
      if (product && product.link && !uniqueProductsMap.has(product.link)) {
        uniqueProductsMap.set(product.link, product);
      }
    });

    const uniqueTieredProducts = Array.from(uniqueProductsMap.values());

    if (uniqueTieredProducts.length === 0 && allProductsAccumulated.length > 0) {
        console.warn(`All fetched products for "${activity}" were filtered out during de-duplication or lacked keyable URLs. Original count: ${allProductsAccumulated.length}`);
        throw new Error(`No usable products found for the starter kit: "${activity}" after processing. Please check the search terms or data sources.`);
    }
     if (uniqueTieredProducts.length === 0 && productTypes.length > 0) {
        throw new Error(`No products found for the starter kit: "${activity}". Try a broader or different search term.`);
    }
    
    return uniqueTieredProducts.map(p => ({
      ...p,
      tier: p.tier || 'essential' 
    }));

  } catch (error: any) {
    console.error(`Error in searchAmazonProducts for activity "${activity}":`, error.message, error.stack);
    if (error.message.includes("No essential product types could be determined") ||
        error.message.includes("couldn't generate product types") || // Kept for general AI issues
        error.message.includes("AI service might be unresponsive") || // From new function
        error.message.includes("AI response was not in the expected format") || // From new function
        error.message.includes("had trouble understanding the product types")) { // Original, still could be relevant
      throw error; // Re-throw these more specific errors
    }
    // General fallback
    throw new Error(`Unable to build the starter kit for "${activity}". ${error.message.startsWith('Unable to build') ? '' : 'Details: '}${error.message}`);
  }
}

// searchLearningResources and openProductLinks remain unchanged
export async function searchLearningResources(activity: string): Promise<LearningResource[]> {
  if (!activity || activity.trim() === "") {
    console.warn("searchLearningResources called with empty activity string.");
    return [];
  }
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Supabase URL or Anon Key is not configured in environment variables for learning resources.");
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/get-learning-resources`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`
      },
      body: JSON.stringify({ activity: activity })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: `API call failed with status ${response.status}` }));
      console.error("Error fetching learning resources, response not OK:", response.status, errorData);
      throw new Error(errorData.error || `Failed to fetch learning resources: ${response.statusText}`);
    }

    const resources: LearningResource[] = await response.json();
    if (!Array.isArray(resources)) {
        console.error("Learning resources response is not an array:", resources);
        throw new Error("Invalid format for learning resources received from API.");
    }
    return resources;

  } catch (error: any) {
    console.error(`Error fetching learning resources for activity "${activity}":`, error.message);
    throw new Error(`Unable to fetch learning resources for "${activity}". ${error.message.startsWith('Unable to fetch') ? '' : 'Details: '}${error.message}`);
  }
}

export function openProductLinks(links: string[]) {
  if (!links || !links.length) return;
  links.forEach((link, index) => {
    setTimeout(() => {
      if (typeof link === 'string' && link.startsWith('https://www.amazon.com/')) {
        window.open(link, '_blank');
      }
    }, index * 100);
  });
}