const https = require("https");
const http = require("http");
const { URL } = require("url");

function rawFetch(urlStr, reqHeaders = {}, redirectsLeft = 8) {
  return new Promise((resolve, reject) => {
    let parsed;
    try { parsed = new URL(urlStr); } catch (e) { return reject(e); }
    const lib = parsed.protocol === "https:" ? https : http;
    const request = lib.get(urlStr, { headers: reqHeaders }, (res) => {
      const { statusCode, headers } = res;
      console.log(statusCode, urlStr.substring(0, 100));
      if ([301, 302, 303, 307, 308].includes(statusCode) && headers.location && redirectsLeft > 0) {
        res.resume();
        const next = headers.location.startsWith("http")
          ? headers.location
          : new URL(headers.location, urlStr).toString();
        return resolve(rawFetch(next, reqHeaders, redirectsLeft - 1));
      }
      let data = "";
      res.on("data", c => data += c);
      res.on("end", () => resolve({ statusCode, headers, data, finalUrl: urlStr }));
    });
    request.on("error", reject);
    request.setTimeout(10000, () => { request.destroy(); reject(new Error("timeout")); });
  });
}

async function main() {
  const shareUrl = "https://1drv.ms/v/c/500a5dd44f02502f/IQDz-34pgh_fR7xCUpQMYlBeARPIuvvS4cbGyN3EkunKoFg?e=puGbiF";

  const result = await rawFetch(shareUrl, {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  });

  console.log("\nFINAL URL:", result.finalUrl);
  console.log("Content-Type:", result.headers["content-type"]);
  console.log("Data length:", result.data.length);

  // Look for storage.live.com URLs (that's where OneDrive stores actual files)
  const storageMatches = result.data.match(/https:\/\/storage\.live\.com[^\s"'<]+/g);
  if (storageMatches) {
    console.log("\nstorage.live.com URLs found:");
    storageMatches.slice(0, 5).forEach(u => console.log("  ", u.substring(0, 200)));
  }

  // Look for download URLs
  const downloadMatches = result.data.match(/https:\/\/[^"'\s]+download[^"'\s]+/g);
  if (downloadMatches) {
    console.log("\nDownload URLs found:");
    downloadMatches.slice(0, 5).forEach(u => console.log("  ", u.substring(0, 200)));
  }

  // Look for .mp4 or video URLs
  const mp4Matches = result.data.match(/https:\/\/[^"'\s]+\.(mp4|webm|mov)[^"'\s]*/g);
  if (mp4Matches) {
    console.log("\n.mp4/.webm URLs found:");
    mp4Matches.slice(0, 5).forEach(u => console.log("  ", u));
  }

  // Print first 2000 chars of page for inspection
  console.log("\n--- First 2000 chars of final page ---");
  console.log(result.data.substring(0, 2000));
}

main().catch(console.error);
