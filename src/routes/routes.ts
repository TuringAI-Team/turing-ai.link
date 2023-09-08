import express from "express";
import { Request, Response } from "express";
import { refreshCache } from "../modules/cache.js";
import cache from "../modules/redis.js";
import supabase from "../modules/supabase.js";
import delay from "delay";
import { pub } from "../modules/mq.js";
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
  console.log("sending message");

  await update("update", {
    collection: "users",
    id: id,
    metadata: {
      country: req.geo.country,
      region: req.geo.regionName,
    },
  });
  let fullCampaign: any = data;
  if (fullCampaign) {
    let clicks = fullCampaign.stats?.clicks.total;
    if (!clicks) clicks = 0;
    let geoClicks = fullCampaign.stats?.clicks.geo;
    if (!geoClicks) geoClicks = {};
    if (!geoClicks[req.geo.country]) geoClicks[req.geo.country] = 0;
    let stats = {
      views: fullCampaign.stats?.views,
      clicks: {
        total: clicks + 1,
        geo: {
          ...geoClicks,
          [req.geo.country]: geoClicks[req.geo.country] + 1,
        },
      },
    };
    await update("update", {
      collection: "campaigns",
      id: fullCampaign.id,
      ...stats,
    });
    /*
    await supabase
      .from("campaigns_new")
      .update({ stats: stats })
      .eq("id", fullCampaign.id);

    let updatedCampaign: any = await cache.get(`campaigns:${c}`);
    updatedCampaign = JSON.parse(updatedCampaign);
    updatedCampaign.stats = stats;

    cache.set(`campaigns:${c}`, JSON.stringify(updatedCampaign));*/
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

export async function update(action: "update" | "vote", data: any) {
  let d = {};

  let collection;
  let id;
  if (action === "update") {
    collection = data.collection;
    id = data.id;
    delete data.collection;
    delete data.id;
    d = {
      collection,
      id,
      updates: data,
    };
  } else {
    d = {
      userId: data.userId,
    };
  }
  try {
    await pub.send(
      {
        exchange: "db",
        routingKey: "db",
      },
      JSON.stringify({
        type: action,
        ...d,
      })
    );
  } catch (e) {
    console.log(e);
    return { error: e };
  }
}
export default router;
