import { Product, GroupedProduct, ProductTypeData, AdvancedOptions } from '../types/types';

async function getEssentialProductTypes(activity: string, advancedOptions?: AdvancedOptions): Promise<ProductTypeData[]> {
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
      body: JSON.stringify({ activity: activity, ...advancedOptions })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: `API call failed with status ${response.status}` }));
      console.error("Error fetching product types/prices, response not OK:", response.status, errorData);
      throw new Error(errorData.error || `Failed to fetch product types/prices: ${response.statusText}`);
    }

    const productItemsFromAPI = await response.json(); 
    
    if (!Array.isArray(productItemsFromAPI) || !productItemsFromAPI.every(
        (item: any) => typeof item === 'object' && item !== null && 
                typeof item.product_type === 'string' && 
                typeof item.explanation === 'string' &&
                typeof item.starting_price === 'number'
    )) {
        console.error("Product types/prices response is not an array of {product_type, explanation, starting_price} objects:", productItemsFromAPI);
        throw new Error("Invalid format for product types/prices received from API.");
    }
    
    const productData: ProductTypeData[] = productItemsFromAPI.map((item: any) => ({
        productType: item.product_type,
        explanation: item.explanation,
        startingPrice: item.starting_price
    }));

    if (productData.length < 1 || productData.length > 8) {
      console.warn(`API returned ${productData.length} product types for "${activity}". Using them anyway.`);
    }

    return productData.filter(pt => pt.productType.trim() !== '' && pt.explanation.trim() !== '');

  } catch (error: any) {
    console.error(`Error getting essential product types/prices for "${activity}" from Supabase function:`, error.message);
    if (error.message.includes("AI service might be unresponsive") || error.message.includes("AI response was not in the expected format")) {
        throw new Error(error.message);
    }
    throw new Error(`Failed to identify essential product types/prices for "${activity}". Original error: ${error.message}`);
  }
}


export async function searchAmazonProducts(activity: string, advancedOptions?: AdvancedOptions): Promise<GroupedProduct[]> {
  if (!activity || activity.trim() === "") {
    console.warn("searchAmazonProducts called with empty activity string.");
    return [];
  }
  try {
    const productTypeDetails = await getEssentialProductTypes(activity, advancedOptions); 

    if (!productTypeDetails || productTypeDetails.length === 0) {
      throw new Error(`No essential product types could be determined for "${activity}". Please try a more specific or different term.`);
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Supabase URL or Anon Key is not configured in environment variables.");
    }

    const productPromises = productTypeDetails.map(async (detail) => {
      try {
        const response = await fetch(`${supabaseUrl}/functions/v1/amazon-search`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseAnonKey}`
          },
          body: JSON.stringify({
            baseKeywords: activity,
            productType: detail.productType,
            startingPrice: detail.startingPrice, // Pass startingPrice instead of priceRange
            ...advancedOptions
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage = errorData?.error || `API call failed for product type: ${detail.productType} with status ${response.status}`;
          console.warn(`Error fetching for ${detail.productType}: ${errorMessage}.`);
          return null;
        }
        const productsForType = await response.json() as Product[];
        
        const tiers: GroupedProduct['tiers'] = {};
        productsForType.forEach(p => {
          if (p.tier === 'essential') tiers.essential = p;
          else if (p.tier === 'premium') tiers.premium = p;
          else if (p.tier === 'luxury') tiers.luxury = p;
        });

        if (Object.keys(tiers).length > 0) {
          return { 
            productTypeConcept: detail.productType, 
            explanation: detail.explanation, 
            tiers 
          };
        }
        return null; 
      } catch (networkError: any) {
        console.error(`Network error fetching products for type "${detail.productType}":`, networkError);
        return null; 
      }
    });

    const resolvedGroups = await Promise.all(productPromises);
    const groupedProductsResult: GroupedProduct[] = resolvedGroups.filter((group): group is GroupedProduct => group !== null);

    if (groupedProductsResult.length === 0 && productTypeDetails.length > 0) {
       throw new Error(`No products found for the starter kit: "${activity}", despite identifying product types. Try a broader or different search term, or check if the backend search is working.`);
    } else if (groupedProductsResult.length === 0) {
         throw new Error(`No products found for the starter kit: "${activity}" because no product types were identified or no products matched. Try a broader or different search term.`);
    }
    
    return groupedProductsResult;

  } catch (error: any) {
    console.error(`Error in searchAmazonProducts for activity "${activity}":`, error.message, error.stack);
    if (error.message.includes("No essential product types could be determined") ||
        error.message.includes("couldn't generate product types") || 
        error.message.includes("AI service might be unresponsive") || 
        error.message.includes("AI response was not in the expected format") || 
        error.message.includes("had trouble understanding the product types")) { 
      throw error; 
    }
    throw new Error(`Unable to build the starter kit for "${activity}". ${error.message.startsWith('Unable to build') ? '' : 'Details: '}${error.message}`);
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