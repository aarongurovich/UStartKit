import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import OpenAI from "https://esm.sh/openai@4.28.0";

interface LearningResource {
  title: string;
  link: string;
  type: 'Book' | 'Online Course' | 'YouTube' | 'Community' | 'Website/Blog' | 'Other';
  description: string;
  source?: string;
  image: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const PLACEHOLDER_IMAGE_URL = "https://www.svgrepo.com/show/508699/landscape-placeholder.svg";
// const BOOK_IMAGE = "https://blog.openlibrary.org/files/2023/04/cropped-cropped-openlibrary-header.png"; // Removed
const WIKIPEDIA_LOGO_URL = "https://logos-world.net/wp-content/uploads/2020/09/Wikipedia-Logo.png";
const UDEMY_LOGO_URL = "https://logowik.com/content/uploads/images/udemy-new-20212512.jpg";
const COURSERA_LOGO_URL = "https://about.coursera.org/static/blueCoursera-646f855eae3d677239ea9db93d6c9e17.svg";
const REDDIT_LOGO_URL = "https://www.logo.wine/a/logo/Reddit/Reddit-Logomark-Color-Logo.wine.svg";
const Google_Search_LOGO_URL = "https://cdn2.hubspot.net/hubfs/53/image8-2.jpg";

let openai: OpenAI | null = null;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
if (OPENAI_API_KEY) {
  openai = new OpenAI({ apiKey: OPENAI_API_KEY });
} else {
  console.warn("OPENAI_API_KEY is not set. Keyword broadening will be skipped.");
}

async function getBroaderKeyword(originalActivity: string): Promise<string> {
  if (!openai) {
    console.warn("OpenAI client not initialized. Returning original activity.");
    return originalActivity;
  }

  try {
    const systemPrompt = `You are an expert search query optimizer. Given a user's input describing an activity or topic they want to learn about, your task is to return a single, concise, and effective keyword or short phrase (1-3 words max) that would be best for finding general learning resources (books, videos, courses, articles, communities) about this topic. Focus on the core subject.
Examples:
- Input: "advanced rock climbing techniques for multi-pitch routes" -> Output: "rock climbing"
- Input: "beginner's guide to sourdough bread making at home" -> Output: "sourdough baking"
- Input: "learn to play ukulele chords for pop songs" -> Output: "ukulele"
- Input: "chess" -> Output: "chess"
- Input: "gardening in small urban spaces" -> Output: "urban gardening"
- Input: "Introduction to quantum physics" -> Output: "quantum physics"
Return only the optimized keyword/phrase, nothing else. Do not add quotation marks.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: originalActivity },
      ],
      temperature: 0.2,
      max_tokens: 20,
      n: 1,
      stop: ["\n"],
    });

    let broaderKeyword = completion.choices[0]?.message?.content?.trim() || originalActivity;
    broaderKeyword = broaderKeyword.replace(/["'.]/g, "").trim();
    return broaderKeyword || originalActivity;
  } catch (error) {
    console.error("Error calling OpenAI for broader keyword:", error);
    return originalActivity;
  }
}

// Removed fetchOpenLibraryBooks function

// Helper function to parse ISO 8601 duration to seconds
function parseISO8601Duration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || "0");
  const minutes = parseInt(match[2] || "0");
  const seconds = parseInt(match[3] || "0");
  return hours * 3600 + minutes * 60 + seconds;
}

async function fetchYouTubeResources(activity: string, limit: number = 1): Promise<LearningResource[]> { // Default limit is 1, will be called with 1
  const YOUTUBE_API_KEY = Deno.env.get("YOUTUBE_API_KEY");
  if (!YOUTUBE_API_KEY) {
    console.warn("YOUTUBE_API_KEY is not set. Skipping Youtube.");
    return [];
  }

  const resources: LearningResource[] = [];
  const minDurationSeconds = 120; // 2 minutes
  // Fetch more results initially to have a better chance of finding videos meeting the duration criteria
  const searchLimit = Math.max(limit * 3, 10); // Fetch at least 10 (or 3x desired limit if limit > 3)

  try {
    const searchQuery = `${activity} for beginners tutorial OR ${activity} introduction OR learn ${activity}`;
    // 1. Search for videos
    const searchResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(searchQuery)}&type=video&videoEmbeddable=true&maxResults=${searchLimit}&relevanceLanguage=en&key=${YOUTUBE_API_KEY}`
    );

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      console.error(`Youtube API error for ${activity}: ${searchResponse.status} ${errorText}`);
      return resources;
    }

    const searchData = await searchResponse.json();
    if (!searchData.items || searchData.items.length === 0) {
      return resources;
    }

    const videoIds = searchData.items
        .map((item: any) => item.id?.videoId)
        .filter((id: string | undefined) => id)
        .join(',');

    if (!videoIds) {
        return resources;
    }

    // 2. Fetch video details (including duration) for the found video IDs
    const detailsResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoIds}&key=${YOUTUBE_API_KEY}`
    );

    if (!detailsResponse.ok) {
      const errorText = await detailsResponse.text();
      console.error(`YouTube Videos API error for IDs ${videoIds}: ${detailsResponse.status} ${errorText}`);
      return resources;
    }

    const detailsData = await detailsResponse.json();

    if (detailsData.items) {
      for (const item of detailsData.items) {
        if (resources.length >= limit) break; // This will ensure only 'limit' (1 in this case) videos are added

        const durationStr = item.contentDetails?.duration;
        if (!durationStr) continue;

        const durationSeconds = parseISO8601Duration(durationStr);

        if (durationSeconds > minDurationSeconds) {
          const snippet = item.snippet;
          const videoId = item.id;
          if (snippet && snippet.title && videoId) {
            const descriptionText = snippet.description || "";
            const imageUrl = snippet.thumbnails?.standard?.url || snippet.thumbnails?.high?.url || snippet.thumbnails?.medium?.url || snippet.thumbnails?.default?.url || PLACEHOLDER_IMAGE_URL;
            resources.push({
              title: snippet.title,
              link: `https://www.youtube.com/watch?v=${videoId}`, // Correct YouTube link
              type: 'YouTube',
              description: descriptionText.substring(0, 150) + (descriptionText.length > 150 ? "..." : ""),
              source: snippet.channelTitle || 'YouTube',
              image: imageUrl,
            });
          }
        }
      }
    }
  } catch (error) {
    console.error(`Failed to fetch or process YouTube data for ${activity}:`, error);
  }
  return resources;
}


async function fetchOnlineCourses(activity: string, limit: number = 2): Promise<LearningResource[]> {
  const resources: LearningResource[] = [];

  if (resources.length < limit) {
    resources.push({
      title: `Search for "${activity}" courses on Udemy`,
      link: `https://www.udemy.com/courses/search/?q=${encodeURIComponent(activity)}`,
      type: 'Online Course',
      description: `Find a variety of ${activity} courses on Udemy. Click to explore options.`,
      source: "Udemy",
      image: UDEMY_LOGO_URL
    });
  }
  if (resources.length < limit) {
    resources.push({
      title: `Search for "${activity}" courses on Coursera`,
      link: `https://www.coursera.org/search?query=${encodeURIComponent(activity)}`,
      type: 'Online Course',
      description: `Explore ${activity} courses and specializations on Coursera. Click to see offerings.`,
      source: "Coursera",
      image: COURSERA_LOGO_URL
    });
  }
  while (resources.length < limit && resources.length < 2) {
     resources.push({
        title: `More ${activity} Online Courses`,
        link: `https://www.google.com/search?q=${encodeURIComponent(activity + " online course")}`,
        type: 'Online Course',
        description: `Search for additional ${activity} online courses.`,
        source: 'Google Search',
        image: Google_Search_LOGO_URL,
      });
  }
  return resources.slice(0, limit);
}

async function fetchWebsites(activity: string, limit: number = 2): Promise<LearningResource[]> {
  const resources: LearningResource[] = [];

  if (resources.length < limit) {
    resources.push({
      title: `"${activity}" on Wikipedia`,
      link: `https://en.wikipedia.org/w/index.php?search=${encodeURIComponent(activity)}`,
      type: 'Website/Blog',
      description: `General information and articles about ${activity} on Wikipedia.`,
      source: "Wikipedia",
      image: WIKIPEDIA_LOGO_URL
    });
  }
  if (resources.length < limit) {
    resources.push({
      title: `Find "${activity}" articles & guides (Google Search)`,
      link: `https://www.google.com/search?q=${encodeURIComponent(activity + " articles OR " + activity + " guide OR " + activity + " blog")}`,
      type: 'Website/Blog',
      description: `Search for articles, tutorials, and blog posts about ${activity} via Google Search.`,
      source: "Google Search",
      image: Google_Search_LOGO_URL
    });
  }
  while (resources.length < limit && resources.length < 2) {
    resources.push({
        title: `More ${activity} Articles & Blogs`,
        link: `https://www.google.com/search?q=${encodeURIComponent(activity + " articles OR " + activity + " blog")}`,
        type: 'Website/Blog',
        description: `Search for additional ${activity} articles and blog posts.`,
        source: 'Google Search',
        image: Google_Search_LOGO_URL,
      });
  }
  return resources.slice(0, limit);
}

async function fetchCommunities(activity: string, limit: number = 1): Promise<LearningResource[]> {
  const resources: LearningResource[] = [];

  if (resources.length < limit) {
    const subredditName = activity.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9_]/gi, '');
    if (subredditName) {
        resources.push({
        title: `r/${subredditName} - ${activity} Community on Reddit`,
        link: `https://www.reddit.com/r/${subredditName}/`,
        type: 'Community',
        description: `Explore the r/${subredditName} subreddit for discussions and resources related to ${activity}.`,
        source: "Reddit",
        image: REDDIT_LOGO_URL
        });
    }
  }

  if (resources.length < limit) {
     resources.push({
      title: `Find "${activity}" Communities Online (Google Search)`,
      link: `https://www.google.com/search?q=${encodeURIComponent(activity + " community OR " + activity + " forum OR " + activity + " group")}`,
      type: 'Community',
      description: `Search for online communities, forums, or groups related to ${activity}.`,
      source: "Google Search",
      image: Google_Search_LOGO_URL
    });
  }
  return resources.slice(0, limit);
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { activity: originalActivity } = await req.json();
    if (!originalActivity || typeof originalActivity !== 'string') {
      return new Response(JSON.stringify({ error: 'Invalid request: activity is required.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const activity = await getBroaderKeyword(originalActivity);

    const allResourcesPromises = [
      // fetchOpenLibraryBooks(activity, 2), // Removed
      fetchYouTubeResources(activity, 1),    // Fetch only 1 YouTube video
      fetchOnlineCourses(activity, 2),
      fetchWebsites(activity, 2),
      fetchCommunities(activity, 1),
    ];

    const results = await Promise.allSettled(allResourcesPromises);

    let aggregatedResources: LearningResource[] = [];
    results.forEach(result => {
      if (result.status === 'fulfilled' && Array.isArray(result.value)) {
        const resourcesWithImages = result.value.map(res => ({
            ...res,
            image: res.image || PLACEHOLDER_IMAGE_URL,
        }));
        aggregatedResources.push(...resourcesWithImages);
      } else if (result.status === 'rejected') {
        // console.error(`One of the resource fetchers failed for activity "${activity}":`, result.reason);
      }
    });

    aggregatedResources = aggregatedResources.map(res => ({
      ...res,
      image: res.image || PLACEHOLDER_IMAGE_URL
    }));

    return new Response(JSON.stringify(aggregatedResources), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error(`Error in get-learning-resources main function:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown server error.';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});