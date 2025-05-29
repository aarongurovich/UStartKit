import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import OpenAI from "https://esm.sh/openai@4.28.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const RATE_LIMIT_WINDOW = 60000;
const MAX_REQUESTS_PER_WINDOW = 30;
const requestLog = new Map<string, number[]>();

interface AmazonProduct {
  product_title: string;
  product_photo: string;
  product_price: string;
  product_url: string;
  product_star_rating: string;
  product_num_ratings: string;
}

interface FormattedProduct {
  name: string;
  reasonForInclusion: string;
  link: string;
  image: string;
  price: string;
  rating: number;
  reviews: number;
  tier: 'essential' | 'premium' | 'luxury';
}

interface PriceRangeAPI {
    min?: number;
    max?: number;
}

let openai: OpenAI | null = null;
const OPENAI_API_KEY_FUNC = Deno.env.get("OPENAI_API_KEY");
if (OPENAI_API_KEY_FUNC) {
  openai = new OpenAI({ apiKey: OPENAI_API_KEY_FUNC });
} else {
  console.warn("OPENAI_API_KEY is not set for amazon-search function. Reason generation will use a fallback.");
}

async function getReasonForInclusion(productTitle: string, activity: string, productType: string, openAIClient: OpenAI | null): Promise<string> {
  const fallbackReason = `This ${productType.toLowerCase()} is a valuable item for beginners in ${activity}, helping to get started effectively.`;
  if (!openAIClient) {
    return fallbackReason;
  }
  try {
    const systemPrompt = `You are an expert product curator. Given a product title, its type, and an activity for a starter kit, provide a concise (1-2 short sentences, max 150 characters) reason why this product is useful for a beginner in that activity. Focus on the benefit. Avoid repeating the product title or type if possible. Output only the reason as a plain string.`;
    const userPrompt = `Activity: "${activity}"
Product Type: "${productType}"
Product Title: "${productTitle}"
Reason for inclusion in a starter kit for a beginner:`;

    const completion = await openAIClient.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 70,
      n: 1,
    });

    let reason = completion.choices[0]?.message?.content?.trim() || fallbackReason;
    reason = reason.replace(/^["']|["']$/g, '');
    return reason.length > 150 ? reason.substring(0, reason.lastIndexOf(' ', 147)) + '...' : reason;

  } catch (error) {
    console.error(`Error calling OpenAI for product reason ("${productTitle}"):`, error.message);
    return fallbackReason;
  }
}

function addAffiliateTag(productUrl: string): string {
  try {
    if (!productUrl) return productUrl;
    const url = new URL(productUrl);
    if (!url.hostname.endsWith('amazon.com') && !url.hostname.endsWith('amzn.to')) {
      return productUrl;
    }
    url.searchParams.set('tag', Deno.env.get('AMAZON_AFFILIATE_TAG') || 'aarongurovich-20');
    return url.toString();
  } catch (error) {
    console.error('Error adding affiliate tag to URL:', productUrl, error);
    return productUrl;
  }
}

function isRateLimited(clientIp: string): boolean {
  const now = Date.now();
  const requests = requestLog.get(clientIp) || [];
  const recentRequests = requests.filter(timestamp => now - timestamp < RATE_LIMIT_WINDOW);

  if (recentRequests.length >= MAX_REQUESTS_PER_WINDOW) {
    console.warn(`Rate limit exceeded for IP: ${clientIp}`);
    return true;
  }
  recentRequests.push(now);
  requestLog.set(clientIp, recentRequests);
  return false;
}

async function fetchAmazonApi(query: string, page: number = 1): Promise<AmazonProduct[]> {
  const rapidApiKeyFromEnv = Deno.env.get('RAPIDAPI_KEY');
  if (!rapidApiKeyFromEnv) {
    throw new Error('RAPIDAPI_KEY is not configured in environment variables.');
  }
  const apiKey = Deno.env.get('USER_PROVIDED_RAPIDAPI_KEY') || rapidApiKeyFromEnv;

  const url = `https://real-time-amazon-data.p.rapidapi.com/search?query=${encodeURIComponent(query)}&page=${String(page)}&country=US&sort_by=RELEVANCE&product_condition=ALL`;
  const options = {
    method: 'GET',
    headers: {
      'x-rapidapi-key': apiKey,
      'x-rapidapi-host': 'real-time-amazon-data.p.rapidapi.com'
    }
  };

  let response;
  try {
    response = await fetch(url, options);
  } catch (fetchError: any) {
    console.error(`Network error fetching from RapidAPI for query "${query}", page ${page}:`, fetchError);
    throw new Error(`Network error connecting to Amazon search API. ${fetchError.message}`);
  }

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`API request failed for query "${query}", page ${page}: ${response.status}`, errorBody);
    if (response.status === 401 || response.status === 403) {
        throw new Error(`Amazon API request failed: Authentication or permission error (status ${response.status}). Check API key.`);
    } else if (response.status === 429) {
        throw new Error(`Amazon API request failed: Rate limit exceeded with the third-party API (status ${response.status}).`);
    }
    throw new Error(`Amazon API request failed with status ${response.status}.`);
  }

  const data = await response.json();
  if (data && data.data && Array.isArray(data.data.products)) {
    return data.data.products;
  }
  console.warn(`No products array in API response for query "${query}", page ${page}. Data:`, data);
  return [];
}

function formatProduct(apiProduct: AmazonProduct, tier: 'essential' | 'premium' | 'luxury', reason: string): FormattedProduct | null {
  if (!apiProduct || !apiProduct.product_title || !apiProduct.product_photo || !apiProduct.product_price || !apiProduct.product_url || !apiProduct.product_url.includes('amazon.com')) {
    return null;
  }

  const rating = parseFloat(apiProduct.product_star_rating);
  const reviews = parseInt(String(apiProduct.product_num_ratings || '0').replace(/,/g, ''), 10) || 0;
  const title = apiProduct.product_title.toLowerCase();

  const excludeKeywords = [
    'refurbished', 'used', 'renewed', 'open box', 'pre-owned',
    'replacement bulb', 'spare tire', 'repair kit', 'parts for',
    'add-on content', 'dlc', 'accessory bundle', 'kit only for',
    'subscription service', 'digital code', 'download card',
    'protection plan', 'extended warranty', 'insurance policy',
    'toy version', 'play set model', 'miniature',
    'sticker sheet', 'decorative', 'costume piece',
  ];

  if (excludeKeywords.some(keyword => title.includes(keyword))) {
    return null;
  }
 
  if (rating < 3.0 && reviews < 5) return null;

  return {
    name: apiProduct.product_title,
    reasonForInclusion: reason,
    link: addAffiliateTag(apiProduct.product_url),
    image: apiProduct.product_photo,
    price: apiProduct.product_price,
    rating: !isNaN(rating) ? rating : 0,
    reviews: !isNaN(reviews) ? reviews : 0,
    tier: tier,
  };
}

function parsePrice(priceStr: string): number {
    if (!priceStr) return Infinity;
    const firstPriceMatch = priceStr.match(/[\$€£]?(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)/);
    if (!firstPriceMatch || !firstPriceMatch[1]) return Infinity;
    const numStr = firstPriceMatch[1].replace(/[^0-9.]/g, '');
    const price = parseFloat(numStr);
    return isNaN(price) ? Infinity : price;
}

function extractBrand(productTitle: string): string | null {
    if (!productTitle) return null;
    const knownBrands = [
      "Sony", "Samsung", "Apple", "LG", "Microsoft", "Dell", "HP", "Lenovo", "Asus", "Acer",
      "KitchenAid", "Cuisinart", "OXO", "Ninja", "Instant Pot", "Keurig", "Breville", "Vitamix",
      "Logitech", "Anker", "Bose", "JBL", "Sennheiser", "Audio-Technica", "Razer", "Corsair",
      "Canon", "Nikon", "GoPro", "DJI", "Fujifilm", "Olympus",
      "Stanley", "DeWalt", "Craftsman", "Makita", "Bosch", "Milwaukee", 
      "Nike", "Adidas", "Under Armour", "Puma", "Lululemon", "Patagonia", "The North Face", 
      "Fisher-Price", "LEGO", "Hasbro", "Mattel", "Playmobil", 
      "Amazon Basics", "Utopia Kitchen", "Simple Modern"
    ];
    const titleLower = productTitle.toLowerCase();
    for (const brand of knownBrands) {
      const brandLower = brand.toLowerCase();
      if (titleLower.includes(brandLower + " ") || titleLower.includes(brandLower + "-") || titleLower.startsWith(brandLower + " ") || titleLower === brandLower) {
        return brand;
      }
    }
  
    const words = productTitle.split(/[\s-]+/); 
    if (words.length > 0) {
      const firstWord = words[0];
      if (firstWord.length > 2 && firstWord === firstWord.toUpperCase() && /^[A-Z0-9]+$/.test(firstWord)) { 
        return firstWord;
      }
      if (firstWord.length >= 3 && /^[A-Z][a-zA-Z0-9]+$/.test(firstWord)) {
          const genericStarters = ["The", "All", "New", "For", "Pro", "Set", "Kit", "Pack", "Hot", "Top", "Best", "Big", "Eco", "Ultra", "Super", "Multi", "Heavy", "Duty", "Digital", "Analog", "Mini", "Smart", "Premium", "Luxury", "Essential", "Professional", "Beginner"];
          if (!genericStarters.map(s => s.toLowerCase()).includes(firstWord.toLowerCase())) {
              return firstWord;
          }
      }
    }
    return null; 
  }

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown_ip';
    if (isRateLimited(clientIp)) {
      return new Response(JSON.stringify({ error: 'Too many requests. Please try again in a minute.' }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '60' }
      });
    }

    const { baseKeywords, productType, priceRange } = await req.json() as {
        baseKeywords: string;
        productType: string;
        priceRange?: PriceRangeAPI;
    };

    if (!baseKeywords || typeof baseKeywords !== 'string' || baseKeywords.trim() === '' ||
        !productType || typeof productType !== 'string' || productType.trim() === '') {
      return new Response(JSON.stringify({ error: 'Invalid request: baseKeywords and productType are required and cannot be empty.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const finalTieredProducts: FormattedProduct[] = [];
    const fullQuery = `${baseKeywords.trim()} ${productType.trim()}`.replace(/\s+/g, ' ');

    let candidateProducts: AmazonProduct[] = [];
    try {
        const page1Products = await fetchAmazonApi(fullQuery, 1);
        candidateProducts.push(...page1Products);
        if (page1Products.length > 0 && page1Products.length < 15 && candidateProducts.length < 25 ) { 
             const page2Products = await fetchAmazonApi(fullQuery, 2);
             candidateProducts.push(...page2Products);
        }
    } catch (e: any) {
        console.error(`Failed to fetch products from Amazon for query: ${fullQuery}`, e.message);
        return new Response(JSON.stringify([]), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
    
    const initiallyValidProducts = candidateProducts.filter(p => p.product_photo && p.product_price && p.product_url && p.product_url.includes('amazon.com'));

    let suitableRawProducts = initiallyValidProducts
        .map(p => { 
            const tempFormatted = formatProduct(p, 'essential', ''); 
            return tempFormatted ? p : null;
        })
        .filter((p): p is AmazonProduct => p !== null);

    if (priceRange && (typeof priceRange.min === 'number' || typeof priceRange.max === 'number')) {
        suitableRawProducts = suitableRawProducts.filter(p => {
            const productPriceNum = parsePrice(p.product_price);
            if (isNaN(productPriceNum)) return false; 

            const minOK = typeof priceRange.min === 'number' ? productPriceNum >= priceRange.min : true;
            const maxOK = typeof priceRange.max === 'number' ? productPriceNum <= priceRange.max : true;
            return minOK && maxOK;
        });
    }
    
    // Title relevance filtering
    const productTypeCore = productType.toLowerCase()
        .replace(/(beginner's guide to|guide to|book on|for beginners|set|kit)/g, "") // Remove common modifiers
        .replace(/s\b/g, "") // Remove plural 's' at end of words for better matching
        .trim();
    const coreTerms = productTypeCore.split(' ')
        .filter(term => term.length > 2 && !["a", "an", "the", "and", "or", "for", "with", "of", "in", "to", "is", "are"].includes(term));

    if (coreTerms.length > 0) {
        suitableRawProducts = suitableRawProducts.filter(p => {
            const titleLower = p.product_title.toLowerCase().replace(/s\b/g, ""); // Normalize title plurals too
            return coreTerms.every(term => titleLower.includes(term));
        });
    }
    
    suitableRawProducts.sort((a, b) => parsePrice(a.product_price) - parsePrice(b.product_price));


    if (suitableRawProducts.length === 0) {
      console.warn(`No suitable products found for: ${fullQuery} (product type: "${productType}", core terms: "${coreTerms.join(',')}") after all filters. Initial candidates: ${candidateProducts.length}`);
      return new Response(JSON.stringify([]), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const usedProductLinks = new Set<string>();
    let essentialProduct: AmazonProduct | undefined;
    let premiumProduct: AmazonProduct | undefined;
    let luxuryProduct: AmazonProduct | undefined;
    let essentialBrand: string | null = null;

    // 1. Select Essential Product
    for (const p of suitableRawProducts) {
        if (usedProductLinks.has(addAffiliateTag(p.product_url))) continue;
        const rating = parseFloat(p.product_star_rating) || 0;
        const reviews = parseInt(String(p.product_num_ratings || '0').replace(/,/g, ''), 10) || 0;
        if (rating >= 3.5 && reviews >=10) { 
            essentialProduct = p;
            break;
        }
    }
    if (!essentialProduct && suitableRawProducts.length > 0) { 
        essentialProduct = suitableRawProducts.find(p => !usedProductLinks.has(addAffiliateTag(p.product_url)));
    }

    if (essentialProduct) {
        usedProductLinks.add(addAffiliateTag(essentialProduct.product_url));
        essentialBrand = extractBrand(essentialProduct.product_title);
    }

    // 2. Select Luxury Product
    const luxuryCandidates = suitableRawProducts.filter(p => !usedProductLinks.has(addAffiliateTag(p.product_url)));
    luxuryCandidates.sort((a,b) => parsePrice(b.product_price) - parsePrice(a.product_price)); 

    for (const p of luxuryCandidates) {
        const rating = parseFloat(p.product_star_rating) || 0;
        const reviews = parseInt(String(p.product_num_ratings || '0').replace(/,/g, ''), 10) || 0;
        if (rating >= 4.0 && reviews >= 20) { 
            if (essentialProduct && parsePrice(p.product_price) <= parsePrice(essentialProduct.product_price) * 1.2) continue; 
            
            const currentBrand = extractBrand(p.product_title);
            if (essentialBrand && currentBrand === essentialBrand) {
                luxuryProduct = p; 
                break;
            }
            if (!luxuryProduct) luxuryProduct = p; 
        }
    }
    if (!luxuryProduct && luxuryCandidates.length > 0) { 
        luxuryProduct = luxuryCandidates.find(p => (!essentialProduct || parsePrice(p.product_price) > parsePrice(essentialProduct.product_price)));
    }


    if (luxuryProduct) {
        usedProductLinks.add(addAffiliateTag(luxuryProduct.product_url));
    }

    // 3. Select Premium Product
    const premiumCandidatePool = suitableRawProducts.filter(p => !usedProductLinks.has(addAffiliateTag(p.product_url)));
    let bestPremiumCandidate: AmazonProduct | undefined;
    let bestPremiumScore = -1;

    for (const p of premiumCandidatePool) {
        const price = parsePrice(p.product_price);
        const rating = parseFloat(p.product_star_rating) || 0;
        const reviews = parseInt(String(p.product_num_ratings || '0').replace(/,/g, ''), 10) || 0;

        if (rating < 3.8 || reviews < 15) continue;

        let priceOk = true;
        const essentialPrice = essentialProduct ? parsePrice(essentialProduct.product_price) : -1;
        const luxuryPrice = luxuryProduct ? parsePrice(luxuryProduct.product_price) : Infinity;

        if (essentialProduct && price <= essentialPrice) priceOk = false;
        if (luxuryProduct && price >= luxuryPrice) priceOk = false;
        if (!priceOk) continue;
        
        if (essentialProduct && !luxuryProduct && price <= essentialPrice) continue;
        if (!essentialProduct && luxuryProduct && price >= luxuryPrice) continue;


        let score = rating; 
        const currentBrand = extractBrand(p.product_title);
        if (essentialBrand && currentBrand && currentBrand === essentialBrand) {
            score += 0.5; 
        }

        if (score > bestPremiumScore) {
            bestPremiumScore = score;
            bestPremiumCandidate = p;
        }
    }
    premiumProduct = bestPremiumCandidate;

    if (premiumProduct) {
        usedProductLinks.add(addAffiliateTag(premiumProduct.product_url));
    }
    
    if (essentialProduct) {
        const reason = await getReasonForInclusion(essentialProduct.product_title, baseKeywords, productType, openai);
        const formatted = formatProduct(essentialProduct, 'essential', reason);
        if (formatted) finalTieredProducts.push(formatted);
    }
    if (premiumProduct) {
        let isDuplicate = false;
        if(essentialProduct && premiumProduct.product_url === essentialProduct.product_url) isDuplicate = true;
        if(luxuryProduct && premiumProduct.product_url === luxuryProduct.product_url) isDuplicate = true;
        
        if(!isDuplicate) {
            const reason = await getReasonForInclusion(premiumProduct.product_title, baseKeywords, productType, openai);
            const formatted = formatProduct(premiumProduct, 'premium', reason);
            if (formatted) finalTieredProducts.push(formatted);
        }
    }
    if (luxuryProduct) {
         let isDuplicate = false;
        if(essentialProduct && luxuryProduct.product_url === essentialProduct.product_url) isDuplicate = true;
        if(premiumProduct && luxuryProduct.product_url === premiumProduct.product_url) isDuplicate = true;

        if(!isDuplicate){
            const reason = await getReasonForInclusion(luxuryProduct.product_title, baseKeywords, productType, openai);
            const formatted = formatProduct(luxuryProduct, 'luxury', reason);
            if (formatted) finalTieredProducts.push(formatted);
        }
    }
    
    finalTieredProducts.sort((a,b) => {
        const tierRank = { essential: 1, premium: 2, luxury: 3 };
        if (tierRank[a.tier] !== tierRank[b.tier]) {
            return tierRank[a.tier] - tierRank[b.tier];
        }
        return parsePrice(a.price) - parsePrice(b.price);
    });


    return new Response(JSON.stringify(finalTieredProducts), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Critical error in Supabase function amazon-search:', error.message, error.stack);
    const errorMessage = error instanceof Error ? error.message : 'Unknown server error.';
    const clientSafeErrorMessage = (status: number, msg: string) => {
        if (status === 429) return msg;
        if (msg.includes("Authentication or permission error")) return "Problem connecting to product search service (Auth).";
        if (msg.includes("Rate limit exceeded with the third-party API")) return "Product search service is temporarily busy. Please try again shortly.";
        if (msg.includes("Amazon API request failed")) return "Problem connecting to product search service.";
        return 'An unexpected error occurred while searching for products.';
    };
    const status = (error instanceof Error && error.message.includes('Rate limit')) || (error instanceof Error && error.message.includes('status 429')) ? 429 :
                   (error instanceof Error && error.message.includes('status 400')) ? 400 : 500;

    return new Response(JSON.stringify({ error: clientSafeErrorMessage(status, errorMessage) }), {
      status, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});