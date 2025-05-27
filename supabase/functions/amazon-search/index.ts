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

  if (tier === 'essential' && rating < 3.5 && reviews < 10) return null;
  if (rating < 3.0) return null;

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

    const { baseKeywords, productType } = await req.json();
    if (!baseKeywords || typeof baseKeywords !== 'string' || baseKeywords.trim() === '' ||
        !productType || typeof productType !== 'string' || productType.trim() === '') {
      return new Response(JSON.stringify({ error: 'Invalid request: baseKeywords and productType are required and cannot be empty.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const tieredProducts: FormattedProduct[] = [];
    const fullQuery = `${baseKeywords.trim()} ${productType.trim()}`.replace(/\s+/g, ' ');

    let candidateProducts: AmazonProduct[] = [];
    try {
        const page1Products = await fetchAmazonApi(fullQuery, 1);
        candidateProducts.push(...page1Products);
        if (page1Products.length > 0 && page1Products.length < 10) {
             const page2Products = await fetchAmazonApi(fullQuery, 2);
             candidateProducts.push(...page2Products);
        }
    } catch (e: any) {
        console.error(`Failed to fetch products from Amazon for query: ${fullQuery}`, e.message);
        return new Response(JSON.stringify([]), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

    const initiallyFormattedProducts = candidateProducts
        .map(p => formatProduct(p, 'essential', 'Placeholder reason'))
        .filter((p): p is FormattedProduct => p !== null && !!p.price && !!p.link);

    const suitableRawProducts = candidateProducts
        .filter(origP => initiallyFormattedProducts.some(fp => addAffiliateTag(origP.product_url) === fp.link))
        .sort((a, b) => parsePrice(a.product_price) - parsePrice(b.product_price));


    if (suitableRawProducts.length === 0) {
      console.warn(`No suitable formatted products found for: ${fullQuery} after filtering. Candidate count: ${candidateProducts.length}`);
      return new Response(JSON.stringify([]), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const usedProductLinks = new Set<string>();

    let essentialProductDefinition: AmazonProduct | undefined = suitableRawProducts.find(p => {
        const rating = parseFloat(p.product_star_rating) || 0;
        return rating >= 3.8;
    });
     if (!essentialProductDefinition && suitableRawProducts.length > 0) {
        essentialProductDefinition = suitableRawProducts[0];
    }

    if (essentialProductDefinition) {
        const reason = await getReasonForInclusion(essentialProductDefinition.product_title, baseKeywords, productType, openai);
        const formatted = formatProduct(essentialProductDefinition, 'essential', reason);
        if (formatted && !usedProductLinks.has(formatted.link)) {
            tieredProducts.push(formatted);
            usedProductLinks.add(formatted.link);
        }
    }

    let luxuryProductDefinition: AmazonProduct | undefined;
    const topRatedHigherPriceCandidates = suitableRawProducts
        .slice(Math.floor(suitableRawProducts.length / 2))
        .sort((a,b) => (parseFloat(b.product_star_rating) || 0) - (parseFloat(a.product_star_rating) || 0));

    for (const p of topRatedHigherPriceCandidates) {
        if ((parseFloat(p.product_star_rating) || 0) >= 4.2 && !usedProductLinks.has(addAffiliateTag(p.product_url))) {
            luxuryProductDefinition = p;
            break;
        }
    }
     if (!luxuryProductDefinition && suitableRawProducts.length > 0) {
        for (let i = suitableRawProducts.length - 1; i >= 0; i--) {
            const p = suitableRawProducts[i];
            if (!usedProductLinks.has(addAffiliateTag(p.product_url))) {
                 luxuryProductDefinition = p;
                 break;
            }
        }
    }

    if (luxuryProductDefinition) {
        const reason = await getReasonForInclusion(luxuryProductDefinition.product_title, baseKeywords, productType, openai);
        const formatted = formatProduct(luxuryProductDefinition, 'luxury', reason);
        if (formatted && !usedProductLinks.has(formatted.link)) {
            tieredProducts.push(formatted);
            usedProductLinks.add(formatted.link);
        }
    }

    let premiumProductDefinition: AmazonProduct | undefined;
    const midPoint = Math.floor(suitableRawProducts.length / 2);
    const premiumCandidates = suitableRawProducts.slice().sort((a,b) => {
        const ratingDiff = (parseFloat(b.product_star_rating) || 0) - (parseFloat(a.product_star_rating) || 0);
        if (ratingDiff !== 0) return ratingDiff;
        return Math.abs(suitableRawProducts.indexOf(a) - midPoint) - Math.abs(suitableRawProducts.indexOf(b) - midPoint);
    });

    for (const p of premiumCandidates) {
        if ((parseFloat(p.product_star_rating) || 0) >= 4.0 && !usedProductLinks.has(addAffiliateTag(p.product_url))) {
            premiumProductDefinition = p;
            break;
        }
    }
     if (!premiumProductDefinition && suitableRawProducts.length > 0) {
        premiumProductDefinition = suitableRawProducts.find(p => !usedProductLinks.has(addAffiliateTag(p.product_url)));
    }

    if (premiumProductDefinition) {
        const reason = await getReasonForInclusion(premiumProductDefinition.product_title, baseKeywords, productType, openai);
        const formatted = formatProduct(premiumProductDefinition, 'premium', reason);
        if (formatted && !usedProductLinks.has(formatted.link)) {
            tieredProducts.push(formatted);
            usedProductLinks.add(formatted.link);
        }
    }

    if (tieredProducts.length === 0 && suitableRawProducts.length > 0) {
        const bestOverall = suitableRawProducts.sort((a,b) => (parseFloat(b.product_star_rating) || 0) - (parseFloat(a.product_star_rating) || 0))[0];
        const reason = await getReasonForInclusion(bestOverall.product_title, baseKeywords, productType, openai);
        const formatted = formatProduct(bestOverall, 'essential', reason);
        if (formatted && !usedProductLinks.has(formatted.link)) {
            tieredProducts.push(formatted);
            usedProductLinks.add(formatted.link);
        }
    }

     if (tieredProducts.length < 3 && tieredProducts.length > 0 && suitableRawProducts.length > usedProductLinks.size) {
        const availableTiers: Array<'essential' | 'premium' | 'luxury'> = ['essential', 'premium', 'luxury'];
        const populatedTiers = new Set(tieredProducts.map(p => p.tier));

        for (const tier of availableTiers) {
            if (tieredProducts.length >= 3) break;
            if (!populatedTiers.has(tier)) {
                const candidate = suitableRawProducts.find(p => !usedProductLinks.has(addAffiliateTag(p.product_url)));
                if (candidate) {
                    const reason = await getReasonForInclusion(candidate.product_title, baseKeywords, productType, openai);
                    const formatted = formatProduct(candidate, tier, reason);
                    if (formatted) {
                        tieredProducts.push(formatted);
                        usedProductLinks.add(formatted.link);
                        populatedTiers.add(tier);
                    }
                }
            }
        }
    }

    return new Response(JSON.stringify(tieredProducts), {
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