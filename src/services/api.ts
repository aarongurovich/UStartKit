import OpenAI from 'openai';
import { Product, LearningResource } from '../types/types';

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
1.  Return ONLY a JSON array of strings, where each string is a product type.
2.  The array should contain between 3 and 8 product types.
3.  No explanations, introductory text, or any other text outside the JSON array. Just the array.
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
      temperature: 0.2,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('GPT did not return content for product types.');
    }

    console.log('Raw GPT response for product types:', content);

    let productTypes: string[];
    try {
      const parsedJson = JSON.parse(content);
      
      const flattenArray = (arr: any[]): string[] => {
        return arr.reduce((flat: string[], item) => {
          if (Array.isArray(item)) {
            return flat.concat(flattenArray(item));
          }
          return typeof item === 'string' ? flat.concat(item) : flat;
        }, []);
      };

      if (Array.isArray(parsedJson)) {
        productTypes = flattenArray(parsedJson);
      } else if (typeof parsedJson === 'object' && parsedJson !== null) {
        const possibleArrays = Object.values(parsedJson).filter(Array.isArray);
        if (possibleArrays.length > 0) {
          productTypes = flattenArray(possibleArrays[0] as any[]);
        } else {
          productTypes = Object.values(parsedJson)
            .filter(value => typeof value === 'string')
            .map(String);
        }
      } else {
        throw new Error('GPT response for product types is not a valid JSON array or object.');
      }
    } catch (parseError) {
      console.error('Error parsing GPT response for product types:', parseError);
      const arrayMatch = content.match(/\[\s*("[^"]*"(?:\s*,\s*"[^"]*")*)\s*\]/);
      if (arrayMatch && arrayMatch[0]) {
        try {
          productTypes = JSON.parse(arrayMatch[0]);
        } catch (e) {
          throw new Error('Failed to parse product types from GPT response fallback.');
        }
      } else {
        throw new Error('Could not extract valid product types from GPT response.');
      }
    }

    productTypes = productTypes
      .filter(pt => typeof pt === 'string' && pt.trim() !== '')
      .map(pt => pt.trim());

    if (productTypes.length === 0) {
      throw new Error(`No valid product types found for "${activity}".`);
    }

    if (productTypes.length < 2 || productTypes.length > 8) {
      console.warn(`GPT returned ${productTypes.length} product types for "${activity}", which is outside the expected range.`);
    }

    return productTypes;

  } catch (error) {
    console.error(`Error getting essential product types for "${activity}":`, error);
    if (error instanceof Error) {
      if (error.message.includes('GPT did not return content')) {
        throw new Error(`Sorry, I couldn't generate product types for "${activity}" right now. The AI service is unresponsive.`);
      } else if (error.message.includes('parse')) {
        throw new Error(`Sorry, I had trouble processing the product types for "${activity}". Please try a different search term.`);
      }
    }
    throw new Error(`Failed to identify essential product types for "${activity}". Please try a different search term or check the AI service.`);
  }
}

export async function searchAmazonProducts(activity: string): Promise<Product[]> {
  if (!activity || activity.trim() === "") {
    console.warn("searchAmazonProducts called with empty activity string.");
    return [];
  }
  try {
    const productTypes = await getEssentialProductTypes(activity);

    if (!productTypes || productTypes.length === 0) {
      throw new Error(`No essential product types could be determined for "${activity}". Please try a more specific or different term.`);
    }

    const allTieredProducts: Product[] = [];
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
        return response.json() as Promise<Product[]>;
      }).catch(networkError => {
        console.error(`Network error fetching products for type "${productType}":`, networkError);
        return [];
      });
    });

    const results = await Promise.all(productPromises);
    results.forEach(productsForType => {
      if (Array.isArray(productsForType)) {
        allTieredProducts.push(...productsForType);
      }
    });

    if (allTieredProducts.length === 0) {
      throw new Error(`No products found for the starter kit: "${activity}". Try a broader or different search term.`);
    }
    
    return allTieredProducts.map(p => ({
      ...p,
      tier: p.tier || 'essential' 
    }));

  } catch (error) {
    console.error(`Error in searchAmazonProducts for activity "${activity}":`, error);
    if (error instanceof Error) {
      if (error.message.includes("No essential product types could be determined") ||
          error.message.includes("couldn't generate product types") ||
          error.message.includes("had trouble processing the product types")) {
        throw error;
      }
      throw new Error(`Unable to build the starter kit for "${activity}". ${error.message}`);
    } else {
      throw new Error(`An unknown error occurred while building the starter kit for "${activity}".`);
    }
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

  } catch (error) {
    console.error(`Error fetching learning resources for activity "${activity}":`, error);
    if (error instanceof Error) {
      throw new Error(`Unable to fetch learning resources for "${activity}". ${error.message}`);
    } else {
      throw new Error(`An unknown error occurred while fetching learning resources for "${activity}".`);
    }
  }
}

export function openProductLinks(links: string[]) {
  if (!links.length) return;
  links.forEach((link, index) => {
    setTimeout(() => {
      if (link?.startsWith('https://www.amazon.com/')) {
        window.open(link, '_blank');
      }
    }, index * 100);
  });
}