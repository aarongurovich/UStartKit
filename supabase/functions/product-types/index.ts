import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import OpenAI from "https://esm.sh/openai@4.28.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

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
    Ideal Response Object: {"product_types": ["DSLR Camera or Mirrorless Camera with Kit Lens", "Memory Card", "Camera Bag", "Tripod", "Lens Cleaning Kit", "Beginner's Guide to Digital Photography"]}
-   User: "Home Office Setup Essentials"
    Ideal Response Object: {"product_types": ["Desk", "Ergonomic Office Chair", "External Monitor", "Keyboard", "Mouse", "Webcam", "Desk Organizer", "Guide to Home Office Ergonomics and Productivity"]}
-   User: "Chess Starter Kit"
    Ideal Response Object: {"product_types": ["Chess Set (Board and Pieces)", "Chess Clock", "Beginner's Chess Strategy Book"]}

OUTPUT REQUIREMENTS:
1.  **Return a JSON object containing a single key "product_types". The value of "product_types" MUST be an array of strings.**
    **For example: \`{"product_types": ["Product Type 1", "Product Type 2", "Beginner's Guide to Topic"]}\`**
2.  The "product_types" array should contain between 3 and 8 product types.
3.  **Ensure the entire response is a valid JSON object matching this structure.**`;

let openai: OpenAI | null = null;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

if (OPENAI_API_KEY) {
  openai = new OpenAI({ apiKey: OPENAI_API_KEY });
} else {
  console.warn("OPENAI_API_KEY is not set. This function will not work without it.");
}

async function getEssentialProductTypesLogic(activity: string): Promise<string[]> {
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
          content: `Identify essential product types for a "${activity}" starter kit. Follow all output requirements precisely. Return a JSON object with a "product_types" key.`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('GPT did not return content for product types.');
    }

    let parsedProductTypes: string[] = [];
    try {
      const parsedJson = JSON.parse(content);

      if (typeof parsedJson === 'object' && parsedJson !== null && Array.isArray(parsedJson.product_types)) {
        parsedProductTypes = parsedJson.product_types.reduce((flat: string[], item: any) => {
          if (typeof item === 'string' && item.trim() !== '') {
            return flat.concat(item.trim());
          }
          // If item is an array itself (though not expected with this prompt), flatten it.
          if (Array.isArray(item)) {
             return flat.concat(item.filter(subItem => typeof subItem === 'string' && subItem.trim() !== '').map(subItem => subItem.trim()));
          }
          return flat;
        }, []);
      } else {
        throw new Error('GPT response is not a JSON object with a "product_types" array, or "product_types" is not an array.');
      }
    } catch (parseError: any) {
      console.error('Error parsing GPT response for product types:', parseError.message, 'Raw content:', content);
      throw new Error(`Failed to parse product types from GPT response. Original parse error: ${parseError.message}.`);
    }
    
    let finalProductTypes = parsedProductTypes
      .filter(pt => typeof pt === 'string' && pt.trim() !== '')
      .map(pt => pt.trim());

    finalProductTypes = [...new Set(finalProductTypes)];

    if (finalProductTypes.length === 0) {
      throw new Error(`No valid product types found for "${activity}" after parsing. Raw response: ${content}`);
    }

    return finalProductTypes;

  } catch (error: any) {
    console.error(`Error getting essential product types for "${activity}":`, error.message);
    if (error.message.includes('GPT did not return content')) {
      throw new Error(`Sorry, the AI service might be unresponsive for "${activity}".`);
    } else if (error.message.toLowerCase().includes('parse') || error.message.toLowerCase().includes('gpt response is not a json object') || error.message.toLowerCase().includes('product_types')) {
      throw new Error(`Sorry, the AI response for "${activity}" was not in the expected format.`);
    }
    throw new Error(`Failed to identify essential product types for "${activity}". Original error: ${error.message}`);
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

    const productTypes = await getEssentialProductTypesLogic(activity);
    return new Response(JSON.stringify(productTypes), {
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