import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
  description: string;
  link: string;
  image: string;
  price: string;
  rating: number;
  reviews: number;
  tier: 'essential' | 'premium' | 'luxury';
}

function addAffiliateTag(productUrl: string): string {
  try {
    if (!productUrl) return productUrl;
    const url = new URL(productUrl);
    if (!url.hostname.endsWith('amazon.com') && !url.hostname.endsWith('.amzn.to')) {
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
    return true;
  }
  recentRequests.push(now);
  requestLog.set(clientIp, recentRequests);
  return false;
}

async function fetchAmazonApi(query: string, page: number = 1): Promise<AmazonProduct[]> {
  const rapidApiKey = Deno.env.get('RAPIDAPI_KEY');
  if (!rapidApiKey) {
    throw new Error('RAPIDAPI_KEY is not configured in environment variables.');
  }
  const apiKey = Deno.env.get('USER_PROVIDED_RAPIDAPI_KEY') || rapidApiKey;


  const url = `https://real-time-amazon-data.p.rapidapi.com/search?query=${encodeURIComponent(query)}&page=${page}&country=US&sort_by=RELEVANCE&product_condition=ALL`;
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
  } catch (fetchError) {
    console.error(`Network error fetching from RapidAPI for query "${query}", page ${page}:`, fetchError);
    throw new Error(`Network error connecting to Amazon search API. ${fetchError.message}`);
  }


  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`API request failed for query "${query}", page ${page}: ${response.status}`, errorBody);
    throw new Error(`Amazon API request failed with status ${response.status}.`);
  }

  const data = await response.json();
  if (data && data.data && Array.isArray(data.data.products)) {
    return data.data.products;
  }
  return [];
}

function formatProduct(apiProduct: AmazonProduct, tier: 'essential' | 'premium' | 'luxury'): FormattedProduct | null {
  if (!apiProduct.product_title || !apiProduct.product_photo || !apiProduct.product_price || !apiProduct.product_url?.includes('amazon.com')) {
    return null;
  }

  const rating = parseFloat(apiProduct.product_star_rating);
  const reviews = parseInt(String(apiProduct.product_num_ratings || '0').replace(/,/g, ''), 10) || 0;
  const title = apiProduct.product_title.toLowerCase();

  const excludeKeywords = [
    'refurbished', 'used', 'renewed', 'open box',
    'replacement', 'spare', 'repair', 'parts',
    'addon', 'add-on', 'accessory pack', 'kit only',
    'subscription', 'digital', 'download',
    'protection plan', 'warranty', 'insurance',
    'toy', 'game', 'play set',
    'book', 'guide', 'manual', 'instruction',
    'sticker', 'decoration', 'costume',
  ];

  if (excludeKeywords.some(keyword => title.includes(keyword))) {
    return null;
  }

  if (rating < 3.5 && reviews < 10) return null;

  return {
    name: apiProduct.product_title,
    description: apiProduct.product_title.length > 150 ?
      apiProduct.product_title.substring(0, apiProduct.product_title.lastIndexOf(' ', 147)) + '...' :
      apiProduct.product_title,
    link: addAffiliateTag(apiProduct.product_url),
    image: apiProduct.product_photo,
    price: apiProduct.product_price,
    rating: rating || 0,
    reviews: reviews || 0,
    tier: tier,
  };
}

function parsePrice(priceStr: string): number {
    if (!priceStr) return Infinity;
    const numStr = priceStr.replace(/[^0-9.]/g, '');
    const price = parseFloat(numStr);
    return isNaN(price) ? Infinity : price;
}


serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const clientIp = req.headers.get('x-forwarded-for') || 'unknown_ip';
    if (isRateLimited(clientIp)) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded.' }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '60' }
      });
    }

    const { baseKeywords, productType } = await req.json();
    if (!baseKeywords || typeof baseKeywords !== 'string' || !productType || typeof productType !== 'string') {
      throw new Error('Invalid request: baseKeywords and productType are required.');
    }

    const tieredProducts: FormattedProduct[] = [];
    const fullQuery = `${baseKeywords} ${productType}`;

    let candidateProducts: AmazonProduct[] = [];
    try {
        const page1Products = await fetchAmazonApi(fullQuery, 1);
        candidateProducts.push(...page1Products);
        if (page1Products.length > 0) {
             const page2Products = await fetchAmazonApi(fullQuery, 2);
             candidateProducts.push(...page2Products);
        }
    } catch (e) {
        console.error(`Failed to fetch products from Amazon for query: ${fullQuery}`, e.message);
        return new Response(JSON.stringify([]), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

    const suitableRawProducts = candidateProducts.filter(p => {
        const formatted = formatProduct(p, 'essential');
        return formatted !== null && p.product_price;
    }).sort((a, b) => parsePrice(a.product_price) - parsePrice(b.product_price));

    if (suitableRawProducts.length === 0) {
      console.warn(`No suitable raw products found for: ${fullQuery}`);
      return new Response(JSON.stringify([]), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const usedProductUrls = new Set<string>();

    let essentialProduct: AmazonProduct | undefined = suitableRawProducts.find(p => (parseFloat(p.product_star_rating) || 0) >= 3.8);
    if (essentialProduct) {
        const formatted = formatProduct(essentialProduct, 'essential');
        if (formatted && !usedProductUrls.has(formatted.link)) {
            tieredProducts.push(formatted);
            usedProductUrls.add(formatted.link);
        }
    }

    let luxuryProduct: AmazonProduct | undefined;
    for (let i = suitableRawProducts.length - 1; i >= 0; i--) {
        const p = suitableRawProducts[i];
        if ((parseFloat(p.product_star_rating) || 0) >= 4.2 && !usedProductUrls.has(addAffiliateTag(p.product_url))) {
            luxuryProduct = p;
            break;
        }
    }
     if (!luxuryProduct && suitableRawProducts.length > 0) {
        luxuryProduct = suitableRawProducts[suitableRawProducts.length -1];
    }

    if (luxuryProduct) {
        const formatted = formatProduct(luxuryProduct, 'luxury');
        if (formatted && !usedProductUrls.has(formatted.link)) {
            tieredProducts.push(formatted);
            usedProductUrls.add(formatted.link);
        }
    }

    let premiumProduct: AmazonProduct | undefined;
    const midIndex = Math.floor(suitableRawProducts.length / 2);
    for (let i = 0; i < suitableRawProducts.length; i++) {
        const p = suitableRawProducts[midIndex + i] || suitableRawProducts[midIndex - i];
        if (p && (parseFloat(p.product_star_rating) || 0) >= 4.0 && !usedProductUrls.has(addAffiliateTag(p.product_url))) {
            premiumProduct = p;
            break;
        }
    }
     if (!premiumProduct && suitableRawProducts.length > 0) {
        premiumProduct = suitableRawProducts.find(p => !usedProductUrls.has(addAffiliateTag(p.product_url)));
    }


    if (premiumProduct) {
        const formatted = formatProduct(premiumProduct, 'premium');
        if (formatted && !usedProductUrls.has(formatted.link)) {
            tieredProducts.push(formatted);
            usedProductUrls.add(formatted.link);
        }
    }


    if (tieredProducts.length === 0 && suitableRawProducts.length > 0) {
        const bestOverall = suitableRawProducts.sort((a,b) => (parseFloat(b.product_star_rating) || 0) - (parseFloat(a.product_star_rating) || 0))[0];
        const formatted = formatProduct(bestOverall, 'essential');
        if (formatted) tieredProducts.push(formatted);
    }
     if (tieredProducts.length < 3 && tieredProducts.length > 0 && suitableRawProducts.length > tieredProducts.length) {
        const availableTiers: Array<'essential' | 'premium' | 'luxury'> = ['essential', 'premium', 'luxury'];
        const populatedTiers = new Set(tieredProducts.map(p => p.tier));

        for (const tier of availableTiers) {
            if (!populatedTiers.has(tier)) {
                const candidate = suitableRawProducts.find(p => !usedProductUrls.has(addAffiliateTag(p.product_url)));
                if (candidate) {
                    const formatted = formatProduct(candidate, tier);
                    if (formatted) {
                        tieredProducts.push(formatted);
                        usedProductUrls.add(formatted.link);
                        populatedTiers.add(tier);
                    }
                }
            }
            if (tieredProducts.length >= 3) break;
        }
    }


    return new Response(JSON.stringify(tieredProducts), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in Supabase function amazon-search:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown server error.';
    const status = errorMessage.includes('Rate limit') ? 429 : 500;
    return new Response(JSON.stringify({ error: errorMessage }), {
      status, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});