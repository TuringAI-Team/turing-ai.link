import express from "express";
import { Request, Response } from "express";
import cache, { refreshCache } from "../modules/cache.js";
import supabase from "../modules/supabase.js";
const router = express.Router();

router.get("/:c/:id", async (req: Request, res: Response) => {
  let { c, id } = req.params;
  let link = await cache.get(c);
  if (link) {
    res.redirect(link);
  } else {
    res.status(404).send("Not found");
  }

  await supabase
    .from("users_new")
    .update({
      metadata: {
        country: req.geo.country_name,
      },
    })
    .eq("id", id);
  let { data: fullCampaign } = await supabase
    .from("campaigns")
    .select("*")
    .eq("title", c)
    .single();
  if (fullCampaign) {
    await supabase.from("campaigns").update({
      stats: {
        clicks: fullCampaign.stats.clicks + 1,
        geoClicks: {
          ...fullCampaign.stats.geoClicks,
          [req.geo.country_name]:
            fullCampaign.stats.geoClicks[req.geo.country_name] + 1,
        },
      },
    });
  }
});

router.post("/refresh", async (req: Request, res: Response) => {
  let { key } = req.body;
  if (key === process.env.REFRESH_KEY) {
    await refreshCache();
    res.status(200).json({ message: "Cache refreshed" });
  } else {
    res.status(401).json({ message: "Unauthorized" });
  }
});

export default router;
