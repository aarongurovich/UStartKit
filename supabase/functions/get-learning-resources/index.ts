import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

interface LearningResource {
  title: string;
  link: string;
  type: 'Book' | 'Online Course' | 'YouTube' | 'Community' | 'Website/Blog' | 'Other';
  description: string;
  source?: string;
  image?: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

async function fetchOpenLibraryBooks(activity: string, limit: number = 2): Promise<LearningResource[]> {
  const resources: LearningResource[] = [];
  try {
    const response = await fetch(
      `https://openlibrary.org/search.json?q=${encodeURIComponent(activity)}&limit=${limit}&fields=key,title,author_name,first_publish_year,isbn,subtitle,cover_i`
    );
    if (!response.ok) {
      console.error(`OpenLibrary API error: ${response.status} ${await response.text()}`);
      return resources;
    }
    const data = await response.json();
    if (data.docs) {
      for (const doc of data.docs) {
        if (doc.title) {
          resources.push({
            title: doc.title + (doc.subtitle ? `: ${doc.subtitle}` : ''),
            link: `https://openlibrary.org${doc.key}`,
            type: 'Book',
            description: `A book by ${doc.author_name ? doc.author_name.join(', ') : 'Unknown author'}${doc.first_publish_year ? `, first published in ${doc.first_publish_year}` : ''}.`,
            source: 'Open Library',
            image: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : undefined,
          });
        }
      }
    }
  } catch (error) {
    console.error("Failed to fetch or process OpenLibrary data:", error);
  }
  return resources;
}

async function fetchYouTubeResources(activity: string, limit: number = 3): Promise<LearningResource[]> {
  const YOUTUBE_API_KEY = Deno.env.get("YOUTUBE_API_KEY");
  if (!YOUTUBE_API_KEY) {
    console.warn("YOUTUBE_API_KEY is not set. Skipping Youtube.");
    return [];
  }

  const resources: LearningResource[] = [];
  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(activity + " for beginners tutorial")}&type=video,playlist,channel&maxResults=${limit}&relevanceLanguage=en&key=${YOUTUBE_API_KEY}`
    );
    if (!response.ok) {
      console.error(`YouTube API error: ${response.status} ${await response.text()}`);
      return resources;
    }
    const data = await response.json();
    if (data.items) {
      for (const item of data.items) {
        let link = "";
        let type: LearningResource['type'] = 'YouTube';
        let image: string | undefined;

        if (item.id.kind === "youtube#video" && item.id.videoId) {
          link = `https://www.youtube.com/feeds/videos.xml?channel_id=4{item.id.videoId}`;
          image = item.snippet?.thumbnails?.medium?.url;
        } else if (item.id.kind === "youtube#playlist" && item.id.playlistId) {
          link = `https://www.youtube.com/feeds/videos.xml?channel_id=5{item.id.playlistId}`;
          image = item.snippet?.thumbnails?.medium?.url;
        } else if (item.id.kind === "youtube#channel" && item.id.channelId) {
          link = `https://www.youtube.com/feeds/videos.xml?channel_id=6{item.id.channelId}`;
          image = item.snippet?.thumbnails?.medium?.url;
        }

        if (item.snippet && item.snippet.title && link) {
          resources.push({
            title: item.snippet.title,
            link: link,
            type: type,
            description: item.snippet.description.substring(0, 150) + (item.snippet.description.length > 150 ? "..." : ""),
            source: item.snippet.channelTitle || 'YouTube',
            image: image,
          });
        }
      }
    }
  } catch (error) {
    console.error("Failed to fetch or process YouTube data:", error);
  }
  return resources;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { activity } = await req.json();
    if (!activity || typeof activity !== 'string') {
      return new Response(JSON.stringify({ error: 'Invalid request: activity is required.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const allResourcesPromises = [
      fetchOpenLibraryBooks(activity, 2),
      fetchYouTubeResources(activity, 3),
    ];

    const results = await Promise.allSettled(allResourcesPromises);
    
    let aggregatedResources: LearningResource[] = [];
    results.forEach(result => {
      if (result.status === 'fulfilled' && Array.isArray(result.value)) {
        aggregatedResources.push(...result.value);
      } else if (result.status === 'rejected') {
        console.error("One of the resource fetchers failed:", result.reason);
      }
    });
    
    return new Response(JSON.stringify(aggregatedResources), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in get-learning-resources main function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown server error.';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});