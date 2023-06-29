import supabase from "./supabase.js";
import cache from "./redis.js";

async function refreshCache() {
  const { data: campaigns, error } = await supabase
    .from("campaigns")
    .select("*")
    .eq("active", true);
  if (error) {
    console.log(error);
  }
  campaigns.forEach((campaign) => {
    cache.set(`campaigns:${campaign.id}`, JSON.stringify(campaign));
  });
}

export { refreshCache };
