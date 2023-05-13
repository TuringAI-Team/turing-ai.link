import axios from "axios";
import { Request, Response, NextFunction } from "express";

export default async function geo(
  req: Request,
  res: Response,
  next: NextFunction
) {
  var ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  ip = ip.split(", ")[1];
  try {
    const apiUrl = `http://ip-api.com/json/${ip}`;
    const { data } = await axios.get(apiUrl);
    req.geo = data;
    // log geo and user agent
    console.log(data, req.headers["user-agent"]);
    next();
  } catch (error) {
    console.log(error);
    req.geo = {
      country_name: "Unknown",
    };
    next();
  }
}
