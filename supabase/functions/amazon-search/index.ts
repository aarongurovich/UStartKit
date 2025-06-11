import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import OpenAI from "https://esm.sh/openai@4.28.0";
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};
const SYSTEM_PROMPT_FOR_BRANDS = `You are an expert product curator. Your task is to identify the best brands for a specific product type related to a user's activity.
  
**Instructions:**
1.  Analyze the user's 'Activity', 'Product Type', and 'Persona'.
2.  Based on this, identify 4 top-tier, reputable, and relevant brands.
3.  Consider the user's 'Level' (e.g., beginner, professional) to suggest appropriate brands.
4.  Do not explain your choices. Only provide the brand names.

**Output Rules:**
- Return a single JSON object: \`{"brands": [...]}\`.
- The \`brands\` array must contain  4 strings (the brand names).
`;
let openai = null;
const OPENAI_API_KEY_FUNC = Deno.env.get("OPENAI_API_KEY");
if (OPENAI_API_KEY_FUNC) {
  openai = new OpenAI({
    apiKey: OPENAI_API_KEY_FUNC
  });
} else {
  console.warn("OPENAI_API_KEY is not set for amazon-search function.");
}
async function getTopBrandsForProductType(activity, productType, advancedOptions, openAIClient) {
  if (!openAIClient) return [];
  const persona = `
    - Age: ${advancedOptions?.age || 'Not specified'}
    - Gender: ${advancedOptions?.gender || 'Not specified'}
    - Level: ${advancedOptions?.level || 'Beginner'}
  `.trim();
  const userContent = `
    Activity: "${activity}"
    Product Type: "${productType}"
    Persona:
    ${persona}
  `.trim();
  try {
    const completion = await openAIClient.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT_FOR_BRANDS
        },
        {
          role: "user",
          content: userContent
        }
      ],
      response_format: {
        type: "json_object"
      },
      temperature: 0.2
    });
    const content = completion.choices[0]?.message?.content;
    console.log(content);
    if (content) {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed.brands) && parsed.brands.length > 0) {
        return parsed.brands.map((b)=>String(b).trim()).filter((b)=>b);
      }
    }
    return [];
  } catch (error) {
    console.error(`Error fetching top brands for "${productType}":`, error.message);
    return [];
  }
}
async function getReasonForInclusion(productTitle, activity, productType, advancedOptions, openAIClient) {
  const level = advancedOptions?.level || 'beginner';
  const fallbackReason = `This ${productType.toLowerCase()} is a valuable item for a ${level} in ${activity}, helping to get started effectively.`;
  if (!openAIClient) return fallbackReason;
  try {
    const persona = `a ${advancedOptions?.age || ''} ${advancedOptions?.gender || ''} ${level}`.replace(/\s+/g, ' ').trim();
    const systemPrompt = `You are an expert product curator. Given a product title, its type, an activity, and a user persona, provide a concise (1-2 short sentences, max 150 characters) reason why this product is useful for this user. Focus on the benefit. Avoid repeating the product title. Output only the reason as a plain string.`;
    const userPrompt = `Activity: "${activity}"
Product Type: "${productType}"
Product Title: "${productTitle}"
Persona: "${persona}"
Reason for inclusion:`;
    const completion = await openAIClient.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: userPrompt
        }
      ],
      temperature: 0.3,
      max_tokens: 70
    });
    let reason = completion.choices[0]?.message?.content?.trim() || fallbackReason;
    return reason.length > 150 ? reason.substring(0, reason.lastIndexOf(' ', 147)) + '...' : reason;
  } catch (error) {
    console.error(`Error calling OpenAI for product reason ("${productTitle}"):`, error.message);
    return fallbackReason;
  }
}
function addAffiliateTag(productUrl) {
  if (!productUrl) return productUrl;
  try {
    const url = new URL(productUrl);
    if (!url.hostname.endsWith('amazon.com') && !url.hostname.endsWith('amzn.to')) return productUrl;
    url.searchParams.set('tag', Deno.env.get('AMAZON_AFFILIATE_TAG') || 'aarongurovich-20');
    return url.toString();
  } catch (error) {
    console.error('Error adding affiliate tag to URL:', productUrl, error);
    return productUrl;
  }
}
async function fetchAmazonApi(query, page = 1) {
  const rapidApiKey = Deno.env.get('RAPIDAPI_KEY');
  if (!rapidApiKey) throw new Error('RAPIDAPI_KEY is not configured.');
  const url = `https://real-time-amazon-data.p.rapidapi.com/search?query=${encodeURIComponent(query)}&page=${page}&country=US&sort_by=RELEVANCE&product_condition=ALL`;
  const options = {
    method: 'GET',
    headers: {
      'x-rapidapi-key': rapidApiKey,
      'x-rapidapi-host': 'real-time-amazon-data.p.rapidapi.com'
    }
  };
  const response = await fetch(url, options);
  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`API request failed for query "${query}": ${response.status}`, errorBody);
    throw new Error(`Amazon API request failed with status ${response.status}.`);
  }
  const data = await response.json();
  return data?.data?.products || [];
}
function formatProduct(apiProduct) {
  if (!apiProduct || !apiProduct.product_title || !apiProduct.product_photo || !apiProduct.product_price || !apiProduct.product_url) {
    return null;
  }
  const rating = parseFloat(apiProduct.product_star_rating);
  const reviews = parseInt(String(apiProduct.product_num_ratings || '0').replace(/,/g, ''), 10) || 0;
  const title = apiProduct.product_title.toLowerCase();
  const excludeKeywords = [
    'refurbished',
    'used',
    'renewed',
    'open box',
    'pre-owned',
    'replacement',
    'parts for',
    'add-on',
    'dlc',
    'accessory',
    'kit for',
    'subscription',
    'digital code',
    'download',
    'protection plan',
    'warranty',
    'toy',
    'miniature',
    'sticker',
    'decorative',
    'costume',
    'bulk',
    'case of',
    'pack of',
    'bundle',
    'refill',
    'cartridge',
    'variety pack',
    'box of',
    'jar of',
    'set of',
    'pack',
    'count'
  ];
  if (excludeKeywords.some((keyword)=>title.includes(keyword))) return null;
  const bulkRegex = [
    /\b\d+\s*[-]?pack\b/i,
    /\b\d+\s*count\b/i,
    /\b\d+\s*pk\b/i,
    /\b\d+\s*pcs\b/i,
    /\b\d+x\b/i,
    /pack of \d+/i
  ];
  if (bulkRegex.some((regex)=>regex.test(title))) return null;
  if (rating < 3.0 && reviews < 5) return null;
  return {
    name: apiProduct.product_title,
    reasonForInclusion: '',
    link: addAffiliateTag(apiProduct.product_url),
    image: apiProduct.product_photo,
    price: apiProduct.product_price,
    rating: !isNaN(rating) ? rating : 0,
    reviews: !isNaN(reviews) ? reviews : 0,
    tier: 'essential'
  };
}
function parsePrice(priceStr) {
  if (!priceStr) return Infinity;
  const priceMatch = priceStr.match(/[\$€£]?(\d{1,3}(?:,?\d{3})*(?:\.\d{2})?)/);
  if (!priceMatch || !priceMatch[1]) return Infinity;
  const numStr = priceMatch[1].replace(/,/g, '');
  const price = parseFloat(numStr);
  return isNaN(price) ? Infinity : price;
}
serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response("ok", {
      headers: corsHeaders
    });
  }
  try {
    const { baseKeywords, productType, ...advancedOptions } = await req.json();
    if (!baseKeywords || !productType) {
      return new Response(JSON.stringify({
        error: 'baseKeywords and productType are required.'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    let ageGenderKeyword = '';
    const age = advancedOptions?.age ? parseInt(advancedOptions.age, 10) : NaN;
    const gender = advancedOptions?.gender;

    if (!isNaN(age)) {
      if (age <= 12) {
        if (gender === 'Male') {
          ageGenderKeyword = 'boy';
        } else if (gender === 'Female') {
          ageGenderKeyword = 'girl';
        }
      } else { // age > 12
        if (gender === 'Male') {
          ageGenderKeyword = 'men';
        } else if (gender === 'Female') {
          ageGenderKeyword = 'women';
        }
      }
    }

    let candidateProducts = [];
    const topBrands = await getTopBrandsForProductType(baseKeywords, productType, advancedOptions, openai);
    const level = advancedOptions?.level || 'beginner';
    const generalQuery = `${ageGenderKeyword} ${level} ${baseKeywords} ${productType}`.replace(/\s+/g, ' ').trim();
    if (topBrands.length > 0) {
      const brandQueryPart = `(${topBrands.join(' OR ')})`;
      const brandQuery = `${brandQueryPart} ${generalQuery}`.replace(/\s+/g, ' ');
      candidateProducts = await fetchAmazonApi(brandQuery, 1);
    }
    if (candidateProducts.length < 20) {
      const generalProducts = await fetchAmazonApi(generalQuery, 1);
      candidateProducts.push(...generalProducts);
    }
    let suitableProducts = candidateProducts.map((p)=>formatProduct(p)).filter((p)=>p !== null);
    const productTypeCore = productType.toLowerCase().replace(/'s|s$/g, '').trim();
    const coreTerms = productTypeCore.split(' ').filter((term)=>term.length > 2);
    if (coreTerms.length > 0) {
      suitableProducts = suitableProducts.filter((p)=>{
        const titleLower = p.name.toLowerCase();
        return coreTerms.every((term)=>titleLower.includes(term));
      });
    }
    const uniqueProductsMap = new Map();
    suitableProducts.forEach((p)=>{
      if (!uniqueProductsMap.has(p.link)) {
        uniqueProductsMap.set(p.link, p);
      }
    });
    const uniqueProducts = Array.from(uniqueProductsMap.values());
    uniqueProducts.sort((a, b)=>parsePrice(a.price) - parsePrice(b.price));
    let finalTieredProducts = [];
    if (uniqueProducts.length >= 3) {
      const essential = {
        ...uniqueProducts[0],
        tier: 'essential'
      };
      const luxury = {
        ...uniqueProducts[uniqueProducts.length - 1],
        tier: 'luxury'
      };
      const middleProducts = uniqueProducts.slice(1, -2);
      let premium;
      if (middleProducts.length > 0) {
        premium = {
          ...middleProducts[Math.floor(middleProducts.length / 2)],
          tier: 'premium'
        };
      } else {
        premium = {
          ...uniqueProducts[1],
          tier: 'premium'
        };
      }
      finalTieredProducts.push(essential, premium, luxury);
    } else if (uniqueProducts.length === 2) {
      const essential = {
        ...uniqueProducts[0],
        tier: 'essential'
      };
      const premium = {
        ...uniqueProducts[1],
        tier: 'premium'
      };
      finalTieredProducts.push(essential, premium);
    } else if (uniqueProducts.length === 1) {
      const essential = {
        ...uniqueProducts[0],
        tier: 'essential'
      };
      finalTieredProducts.push(essential);
    }
    const reasonPromises = finalTieredProducts.map((p)=>getReasonForInclusion(p.name, baseKeywords, productType, advancedOptions, openai));
    const reasons = await Promise.all(reasonPromises);
    finalTieredProducts.forEach((p, i)=>{
      p.reasonForInclusion = reasons[i];
    });
    return new Response(JSON.stringify(finalTieredProducts), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Critical error in amazon-search:', error.message);
    return new Response(JSON.stringify({
      error: 'An unexpected error occurred.'
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});