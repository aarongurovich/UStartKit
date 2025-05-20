import OpenAI from 'openai';
import { Product } from '../types/types';

// Initialize OpenAI client
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
-   User: "Camping Starter Kit"
    Ideal Response: ["Tent (2-3 person)", "Sleeping Bag", "Sleeping Pad", "Backpack", "Camping Stove", "Headlamp", "First-aid kit", "Beginner's Guide to Camping Skills"]
-   User: "Travel starter kit for Europe"
    Ideal Response: ["Universal Travel Adapter", "Passport Holder", "Neck Pillow", "Reusable Water Bottle", "Portable Charger/Power Bank", "Packing Cubes", "European Travel Phrasebook & Guide"]
-   User: "Dorm room essentials for college"
    Ideal Response: ["Bedding Set (Sheets, Comforter, Pillow)", "Desk Lamp", "Storage Bins/Organizers", "Shower Caddy", "Towels", "Laundry Bag", "College Survival Guide (optional)"]
-   User: "Beginner cooking set for new chefs"
    Ideal Response: ["Chef's Knife", "Cutting Board", "Frying Pan (Non-stick)", "Saucepan with Lid", "Mixing Bowls", "Measuring Cups and Spoons Set", "Basic Utensils Set", "The Joy of Cooking (Beginner Sections) or Basic Cookbook"]
-   User: "Podcast starter pack for beginners"
    Ideal Response: ["USB Microphone", "Headphones", "Pop Filter/Windscreen", "Mic Stand or Boom Arm", "Beginner's Guide to Podcasting"]
-   User: "Hiking gear for beginners"
    Ideal Response: ["Daypack (Backpack)", "Hiking Boots or Trail Shoes", "Reusable Water Bottle or Hydration Pack", "Navigation Tool (Map & Compass or GPS Device)", "First-Aid Kit", "Headlamp", "Beginner's Guide to Hiking & Trail Safety"]
-   User: "Plant parent starter pack"
    Ideal Response: ["Assorted Small Plant Pots with Drainage", "Potting Mix", "Watering Can", "Gardening Trowel", "Beginner-Friendly Plant Food", "Houseplants for Beginners Book"]
-   User: "Gaming setup for streamers"
    Ideal Response: ["Gaming PC or Console", "Gaming Monitor", "Gaming Headset with Microphone", "Webcam (streaming quality)", "Gaming Keyboard", "Gaming Mouse", "Guide to Starting a Streaming Channel"]
-   User: "Art supplies for beginners (drawing)"
    Ideal Response: ["Sketchbook", "Graphite Pencil Set", "Erasers (kneaded and vinyl)", "Pencil Sharpener", "Drawing Paper Pad", "Drawing for the Absolute Beginner Book"]
-   User: "Meditation and mindfulness kit"
    Ideal Response: ["Meditation Cushion or Bench", "Yoga Mat", "Timer", "Journal and Pen", "Mindfulness for Beginners Book"]
-   User: "Home barista coffee setup"
    Ideal Response: ["Coffee Grinder (Burr Grinder preferred)", "Coffee Maker (e.g., Pour Over or French Press)", "Kettle (Gooseneck for Pour Over)", "Coffee Scale", "Mug", "The World Atlas of Coffee (or similar introductory guide)"]
-   User: "Gardening starter kit"
    Ideal Response: ["Hand Trowel", "Hand Cultivator", "Gardening Gloves", "Watering Can", "Kneeling Pad", "Assorted Seed Packets", "Vegetable Gardening for Beginners Book"]
-   User: "Yoga beginner equipment"
    Ideal Response: ["Yoga Mat", "Yoga Blocks (Set of 2)", "Yoga Strap", "Yoga Blanket", "Light on Yoga (or beginner's yoga guide)"]
-   User: "Baking essentials kit"
    Ideal Response: ["Mixing Bowls Set", "Measuring Cups and Spoons", "Baking Sheet", "9x13 Inch Baking Pan", "Whisk", "Spatula", "Oven Mitts", "Beginner's Baking Cookbook"]
-   User: "DIY tool set for beginners"
    Ideal Response: ["Hammer", "Screwdriver Set", "Pliers Set", "Adjustable Wrench", "Tape Measure", "Utility Knife", "Level", "Home DIY Basics Book"]
-   User: "Music production starter pack (electronic)"
    Ideal Response: ["Digital Audio Workstation (DAW) Software", "MIDI Keyboard Controller", "Audio Interface", "Studio Headphones", "Electronic Music Production for Beginners Guide"]
-   User: "Rock climbing gear basics (indoor)"
    Ideal Response: ["Climbing Shoes", "Harness", "Chalk Bag with Chalk", "Belay Device", "Locking Carabiner", "Indoor Climbing Techniques Book"]
-   User: "Sewing starter kit"
    Ideal Response: ["Sewing Machine (beginner model)", "Fabric Scissors", "Measuring Tape", "Pins and Pincushion", "Seam Ripper", "Assorted Thread Spools", "First Time Sewing Book"]
-   User: "Vlogging starter kit"
    Ideal Response: ["Camera with Flip Screen (or Smartphone)", "Tripod (tabletop or full-size)", "External Microphone", "Ring Light or Small LED Panel", "Beginner's Guide to Vlogging"]
-   User: "New apartment essentials"
    Ideal Response: ["Basic Cookware Set", "Dish Set & Cutlery", "Towels (Bath & Kitchen)", "Bedding", "Cleaning Supplies Starter Pack", "Basic Tool Kit", "Apartment Living Guide (optional)"]
-   User: "Knitting starter kit"
    Ideal Response: ["Knitting Needles (beginner size)", "Worsted Weight Yarn (light color)", "Stitch Markers", "Tapestry Needle", "Small Scissors", "Knitting for Beginners Book"]
-   User: "Watercolor painting starter kit"
    Ideal Response: ["Watercolor Paint Set (student grade)", "Watercolor Brush Set", "Watercolor Paper Pad", "Palette", "Water Containers (2)", "Beginner's Guide to Watercolor Painting"]
-   User: "New Pet (Dog) Starter Kit"
    Ideal Response: ["Dog Food and Water Bowls", "Dog Bed", "Leash", "Collar with ID Tag", "Age-Appropriate Dog Toys", "Dog Training for Dummies Book"]
-   User: "Home Brewing Starter Kit (Beer, extract brewing)"
    Ideal Response: ["Brew Kettle (Large Pot)", "Fermenter with Airlock", "Bottling Bucket with Spigot", "Auto-Siphon", "Sanitizer", "Ingredient Kit (Malt Extract, Hops, Yeast)", "How to Brew by John Palmer (or beginner's guide)"]
-   User: "Journaling Starter Kit"
    Ideal Response: ["Quality Notebook or Journal", "Set of Fine-Liner Pens", "Ruler", "Guide to Journaling Prompts and Techniques"]
-   User: "Survival Kit Basics (72-hour kit)"
    Ideal Response: ["Water (1 gallon per person per day)", "Non-Perishable Food (3-day supply)", "Battery-Powered or Hand-Crank Radio", "Flashlight", "First-Aid Kit", "Multi-Purpose Tool", "Emergency Survival Guide"]
-   User: "Beekeeping Starter Kit (Langstroth Hive)"
    Ideal Response: ["Complete Beehive (Boxes, Frames, Foundation)", "Beekeeper's Suit or Jacket with Veil", "Beekeeping Gloves", "Hive Tool", "Smoker", "Beekeeping for Dummies Book"]
-   User: "Fishing Starter Kit (Freshwater)"
    Ideal Response: ["Spinning Rod and Reel Combo", "Fishing Line", "Assortment of Hooks, Sinkers, and Bobbers", "Basic Lure Assortment", "Tackle Box", "Beginner's Guide to Freshwater Fishing"]
-   User: "Bread Making Starter Kit"
    Ideal Response: ["Large Mixing Bowl", "Dough Whisk or Bench Scraper", "Measuring Cups and Spoons", "Kitchen Scale", "Proofing Basket (Banneton)", "Dutch Oven (or similar baking vessel)", "Artisan Bread in Five Minutes a Day Book"]
-   User: "Language Learning Starter Kit (e.g., Spanish)"
    Ideal Response: ["Beginner's Spanish Textbook with Workbook", "Spanish-English Dictionary", "Flashcards (Physical or App)", "Subscription to Language Learning App (e.g., Duolingo, Babbel)", "Easy Spanish Reader Book"]
-   User: "Aquarium Starter Kit (Freshwater Tropical Fish)"
    Ideal Response: ["10-20 Gallon Glass or Acrylic Tank", "Aquarium Filter (Hang-on-Back or Internal)", "Aquarium Heater", "Substrate (Gravel or Sand)", "Basic Aquarium Decorations", "Water Conditioner", "Fish Food", "Beginner's Guide to Setting Up a Freshwater Aquarium"]
-   User: "Calligraphy Starter Kit (Modern)"
    Ideal Response: ["Oblique or Straight Pen Holder", "Assortment of Nibs (e.g., Nikko G, Brause Blue Pumpkin)", "Black India Ink", "Calligraphy Practice Paper Pad (Smooth, bleedproof)", "Modern Calligraphy for Beginners Workbook"]

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
      temperature: 0.2, // Lower temperature for more deterministic output
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('GPT did not return content for product types.');
    }

    console.log('Raw GPT response:', content); // Debug log

    let productTypes: string[];
    try {
      const parsedJson = JSON.parse(content);
      
      // Function to flatten nested arrays
      const flattenArray = (arr: any[]): string[] => {
        return arr.reduce((flat: string[], item) => {
          if (Array.isArray(item)) {
            return flat.concat(flattenArray(item));
          }
          return typeof item === 'string' ? flat.concat(item) : flat;
        }, []);
      };

      // Handle different response formats
      if (Array.isArray(parsedJson)) {
        productTypes = flattenArray(parsedJson);
      } else if (typeof parsedJson === 'object' && parsedJson !== null) {
        // Try to find an array in the object's values
        const possibleArrays = Object.values(parsedJson).filter(Array.isArray);
        if (possibleArrays.length > 0) {
          // Use the first array found
          productTypes = flattenArray(possibleArrays[0] as any[]);
        } else {
          // If no arrays found, try to use all string values
          productTypes = Object.values(parsedJson)
            .filter(value => typeof value === 'string')
            .map(String);
        }
      } else {
        throw new Error('GPT response is not a valid JSON array or object.');
      }
    } catch (parseError) {
      console.error('Error parsing GPT response:', parseError);
      console.log('Attempting to extract array directly from content');
      
      // Try to extract array using regex as a fallback
      const arrayMatch = content.match(/\[\s*("[^"]*"(?:\s*,\s*"[^"]*")*)\s*\]/);
      if (arrayMatch && arrayMatch[0]) {
        try {
          productTypes = JSON.parse(arrayMatch[0]);
        } catch (e) {
          throw new Error('Failed to parse product types from GPT response.');
        }
      } else {
        throw new Error('Could not extract valid product types from GPT response.');
      }
    }

    // Validate and clean the product types
    if (!Array.isArray(productTypes)) {
      throw new Error('Failed to extract a valid array of product types.');
    }

    // Filter and validate each product type
    productTypes = productTypes
      .filter(pt => typeof pt === 'string' && pt.trim() !== '')
      .map(pt => pt.trim());

    if (productTypes.length === 0) {
      throw new Error(`No valid product types found for "${activity}".`);
    }

    // Warning if outside expected range
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

    // Batch promises for concurrent execution
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
          return []; // Return empty array for this type on error to not fail the whole process
        }
        return response.json() as Promise<Product[]>;
      }).catch(networkError => {
        console.error(`Network error fetching products for type "${productType}":`, networkError);
        return []; // Return empty array on network error for this specific type
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

/*
The EXAMPLES section in the SYSTEM_PROMPT_FOR_ESSENTIAL_PRODUCT_TYPES above has been significantly expanded
to include a comprehensive list of common searches and their ideal product type outputs, with each
example kit aiming to include a relevant beginner's book or guide.
This provides more robust guidance to the GPT model for identifying distinct product types.
*/