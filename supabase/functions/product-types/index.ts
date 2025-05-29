import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import OpenAI from "https://esm.sh/openai@4.28.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SYSTEM_PROMPT_FOR_ESSENTIAL_PRODUCT_TYPES = `You are an expert in curating starter kits for beginners.
Given a user's request for a starter kit (e.g., "Beginner cooking set", "Travel starter kit for Europe", "Chess starter kit"), your task is to identify 3 to 8 *truly distinct and functionally unique* essential product types that would form the core of such a kit. For each product type, provide a concise (1-2 sentences, max 150 characters) explanation of why it's essential for a beginner in the activity. One of these items MUST be a beginner-level instructional book or guide relevant to the activity unless the activity is so general (e.g. "Dorm Room Essentials") that a single book is not appropriate.

CRITICAL RULES FOR DISTINCT PRODUCT TYPES:
1.  **Focus on Functionality**: Each product type should represent a unique core function or purpose within the activity.
2.  **General Categories**: Product types should be general categories (e.g., "Chef's Knife", "Cutting Board") not specific brands, models, or highly granular variations unless those variations serve a fundamentally different purpose for a beginner.
3.  **Combine Core Components**: For items typically sold or used as a single functional unit (like a chess board and pieces), list the combined unit as a single product type (e.g., "Chess Set"). Do NOT list individual components (like "Chess Board" and "Chess Pieces" separately) if a combined set is standard for a beginner. Only list components separately if they are common, distinct purchases for a beginner for different primary functions (e.g., a specialized travel board vs. a main set).
4.  **CRITICAL: AVOID REDUNDANCY / ENSURE DISTINCT FUNCTIONALITY**: Ensure absolutely no two product types you list serve an almost identical primary purpose for a beginner. Each type must have a unique core function. For example, do NOT list "Frying Pan" and "Skillet" if they mean the same thing for a basic kit. Do NOT list "Running Shoes" and "Trainers" if the context implies general athletic footwear for a beginner.
5.  **Beginner Focus**: The kit is for someone starting out. Prioritize the absolute essentials.
6.  **Include a Book/Guide**: Unless highly impractical for the topic, one product type should be a "Beginner's Guide to [Activity]" or similar introductory book.

EXAMPLES:
-   User: "Beginner Photography Starter Kit"
    Ideal Response Object: {"product_items": [{"product_type": "DSLR Camera or Mirrorless Camera with Kit Lens", "explanation": "Captures high-quality images and offers creative control, essential for learning photography fundamentals."}, {"product_type": "Memory Card", "explanation": "Stores the photos and videos you capture; a fast and reliable card is crucial."}, {"product_type": "Camera Bag", "explanation": "Protects your camera gear from damage during transport and storage."}, {"product_type": "Tripod", "explanation": "Provides stability for sharp photos in low light, long exposures, and for self-portraits or group shots."}, {"product_type": "Lens Cleaning Kit", "explanation": "Keeps your lenses clean for optimal image quality."}, {"product_type": "Beginner's Guide to Digital Photography", "explanation": "Offers structured learning on camera settings, composition, and techniques."}]}
-   User: "Chess Starter Kit"
    Ideal Response Object: {"product_items": [{"product_type": "Chess Set (Board and Pieces)", "explanation": "The fundamental equipment needed to play the game of chess."}, {"product_type": "Chess Clock", "explanation": "Used for timed games, helping beginners practice time management in competitive play."}, {"product_type": "Beginner's Chess Strategy Book", "explanation": "Provides essential knowledge on openings, tactics, and endgames to improve understanding and skill."}]}

OUTPUT REQUIREMENTS:
1.  **Return a JSON object containing a single key "product_items". The value of "product_items" MUST be an array of objects, where each object has two keys: "product_type" (string) and "explanation" (string).**
    **For example: \`{"product_items": [{"product_type": "Product Type 1", "explanation": "Explanation 1"}, {"product_type": "Product Type 2", "explanation": "Explanation 2"}, {"product_type": "Beginner's Guide to Topic", "explanation": "Explanation for guide"}]}\`**
2.  The "product_items" array should contain between 3 and 8 product entries.
3.  **Ensure the entire response is a valid JSON object matching this structure.**`;

let openai: OpenAI | null = null;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

if (OPENAI_API_KEY) {
  openai = new OpenAI({ apiKey: OPENAI_API_KEY });
} else {
  console.warn("OPENAI_API_KEY is not set. This function will not work without it.");
}

interface ProductTypeWithExplanation {
  product_type: string;
  explanation: string;
}

async function getEssentialProductTypesLogic(activity: string): Promise<ProductTypeWithExplanation[]> {
  if (!openai) {
    throw new Error("OpenAI client is not initialized. Check OPENAI_API_KEY environment variable.");
  }
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: SYSTEM_PROMPT_FOR_ESSENTIAL_PRODUCT_TYPES },
        {
          role: "user",
          content: `Identify essential product types and their explanations for a "${activity}" starter kit. Follow all output requirements precisely. Return a JSON object with a "product_items" key.`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('GPT did not return content for product types.');
    }

    let parsedProductItems: ProductTypeWithExplanation[] = [];
    try {
      const parsedJson = JSON.parse(content);

      if (typeof parsedJson === 'object' && parsedJson !== null && Array.isArray(parsedJson.product_items)) {
        parsedProductItems = parsedJson.product_items.reduce((acc: ProductTypeWithExplanation[], item: any) => {
          if (
            typeof item === 'object' &&
            item !== null &&
            typeof item.product_type === 'string' && item.product_type.trim() !== '' &&
            typeof item.explanation === 'string' && item.explanation.trim() !== ''
          ) {
            acc.push({ 
              product_type: item.product_type.trim(), 
              explanation: item.explanation.trim() 
            });
          }
          return acc;
        }, []);
      } else {
        throw new Error('GPT response is not a JSON object with a "product_items" array of {product_type, explanation} objects.');
      }
    } catch (parseError: any) {
      console.error('Error parsing GPT response for product types and explanations:', parseError.message, 'Raw content:', content);
      throw new Error(`Failed to parse product types and explanations from GPT response. Original parse error: ${parseError.message}.`);
    }
    
    const uniqueProductItemsMap = new Map<string, ProductTypeWithExplanation>();
    parsedProductItems.forEach(item => {
        if (!uniqueProductItemsMap.has(item.product_type.toLowerCase())) {
            uniqueProductItemsMap.set(item.product_type.toLowerCase(), item);
        }
    });
    const finalProductItems = Array.from(uniqueProductItemsMap.values());

    if (finalProductItems.length === 0) {
      throw new Error(`No valid product types with explanations found for "${activity}" after parsing. Raw response: ${content}`);
    }

    return finalProductItems;

  } catch (error: any) {
    console.error(`Error getting essential product types and explanations for "${activity}":`, error.message);
    if (error.message.includes('GPT did not return content')) {
      throw new Error(`Sorry, the AI service might be unresponsive for "${activity}".`);
    } else if (error.message.toLowerCase().includes('parse') || error.message.toLowerCase().includes('gpt response is not a json object') || error.message.toLowerCase().includes('product_items')) {
      throw new Error(`Sorry, the AI response for "${activity}" was not in the expected format.`);
    }
    throw new Error(`Failed to identify essential product types and explanations for "${activity}". Original error: ${error.message}`);
  }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response("ok", { headers: corsHeaders });
  }

  if (!openai) {
    console.error("OpenAI client not initialized in serve function. Check API key.");
    return new Response(JSON.stringify({ error: 'OpenAI client not initialized on the server.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { activity } = await req.json();
    if (!activity || typeof activity !== 'string' || activity.trim() === "") {
      return new Response(JSON.stringify({ error: 'Invalid request: "activity" string is required.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const productItems = await getEssentialProductTypesLogic(activity);
    return new Response(JSON.stringify(productItems), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in get-product-types function:', error.message, error.stack ? error.stack : '');
    return new Response(JSON.stringify({ error: error.message || 'An unexpected error occurred.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});