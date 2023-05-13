import keyv from "keyv";
import supabase from "./supabase.js";

const cache = new keyv();

cache.on("error", (err) => console.log("Connection Error", err));

async function refreshCache() {
  cache.clear();
  const { data: campaigns, error } = await supabase
    .from("campaigns")
    .select("*")
    .eq("active", true);
  if (error) {
    console.log(error);
  }
  campaigns.forEach((campaign) => {
    cache.set(campaign.title, campaign.link);
  });
}

export default cache;
export { refreshCache };
