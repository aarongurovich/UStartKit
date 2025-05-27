import OpenAI from 'openai';
import { Product, LearningResource } from '../types/types';

// WARNING: THIS IS A MAJOR SECURITY RISK. See notes above and in the response.
// Your OpenAI API key is exposed to the browser.
// This entire OpenAI client and the getEssentialProductTypes function
// should be moved to a backend (e.g., a Supabase Function).
const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
});

const SYSTEM_PROMPT_FOR_ESSENTIAL_PRODUCT_TYPES = `You are an expert in curating starter kits for beginners.
Given a user's request for a starter kit (e.g., "Beginner cooking set", "Travel starter kit for Europe", "Chess starter kit"), your task is to identify 3 to 8 essential and truly distinct *types* of products that would form the core of such a kit. One of these items MUST be a beginner-level instructional book or guide relevant to the activity unless the activity is so general (e.g. "Dorm Room Essentials") that a single book is not appropriate.

CRITICAL RULES FOR DISTINCT PRODUCT TYPES:
1.  **Focus on Functionality**: Each product type should represent a unique core function or purpose within the activity.
2.  **General Categories**: Product types should be general categories (e.g., "Chef's Knife", "Cutting Board") not specific brands, models, or highly granular variations unless those variations serve a fundamentally different purpose for a beginner.
3.  **Combine Core Components**: For items typically sold or used as a single functional unit (like a chess board and pieces), list the combined unit as a single product type (e.g., "Chess Set"). Do NOT list individual components (like "Chess Board" and "Chess Pieces" separately) if a combined set is standard for a beginner. Only list components separately if they are common, distinct purchases for a beginner for different primary functions (e.g., a specialized travel board vs. a main set).
4.  **Avoid Redundancy**: Ensure no two product types you list serve an almost identical primary purpose for a beginner. For example, don't list "Frying Pan" and "Skillet" if they mean the same thing for a basic kit.
5.  **Beginner Focus**: The kit is for someone starting out. Prioritize the absolute essentials.
6.  **Include a Book/Guide**: Unless highly impractical for the topic, one product type should be a "Beginner's Guide to [Activity]" or similar introductory book.

EXAMPLES:
-   User: "Beginner Photography Starter Kit"
    Ideal Response: ["DSLR Camera or Mirrorless Camera with Kit Lens", "Memory Card", "Camera Bag", "Tripod", "Lens Cleaning Kit", "Beginner's Guide to Digital Photography"]
-   User: "Home Office Setup Essentials"
    Ideal Response: ["Desk", "Ergonomic Office Chair", "External Monitor", "Keyboard", "Mouse", "Webcam", "Desk Organizer", "Guide to Home Office Ergonomics and Productivity"]
-   User: "Chess Starter Kit"
    Ideal Response: ["Chess Set (Board and Pieces)", "Chess Clock", "Beginner's Chess Strategy Book"]

OUTPUT REQUIREMENTS:
1.  **Return ONLY a JSON response that is a single array of strings. The entire response body MUST be this JSON array.**
    **For example: \`["Product Type 1", "Product Type 2", "Beginner's Guide to Topic"]\`**
2.  The array should contain between 3 and 8 product types.
3.  **No explanations, introductory text, variable assignments, comments, or any other text outside the JSON array structure itself. Just the array.**
Example response format for "Tennis starter kit":
["Tennis Racket", "Tennis Balls", "Tennis Shoes", "Tennis Bag", "Beginner's Guide to Tennis"]`;

async function getEssentialProductTypes(activity: string): Promise<string[]> {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: SYSTEM_PROMPT_FOR_ESSENTIAL_PRODUCT_TYPES },
        {
          role: "user",
          content: `Identify essential product types for a "${activity}" starter kit. Follow all output requirements precisely.`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('GPT did not return content for product types.');
    }

    console.log('Raw GPT response for product types:', content);

    let parsedProductTypes: string[] = [];
    try {
      const parsedJson = JSON.parse(content);

      const processArray = (arr: any): string[] => {
        if (!Array.isArray(arr)) return [];
        return arr.reduce((flat: string[], item: any) => {
          if (Array.isArray(item)) {
            return flat.concat(processArray(item));
          }
          if (typeof item === 'string' && item.trim() !== '') {
            return flat.concat(item.trim());
          }
          return flat;
        }, []);
      };

      if (Array.isArray(parsedJson)) {
        parsedProductTypes = processArray(parsedJson);
      } else if (typeof parsedJson === 'object' && parsedJson !== null) {
        const arrayValues = Object.values(parsedJson).filter(val => Array.isArray(val));
        if (arrayValues.length > 0 && Array.isArray(arrayValues[0])) {
          parsedProductTypes = processArray(arrayValues[0] as any[]);
        } else {
          const keys = Object.keys(parsedJson);
          const allValuesAreStringsOrSimilar = Object.values(parsedJson).every(
            val => typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean'
          );

          if (keys.length > 0 && allValuesAreStringsOrSimilar) {
            parsedProductTypes = keys.map(key => key.trim()).filter(key => key !== '');
          } else {
            throw new Error('GPT response is an object, but not in the expected {key: description} format and does not contain a primary array of product types.');
          }
        }
      } else {
        throw new Error('GPT response for product types is not a valid JSON array or object.');
      }
    } catch (parseError: any) {
      console.error('Error parsing GPT response for product types:', parseError.message, 'Raw content:', content);
      if (typeof content === 'string') {
        const arrayMatch = content.match(/\[\s*("[^"]*"(?:\s*,\s*"[^"]*")*)\s*\]/);
        if (arrayMatch && arrayMatch[0]) {
          try {
            const regexParsed = JSON.parse(arrayMatch[0]);
            if (Array.isArray(regexParsed) && regexParsed.every(pt => typeof pt === 'string')) {
              parsedProductTypes = regexParsed.map((pt: string) => pt.trim()).filter((pt: string) => pt !== '');
            } else {
                 throw new Error('Regex fallback did not yield a clean array of strings.');
            }
          } catch (e: any) {
            throw new Error(`Failed to parse product types from GPT response fallback regex. Original parse error: ${parseError.message}. Fallback error: ${e.message}`);
          }
        } else {
          throw new Error(`Could not extract valid product types array from GPT response. Original parse error: ${parseError.message}. Content was: ${content}`);
        }
      } else {
         throw new Error(`Could not extract valid product types. Original parse error: ${parseError.message}. Content was not a string.`);
      }
    }

    let finalProductTypes = parsedProductTypes
      .filter(pt => typeof pt === 'string' && pt.trim() !== '')
      .map(pt => pt.trim());
    
    finalProductTypes = [...new Set(finalProductTypes)];

    if (finalProductTypes.length === 0) {
      throw new Error(`No valid product types found for "${activity}" after parsing. Raw response: ${content}`);
    }

    if (finalProductTypes.length < 2 || finalProductTypes.length > 8) {
      console.warn(`GPT returned ${finalProductTypes.length} product types for "${activity}", which is outside the expected range 2-8.`);
    }

    return finalProductTypes;

  } catch (error: any) {
    console.error(`Error getting essential product types for "${activity}":`, error.message);
    if (error.message.includes('GPT did not return content')) {
      throw new Error(`Sorry, I couldn't generate product types for "${activity}" right now. The AI service might be unresponsive.`);
    } else if (error.message.toLowerCase().includes('parse') || error.message.toLowerCase().includes('extract') || error.message.toLowerCase().includes('gpt response is an object')) {
      throw new Error(`Sorry, I had trouble understanding the product types for "${activity}". The AI response was not in the expected format. Please try a different search term or try again later.`);
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
    // IMPORTANT: In a production system, getEssentialProductTypes should call your OWN backend
    // which then calls OpenAI, rather than calling OpenAI from the client.
    const productTypes = await getEssentialProductTypes(activity);

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
      return fetch(`${supabaseUrl}/functions/v1/amazon-search`, {
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
        const products = await response.json() as Product[]; // Assuming Product type is defined elsewhere
        // Ensure the response is an array, even if it's empty
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
      // The `Product` type should have a `link` property that is unique for React keys.
      // This comes from your Supabase function's `formatProduct` which creates `link`.
      if (product && product.link && !uniqueProductsMap.has(product.link)) {
        uniqueProductsMap.set(product.link, product);
      } else if (product && product.link && uniqueProductsMap.has(product.link)) {
        // Optional: log if a duplicate link was found and skipped
        // console.log(`Duplicate product link found and skipped: ${product.link}`);
      } else if (product && !product.link) {
        // Optional: log products missing a link if a link is expected for all products
        // console.warn('Product found without a link:', product.name);
        // Decide how to handle products without a link; for now, they won't be added if link is the key
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
        error.message.includes("couldn't generate product types") ||
        error.message.includes("had trouble understanding the product types")) {
      throw error;
    }
    throw new Error(`Unable to build the starter kit for "${activity}". ${error.message.startsWith('Unable to build') ? '' : 'Details: '}${error.message}`);
  }
}

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