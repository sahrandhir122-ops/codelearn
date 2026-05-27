/**
 * Video Proxy Route
 * -----------------
 * Streams OneDrive videos through our backend so the browser never talks to
 * OneDrive directly — bypasses both CORS and X-Frame-Options restrictions.
 *
 * GET /api/videos/proxy?url=<encoded-OneDrive-URL>
 *
 * Supports:
 *  - HTTP Range requests  → video seeking works
 *  - 1drv.ms redirects    → short share links are followed automatically
 *  - Any OneDrive format  → share links, download links, etc.
 */

const router   = require("express").Router();
const https    = require("https");
const http     = require("http");
const { URL }  = require("url");

// Allowed hostnames — only proxy OneDrive/Microsoft URLs
const ALLOWED_HOSTS = [
  "onedrive.live.com",
  "1drv.ms",
  "d.docs.live.net",
  "api.onedrive.com",
];
function isAllowed(hostname) {
  return ALLOWED_HOSTS.some(
    (h) => hostname === h || hostname.endsWith("." + h) || hostname.endsWith(".sharepoint.com")
  );
}

// Follow up to 5 redirects manually (needed for 1drv.ms short links)
function fetchWithRedirects(urlStr, headers, redirectsLeft = 5) {
  return new Promise((resolve, reject) => {
    let parsed;
    try { parsed = new URL(urlStr); } catch (e) { return reject(e); }

    const lib = parsed.protocol === "https:" ? https : http;
    const req = lib.get(
      urlStr,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
            "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          ...headers,
        },
      },
      (res) => {
        const { statusCode, headers: resHeaders } = res;

        // Follow redirect
        if (
          [301, 302, 303, 307, 308].includes(statusCode) &&
          resHeaders.location &&
          redirectsLeft > 0
        ) {
          res.resume(); // discard body
          const next =
            resHeaders.location.startsWith("http")
              ? resHeaders.location
              : new URL(resHeaders.location, urlStr).toString();
          return resolve(fetchWithRedirects(next, headers, redirectsLeft - 1));
        }

        resolve({ statusCode, headers: resHeaders, body: res });
      }
    );
    req.on("error", reject);
  });
}

router.get("/proxy", async (req, res) => {
  const raw = req.query.url;
  if (!raw) return res.status(400).json({ error: "url query param required" });

  let decoded;
  try { decoded = decodeURIComponent(raw); } catch {
    return res.status(400).json({ error: "Invalid URL encoding" });
  }

  // Security: only proxy allowed hostnames
  let hostname;
  try { hostname = new URL(decoded).hostname; } catch {
    return res.status(400).json({ error: "Invalid URL" });
  }
  if (!isAllowed(hostname)) {
    return res.status(403).json({ error: "Only OneDrive URLs are allowed" });
  }

  try {
    // Forward Range header so video seeking works
    const upstreamHeaders = {};
    if (req.headers.range) upstreamHeaders["Range"] = req.headers.range;

    const { statusCode, headers: upHeaders, body } = await fetchWithRedirects(
      decoded,
      upstreamHeaders
    );

    // Forward relevant headers to browser
    const forward = [
      "content-type", "content-length", "content-range",
      "accept-ranges", "last-modified", "etag",
    ];
    forward.forEach((h) => {
      if (upHeaders[h]) res.setHeader(h, upHeaders[h]);
    });

    // Always declare byte-range support so the browser can seek
    if (!upHeaders["accept-ranges"]) res.setHeader("accept-ranges", "bytes");

    // Allow cross-origin use (our own frontend)
    res.setHeader("Access-Control-Allow-Origin", "*");

    res.status(statusCode);
    body.pipe(res);

    // If browser disconnects, stop pulling from OneDrive
    req.on("close", () => body.destroy());
  } catch (err) {
    console.error("[video-proxy] error:", err.message);
    if (!res.headersSent) {
      res.status(502).json({ error: "Failed to fetch video from OneDrive" });
    }
  }
});

module.exports = router;
