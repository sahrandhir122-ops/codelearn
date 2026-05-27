/**
 * Video Proxy Route
 * -----------------
 * Streams OneDrive videos through our backend so the browser never talks to
 * OneDrive directly — bypasses CORS and X-Frame-Options restrictions.
 *
 * GET /api/videos/proxy?url=<encoded-OneDrive-URL>
 *
 * Supports:
 *  - 1drv.ms share links  → resolved via Microsoft Graph API (no auth needed for public links)
 *  - download?resid= URLs → fetched directly
 *  - HTTP Range requests  → video seeking works
 */

const router  = require("express").Router();
const https   = require("https");
const http    = require("http");
const { URL } = require("url");

// ── Allowed hostnames ──────────────────────────────────────────────────────
const ALLOWED = [
  "onedrive.live.com", "1drv.ms", "d.docs.live.net",
  "api.onedrive.com",  "graph.microsoft.com",
];
const isAllowed = (h) =>
  ALLOWED.some((a) => h === a || h.endsWith("." + a) || h.endsWith(".sharepoint.com"));

// ── Low-level HTTP fetch with manual redirect following ────────────────────
function rawFetch(urlStr, reqHeaders = {}, redirectsLeft = 8) {
  return new Promise((resolve, reject) => {
    let parsed;
    try { parsed = new URL(urlStr); } catch (e) { return reject(e); }

    const lib = parsed.protocol === "https:" ? https : http;
    const request = lib.get(urlStr, { headers: reqHeaders }, (res) => {
      const { statusCode, headers } = res;
      if ([301, 302, 303, 307, 308].includes(statusCode) && headers.location && redirectsLeft > 0) {
        res.resume();
        const next = headers.location.startsWith("http")
          ? headers.location
          : new URL(headers.location, urlStr).toString();
        return resolve(rawFetch(next, reqHeaders, redirectsLeft - 1));
      }
      resolve({ statusCode, headers, body: res, finalUrl: urlStr });
    });
    request.on("error", reject);
  });
}

// ── Microsoft Graph API: resolve public share URL → direct download ────────
// Works for any "Anyone with link" OneDrive share URL without auth.
// Docs: https://learn.microsoft.com/en-us/onedrive/developer/rest-api/api/shares_get
function graphDownloadUrl(shareUrl) {
  const encoded = Buffer.from(shareUrl)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  // /content redirects to the actual file download URL
  return `https://api.onedrive.com/v1.0/shares/u!${encoded}/driveItem/content`;
}

// ── Decide which URL to actually fetch ────────────────────────────────────
function resolveUrl(decoded) {
  // 1drv.ms share links → use Graph API to get the actual download URL
  if (decoded.includes("1drv.ms")) {
    return graphDownloadUrl(decoded);
  }
  // onedrive.live.com/embed → convert to /download (embed URL = HTML page)
  if (decoded.includes("onedrive.live.com/embed")) {
    return decoded.replace("/embed?", "/download?").replace("&em=2", "");
  }
  // Everything else (download URLs, etc.) → use as-is
  return decoded;
}

// ── Main proxy handler ─────────────────────────────────────────────────────
router.get("/proxy", async (req, res) => {
  const raw = req.query.url;
  if (!raw) return res.status(400).json({ error: "url query param required" });

  let decoded;
  try { decoded = decodeURIComponent(raw); } catch {
    return res.status(400).json({ error: "Invalid URL encoding" });
  }

  // Security: only proxy OneDrive/Microsoft hostnames
  let hostname;
  try { hostname = new URL(decoded).hostname; } catch {
    return res.status(400).json({ error: "Invalid URL" });
  }
  if (!isAllowed(hostname)) {
    return res.status(403).json({ error: "Only OneDrive URLs are allowed" });
  }

  try {
    const fetchUrl = resolveUrl(decoded);

    // Forward Range header so video seeking / partial content works
    const upHeaders = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
                    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "video/*, */*",
    };
    if (req.headers.range) upHeaders["Range"] = req.headers.range;

    const { statusCode, headers: upHead, body } = await rawFetch(fetchUrl, upHeaders);

    // If we got an HTML page (e.g. redirect to web player), report it clearly
    const ct = upHead["content-type"] || "";
    if (ct.includes("text/html")) {
      body.resume();
      return res.status(502).json({
        error: "OneDrive returned an HTML page instead of video. " +
               "Make sure the share is set to 'Anyone with link → Can view'."
      });
    }

    // Forward headers the browser needs for video streaming
    ["content-type","content-length","content-range","accept-ranges","last-modified","etag"]
      .forEach((h) => { if (upHead[h]) res.setHeader(h, upHead[h]); });

    if (!upHead["accept-ranges"]) res.setHeader("accept-ranges", "bytes");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "private, max-age=3600");

    res.status(statusCode);
    body.pipe(res);
    req.on("close", () => body.destroy());

  } catch (err) {
    console.error("[video-proxy]", err.message);
    if (!res.headersSent)
      res.status(502).json({ error: "Failed to fetch video: " + err.message });
  }
});

module.exports = router;
