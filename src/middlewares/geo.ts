import axios from "axios";
import { Request, Response, NextFunction } from "express";

export default async function geo(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const ip = req.ip;
  console.log(ip);
  try {
    const apiUrl = `https://api.ipgeolocation.io/ipgeo?apiKey=${process.env.IPGEOLOCATION_KEY}&ip=${ip}`;
    const { data } = await axios.get(apiUrl);
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
