import express from "express";
import { Request, Response } from "express";
import { refreshCache } from "../modules/cache.js";
import cache from "../modules/redis.js";
import supabase from "../modules/supabase.js";
import { pub } from "src/modules/mq.js";
const router = express.Router();

router.get("/:c/:id", async (req: Request, res: Response) => {
  let { c, id } = req.params;
  let data: any = await cache.get(`campaigns:${c}`);
  data = JSON.parse(data);
  if (data.link) {
    res.redirect(data.link);
  } else {
    res.status(404).send("Not found");
    return;
  }
  let userAgent = req.headers["user-agent"];
  if (userAgent.includes("Discordbot/2.0") || userAgent.includes("facebook")) {
    return;
  }
  await pub.send(
    {
      exchange: "messages",
      routingKey: "message",
    },
    JSON.stringify({
      id: "update",
      data: {
        collection: "users_new",
        id: id,
        updates: {
          metadata: {
            country: req.geo.country,
            region: req.geo.regionName,
          },
        },
      },
    })
  );
  let { data: fullCampaign } = await supabase
    .from("campaigns")
    .select("*")
    .eq("title", c)
    .single();
  if (fullCampaign) {
    let clicks = fullCampaign.stats?.clicks;
    if (!clicks) clicks = 0;
    let geoClicks = fullCampaign.stats?.geoClicks;
    if (!geoClicks) geoClicks = {};
    if (!geoClicks[req.geo.country]) geoClicks[req.geo.country] = 0;
    let uniqueClicks = fullCampaign.stats?.uniqueClicks;
    if (!uniqueClicks) uniqueClicks = [];
    if (!uniqueClicks.includes(id)) uniqueClicks.push(id);

    let tempClicks = fullCampaign.tempStats?.clicks;
    if (!tempClicks) tempClicks = 0;
    let tempGeoClicks = fullCampaign.tempStats?.geoClicks;
    if (!tempGeoClicks) tempGeoClicks = {};
    if (!tempGeoClicks[req.geo.country]) tempGeoClicks[req.geo.country] = 0;
    let tempUniqueClicks = fullCampaign.tempStats?.uniqueClicks;
    if (!tempUniqueClicks) tempUniqueClicks = [];
    if (!tempUniqueClicks.includes(id)) tempUniqueClicks.push(id);
    await supabase
      .from("campaigns")
      .update({
        stats: {
          clicks: clicks + 1,
          geoClicks: {
            ...geoClicks,
            [req.geo.country]: geoClicks[req.geo.country] + 1,
          },
          uniqueClicks: uniqueClicks,
        },
        tempStats: {
          clicks: tempClicks + 1,
          geoClicks: {
            ...tempGeoClicks,
            [req.geo.country]: tempGeoClicks[req.geo.country] + 1,
          },
          uniqueClicks: tempUniqueClicks,
        },
      })
      .eq("title", c);
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
