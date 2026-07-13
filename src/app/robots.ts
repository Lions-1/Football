import type { MetadataRoute } from "next";

/**
 * Crawler policy. The big cost lever: keep bots OFF `/api/` — especially the
 * `/api/img/*` Yupoo image proxy, where every crawled URL makes a function
 * fetch a full-size photo and ship it from origin (Fast Origin Transfer, the
 * expensive path). A single crawl of the proxy is what spiked the bill.
 *
 * We also disallow parameterized URLs (`/*?*`) so crawlers don't multiply
 * every size-filter / search combination into thousands of uncached origin
 * renders. Clean product/team/league paths stay crawlable for SEO.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/", // image proxy + all API routes — never useful to crawl
          "/admin",
          "/backstage",
          "/cart",
          "/wishlist",
          "/*?*", // filtered/search URLs — prevents crawl amplification
        ],
        crawlDelay: 10,
      },
    ],
  };
}
