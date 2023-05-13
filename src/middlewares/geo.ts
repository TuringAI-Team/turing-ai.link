import axios from "axios";
import { Request, Response, NextFunction } from "express";

export default async function geo(
  req: Request,
  res: Response,
  next: NextFunction
) {
  var ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  console.log(ip.split(",")[1]);
  ip = ip.split(",")[1];
  try {
    const apiUrl = `http://ip-api.com/json/${ip}`;
    const { data } = await axios.get(apiUrl);
    console.log(data);
    req.geo = data;
    next();
  } catch (error) {
    console.log(error);
    req.geo = {
      country_name: "Unknown",
    };
    next();
  }
}
