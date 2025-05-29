import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import OpenAI from "https://esm.sh/openai@4.28.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SYSTEM_PROMPT_FOR_ESSENTIAL_PRODUCT_TYPES = `You are an expert in curating starter kits for beginners. Your primary goal is to identify **ALL INDISPENSABLE product types that are LITERALLY REQUIRED for a beginner to start a given activity.** The list must be comprehensive, ensuring that if a beginner acquired all listed product types, they would have everything they need to engage in the activity. Do not omit any product type if its absence would prevent the user from starting.

Given a user's request for a starter kit, your task is to identify 3 to 8 such indispensable, truly distinct, and functionally unique essential product types.
For each product type:
1. Provide a concise (1-2 sentences, max 150 characters) explanation of why it's essential for a beginner in the activity.
2. Suggest a beginner-friendly price range (min and max USD) suitable for a starter kit item of this type. The range should be reasonable and broad enough to find options. For example, for a "Beginner's Ukulele", a range like min: 30, max: 100 might be appropriate. For a "Travel Adapter", min: 10, max: 25. If a type is typically very cheap (e.g. "Pencils"), min could be 1 or 5. If a type is inherently expensive (e.g. "Entry-level DSLR Camera Body"), reflect that but keep it beginner-oriented.

**EXAMPLE OF REQUIRED COMPLETENESS:**
- User: "Gaming Starter Kit"
Ideal Response Object: {"product_items": [
    {"product_type": "Gaming PC", "explanation": "The core system for playing games, processing graphics, and running game software.", "price_range": {"min": 700, "max": 1500}},
    {"product_type": "Gaming Monitor", "explanation": "Displays the game visuals; refresh rate and response time are key for a good experience.", "price_range": {"min": 150, "max": 400}},
    {"product_type": "Gaming Keyboard", "explanation": "Primary input device for game controls and communication.", "price_range": {"min": 30, "max": 150}},
    {"product_type": "Gaming Mouse", "explanation": "Essential for precise aiming and interaction in many games.", "price_range": {"min": 20, "max": 80}},
    {"product_type": "Gaming Headset", "explanation": "Provides immersive audio and microphone for team communication.", "price_range": {"min": 30, "max": 120}},
    {"product_type": "Gaming Chair", "explanation": "Offers ergonomic support for comfort during long gaming sessions.", "price_range": {"min": 100, "max": 300}},
    {"product_type": "Gaming Desk", "explanation": "Provides a stable and spacious surface for all gaming peripherals.", "price_range": {"min": 80, "max": 250}},
    {"product_type": "Gaming Mousepad", "explanation": "Provides a smooth and consistent surface for optimal mouse tracking and performance.", "price_range": {"min": 10, "max": 40}}
]}
This example illustrates that if any of these items were missing, the user could not fully start their gaming activity as envisioned by a comprehensive starter kit. Apply this level of "literally everything you need" thinking to all requests.

CRITICAL RULES FOR DISTINCT PRODUCT TYPES:
1.  **Indispensable & Functional**: Each product type must be literally required and represent a unique core function.
2.  **General Categories**: List general categories (e.g., "Gaming PC," not "Specific CPU Model").
3.  **Combine Core Components (where appropriate)**: For items typically sold or used as a single functional unit (like a "Gaming PC" or a "Chess Set"), list the combined unit. Do NOT break down a "Gaming PC" into CPU, GPU, RAM, etc., as these are components of that single product type. However, peripherals like monitor, keyboard, mouse are distinct product types necessary for using the PC for gaming.
4.  **CRITICAL: AVOID REDUNDANCY / ENSURE DISTINCT FUNCTIONALITY**: Ensure absolutely no two product types you list serve an almost identical primary purpose.
5.  **Beginner Focus**: The kit is for someone starting out. Price ranges should be beginner-friendly.
6.  **Book/Guide (If Applicable)**: Include an instructional guide if relevant for learning the activity.

OUTPUT REQUIREMENTS:
1.  Return a JSON object containing a single key "product_items". Value is an array of objects, each with "product_type" (string), "explanation" (string), and "price_range" (object with "min": number, "max": number).
2.  The "product_items" array should contain between 3 and 8 product entries. (Strive for completeness within this limit; if an activity truly needs more fundamental types, list the most critical ones up to 8).
3.  Ensure "min" and "max" in "price_range" are numbers. Max must be >= Min. Min >= 0.
4.  Ensure the entire response is a valid JSON object matching this structure.`;

let openai: OpenAI | null = null;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

if (OPENAI_API_KEY) {
  openai = new OpenAI({ apiKey: OPENAI_API_KEY });
} else {
  console.warn("OPENAI_API_KEY is not set. This function will not work without it.");
}

interface PriceRange {
  min: number;
  max: number;
}

interface ProductTypeDefinition {
  product_type: string;
  explanation: string;
  price_range: PriceRange;
}

async function getEssentialProductTypesLogic(activity: string): Promise<ProductTypeDefinition[]> {
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
          content: `Identify essential product types, their explanations, and beginner-friendly price ranges for a "${activity}" starter kit, ensuring all literally required items are covered. Follow all output requirements precisely. Return a JSON object with a "product_items" key.`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('GPT did not return content for product types.');
    }

    let parsedProductItems: ProductTypeDefinition[] = [];
    try {
      const parsedJson = JSON.parse(content);

      if (typeof parsedJson === 'object' && parsedJson !== null && Array.isArray(parsedJson.product_items)) {
        parsedProductItems = parsedJson.product_items.reduce((acc: ProductTypeDefinition[], item: any) => {
          if (
            typeof item === 'object' && item !== null &&
            typeof item.product_type === 'string' && item.product_type.trim() !== '' &&
            typeof item.explanation === 'string' && item.explanation.trim() !== '' &&
            typeof item.price_range === 'object' && item.price_range !== null &&
            typeof item.price_range.min === 'number' && typeof item.price_range.max === 'number' &&
            item.price_range.min >= 0 && item.price_range.min <= item.price_range.max
          ) {
            acc.push({
              product_type: item.product_type.trim(),
              explanation: item.explanation.trim(),
              price_range: { 
                min: item.price_range.min, 
                max: item.price_range.max 
              }
            });
          } else {
             console.warn("Skipping invalid product_item entry during parsing:", item);
          }
          return acc;
        }, []);
      } else {
        throw new Error('GPT response is not a JSON object with a "product_items" array of {product_type, explanation, price_range} objects.');
      }
    } catch (parseError: any) {
      console.error('Error parsing GPT response for product types, explanations, and price ranges:', parseError.message, 'Raw content:', content);
      throw new Error(`Failed to parse product types, explanations, and price ranges from GPT response. Original parse error: ${parseError.message}.`);
    }
    
    const uniqueProductItemsMap = new Map<string, ProductTypeDefinition>();
    parsedProductItems.forEach(item => {
        if (!uniqueProductItemsMap.has(item.product_type.toLowerCase())) {
            uniqueProductItemsMap.set(item.product_type.toLowerCase(), item);
        }
    });
    const finalProductItems = Array.from(uniqueProductItemsMap.values());

    if (finalProductItems.length === 0) {
      throw new Error(`No valid product types with explanations and price ranges found for "${activity}" after parsing. Raw response: ${content}`);
    }

    return finalProductItems;

  } catch (error: any) {
    console.error(`Error getting essential product types, explanations, and price ranges for "${activity}":`, error.message);
    if (error.message.includes('GPT did not return content')) {
      throw new Error(`Sorry, the AI service might be unresponsive for "${activity}".`);
    } else if (error.message.toLowerCase().includes('parse') || error.message.toLowerCase().includes('gpt response is not a json object') || error.message.toLowerCase().includes('product_items')) {
      throw new Error(`Sorry, the AI response for "${activity}" was not in the expected format.`);
    }
    throw new Error(`Failed to identify essential product types, explanations, and price ranges for "${activity}". Original error: ${error.message}`);
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