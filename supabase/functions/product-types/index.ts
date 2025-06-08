import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import OpenAI from "https://esm.sh/openai@4.28.0";
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};
const SYSTEM_PROMPT_FOR_ESSENTIAL_PRODUCT_TYPES = `You are a highly intelligent starter kit generator. Your primary task is to create a logical, non-redundant, and complete list of product types for a user-specified activity. Your goal is always a **complete starter kit**.

**CORE LOGIC:**
1.  **Analyze the Activity and Must-Haves**: First, understand the user's main 'Activity' and their 'Must-Haves'.
2.  **Create Product Types for Must-Haves**: For each item in the user's 'Must-Haves', create a specific, contextualized \`product_type\`. For example:
    - If Activity is "Soccer" and Must-Have is "ball", the \`product_type\` MUST be "Soccer Ball".
    - If Activity is "Painting" and Must-Have is "brushes", the \`product_type\` MUST be "Paint Brushes".
3.  **Build Out the COMPLETE Kit**: After adding the user's must-haves, you MUST add **OTHER essential items** to the list. The final list should represent a **full and logical starter kit** for the activity.
4.  **MUST-HAVES ARE NOT THE WHOLE KIT**: The user's 'Must-Haves' are just a starting point. You are required to use your expert knowledge to add other essential product types to create a *complete* and well-rounded starter kit. For example, if the user only says their must-have is "a fast mouse" for gaming, you must still add the monitor, keyboard, headset, etc.
5.  **Avoid Redundancy**: Do not add an item if a contextualized version of it already exists from the must-haves. The kit should be concise.

**OUTPUT RULES:**
- Return a JSON object: \`{"product_items": [...]}\`.
- The \`product_items\` array must contain 3 to 8 objects.
- Each object must have: \`product_type\` (string), \`explanation\` (string, max 150 chars), and \`starting_price\` (number).
- The \`starting_price\` should be a reasonable, beginner-friendly starting price in USD.
- Use the 'Persona' (Age, Gender, Level) to tailor the explanation and starting price.
`;
let openai = null;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
if (OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: OPENAI_API_KEY
  });
} else {
  console.warn("OPENAI_API_KEY is not set. This function will not work without it.");
}
async function getEssentialProductTypesLogic(activity, advancedOptions) {
  if (!openai) {
    throw new Error("OpenAI client is not initialized. Check OPENAI_API_KEY environment variable.");
  }
  const persona = `
    - Age: ${advancedOptions?.age || 'Not specified'}
    - Gender: ${advancedOptions?.gender || 'Not specified'}
    - Level: ${advancedOptions?.level || 'Beginner'}
  `.trim();
  const userContent = `
    Activity: "${activity}"
    Persona:
    ${persona}
    Must-Haves: "${advancedOptions?.mustHaves || 'None'}"
    Other Notes: "${advancedOptions?.other || 'None'}"

    Generate the JSON output following all rules precisely.
  `.trim();
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT_FOR_ESSENTIAL_PRODUCT_TYPES
        },
        {
          role: "user",
          content: userContent
        }
      ],
      response_format: {
        type: "json_object"
      },
      temperature: 0.1
    });
    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('GPT did not return content for product types.');
    }
    let parsedProductItems = [];
    try {
      const parsedJson = JSON.parse(content);
      if (typeof parsedJson === 'object' && parsedJson !== null && Array.isArray(parsedJson.product_items)) {
        parsedProductItems = parsedJson.product_items.reduce((acc, item)=>{
          if (typeof item === 'object' && item !== null && typeof item.product_type === 'string' && item.product_type.trim() !== '' && typeof item.explanation === 'string' && item.explanation.trim() !== '' && typeof item.starting_price === 'number' && item.starting_price >= 0) {
            acc.push({
              product_type: item.product_type.trim(),
              explanation: item.explanation.trim(),
              starting_price: item.starting_price
            });
          } else {
            console.warn("Skipping invalid product_item entry during parsing:", item);
          }
          return acc;
        }, []);
      } else {
        throw new Error('GPT response is not a JSON object with a "product_items" array.');
      }
    } catch (parseError) {
      console.error('Error parsing GPT response:', parseError.message, 'Raw content:', content);
      throw new Error(`Failed to parse product types from GPT response. Original error: ${parseError.message}.`);
    }
    const uniqueProductItemsMap = new Map();
    parsedProductItems.forEach((item)=>{
      if (!uniqueProductItemsMap.has(item.product_type.toLowerCase())) {
        uniqueProductItemsMap.set(item.product_type.toLowerCase(), item);
      }
    });
    const finalProductItems = Array.from(uniqueProductItemsMap.values());
    if (finalProductItems.length === 0) {
      throw new Error(`No valid product types found for "${activity}" after parsing.`);
    }
    return finalProductItems;
  } catch (error) {
    console.error(`Error getting essential product types for "${activity}":`, error.message);
    throw new Error(`Failed to identify essential product types for "${activity}". Original error: ${error.message}`);
  }
}
serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response("ok", {
      headers: corsHeaders
    });
  }
  if (!openai) {
    return new Response(JSON.stringify({
      error: 'OpenAI client not initialized.'
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
  try {
    const { activity, ...advancedOptions } = await req.json();
    if (!activity || typeof activity !== 'string' || activity.trim() === "") {
      return new Response(JSON.stringify({
        error: 'Invalid request: "activity" string is required.'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    const productItems = await getEssentialProductTypesLogic(activity, advancedOptions);
    return new Response(JSON.stringify(productItems), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error in get-product-types function:', error.message);
    return new Response(JSON.stringify({
      error: error.message || 'An unexpected error occurred.'
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
