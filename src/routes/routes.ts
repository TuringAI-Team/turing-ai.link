import express from "express";
import { Request, Response } from "express";
import { refreshCache } from "../modules/cache.js";
import cache from "../modules/redis.js";
import supabase from "../modules/supabase.js";
import { pub } from "../modules/mq.js";
const router = express.Router();

router.get("/:c/:id", async (req: Request, res: Response) => {
  let { c, id } = req.params;
  let data: any = await cache.get(`campaigns:${c}`);
  data = JSON.parse(data);
  if (!data.link) {
    res.status(404).send("Not found");
    return;
  }
  let userAgent = req.headers["user-agent"];
  if (userAgent.includes("Discordbot/2.0") || userAgent.includes("facebook")) {
    return;
  }
  console.log("sending message");
  await pub.send(
    {
      exchange: "messages",
      routingKey: "message",
    },
    JSON.stringify({
      id: "update",
      data: {
        collection: "users",
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
    .from("campaigns_new")
    .select("*")
    .eq("title", c)
    .single();
  if (fullCampaign) {
    let clicks = fullCampaign.stats?.clicks.total;
    if (!clicks) clicks = 0;
    let geoClicks = fullCampaign.stats?.clicks.geo;
    if (!geoClicks) geoClicks = {};
    if (!geoClicks[req.geo.country]) geoClicks[req.geo.country] = 0;
    console.log(clicks, geoClicks);

    await pub.send(
      {
        exchange: "messages",
        routingKey: "message",
      },
      JSON.stringify({
        id: "update",
        data: {
          collection: "campaigns",
          id: fullCampaign.id,
          updates: {
            stats: {
              views: fullCampaign.stats?.views,
              clicks: {
                total: clicks + 1,
                geo: {
                  ...geoClicks,
                  [req.geo.country]: geoClicks[req.geo.country] + 1,
                },
              },
            },
          },
        },
      })
    );
  }
  res.redirect(data.link);
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
