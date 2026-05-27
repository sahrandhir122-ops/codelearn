const https = require("https");
const http = require("http");
const { URL } = require("url");

// Follow all redirects, tracking cookies
function rawFetch(urlStr, reqHeaders = {}, redirectsLeft = 8) {
  return new Promise((resolve, reject) => {
    let parsed;
    try { parsed = new URL(urlStr); } catch (e) { return reject(e); }
    const lib = parsed.protocol === "https:" ? https : http;
    const request = lib.get(urlStr, { headers: reqHeaders }, (res) => {
      const { statusCode, headers } = res;
      console.log("  ->", statusCode, urlStr.substring(0, 100));
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

  // Approach 1: Try Accept: video/* — maybe OneDrive returns video if we ask for it
  console.log("\n=== Test 1: Accept: video/* ===");
  const r1 = await rawFetch(shareUrl, {
    "User-Agent": "Mozilla/5.0",
    "Accept": "video/mp4,video/*;q=0.9,*/*;q=0.1",
  });
  console.log("  Final Content-Type:", r1.headers["content-type"]);

  // Approach 2: Try with bot-like headers that OneDrive might give direct file access to
  console.log("\n=== Test 2: curl-like headers ===");
  const r2 = await rawFetch(shareUrl, {
    "User-Agent": "curl/7.88.1",
    "Accept": "*/*",
  });
  console.log("  Final Content-Type:", r2.headers["content-type"]);

  // Approach 3: Try via Microsoft Graph v1.0 (not v1.0 via api.onedrive.com)
  console.log("\n=== Test 3: Microsoft Graph v1.0 ===");
  const encoded = Buffer.from(shareUrl).toString("base64").replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
  const graphUrl = "https://graph.microsoft.com/v1.0/shares/u!" + encoded + "/driveItem/content";
  const r3 = await rawFetch(graphUrl, { "User-Agent": "Mozilla/5.0" });
  console.log("  Status:", r3.statusCode, "Content-Type:", r3.headers["content-type"]);
  if (r3.statusCode !== 200) console.log("  Data:", r3.data.substring(0, 300));

  // Approach 4: Look for authkey in the OneDrive page HTML
  console.log("\n=== Test 4: Looking for authkey in page HTML ===");
  const finalUrl = "https://onedrive.live.com/?qt=allmyphotos&photosData=%2fshare%2f500A5DD44F02502F!s297efbf31f8247dfbc4252940c62505e%3fithint%3dvideo%26e%3dpuGbiF%26migratedtospo%3dtrue&cid=500A5DD44F02502F&id=500A5DD44F02502F!s297efbf31f8247dfbc4252940c62505e&redeem=aHR0cHM6Ly8xZHJ2Lm1zL3YvYy81MDBhNWRkNDRmMDI1MDJmL0lRRHotMzRwZ2hfZlI3eENVcFFNWWxCZUFSUEl1dnZTNGNiR3lOM0VrdW5Lb0ZnP2U9cHVHYmlG";
  const r4 = await rawFetch(finalUrl, { "User-Agent": "Mozilla/5.0" });

  // Look for authkey or token patterns
  const authkeyMatch = r4.data.match(/authkey[=:]["']([^"'&]+)/gi);
  if (authkeyMatch) console.log("  authkey matches:", authkeyMatch.slice(0,3));

  const skyApiMatch = r4.data.match(/skyapi[^"'\s]{0,100}/gi);
  if (skyApiMatch) console.log("  skyapi refs:", skyApiMatch.slice(0,3));

  // Check for JSON configs
  const configMatch = r4.data.match(/var \w+Config\s*=\s*({[^;]+})/);
  if (configMatch) console.log("  Config found:", configMatch[1].substring(0, 300));
}

main().catch(console.error);
