/**
 * VideoPlayer.jsx
 * Supports both:
 *  - YouTube URLs  → renders a YouTube iframe embed with custom controls
 *  - Direct video  → custom HTML5 player with speed, PiP, fullscreen, seekbar
 *
 * Key architecture: VideoPlayer is a pure router (no hooks) that delegates to
 * either YouTubePlayer or HTML5Player — both use their own hooks without
 * violating React's Rules of Hooks.
 */
import { useState, useRef, useEffect, useCallback, forwardRef } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Shared constants / helpers
// ─────────────────────────────────────────────────────────────────────────────
const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
const QUALITIES = [
  { label: "Auto",  value: "auto" },
  { label: "1080p", value: "1080" },
  { label: "720p",  value: "720"  },
  { label: "480p",  value: "480"  },
  { label: "240p",  value: "240"  },
];

const fmtTime = (s) => {
  if (!s || isNaN(s)) return "0:00";
  const h   = Math.floor(s / 3600);
  const m   = Math.floor((s % 3600) / 60);
  const sec = String(Math.floor(s % 60)).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
};

function getYouTubeId(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname === "youtu.be") return u.pathname.slice(1).split("?")[0];
    if (u.hostname.includes("youtube.com")) {
      if (u.pathname === "/watch")           return u.searchParams.get("v");
      if (u.pathname.startsWith("/embed/"))  return u.pathname.split("/embed/")[1].split("?")[0];
      if (u.pathname.startsWith("/shorts/")) return u.pathname.split("/shorts/")[1].split("?")[0];
    }
  } catch (_) {}
  return null;
}

// Extract Google Drive file ID from various Drive URL formats
export function getGoogleDriveId(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname === "drive.google.com") {
      // /file/d/FILE_ID/view  or  /file/d/FILE_ID/preview
      const m = u.pathname.match(/\/file\/d\/([^/]+)/);
      if (m) return m[1];
      // /open?id=FILE_ID  or  /uc?id=FILE_ID
      return u.searchParams.get("id") || null;
    }
  } catch (_) {}
  return null;
}

// ── OneDrive URL type detection ───────────────────────────────────────────────

/**
 * True for OneDrive URLs that can be used in an <iframe> embed:
 *  1. onedrive.live.com/embed?resid=...&authkey=!...  (full embed URL from Embed dialog)
 *  2. 1drv.ms/v/... WITHOUT ?e=TOKEN  (clean link → redirects to /embed, no X-Frame-Options)
 *
 * NOT included: 1drv.ms/v/...?e=TOKEN  (share/view link → goes to web player, X-Frame: DENY)
 */
export function isOneDriveEmbedUrl(url) {
  if (!url) return false;
  try {
    const u = new URL(url);
    // Standard embed URL
    if (
      (u.hostname === "onedrive.live.com" || u.hostname === "d.docs.live.net") &&
      u.pathname.startsWith("/embed")
    ) return true;
    // Clean 1drv.ms link (no ?e= token) — redirects to /embed&embed=1, works in iframe
    if (u.hostname === "1drv.ms" && !u.searchParams.has("e")) return true;
  } catch (_) {}
  return false;
}

/** True for ALL OneDrive / SharePoint URLs (share links, download links, embed links, 1drv.ms) */
export function isOneDriveUrl(url) {
  if (!url) return false;
  try {
    const h = new URL(url).hostname;
    return (
      h === "onedrive.live.com"   ||
      h === "1drv.ms"             ||
      h === "d.docs.live.net"     ||
      h.endsWith(".sharepoint.com")
    );
  } catch (_) {}
  return false;
}

/**
 * Convert /download URL to /embed URL (for download?resid= links that include authkey).
 * Returns null for 1drv.ms short links — they can't be converted without knowing the authkey.
 */
export function toOneDriveEmbedUrl(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname === "onedrive.live.com" || u.hostname === "d.docs.live.net") {
      if (u.pathname.startsWith("/download")) {
        u.pathname = "/embed";
        u.searchParams.set("em", "2");
        return u.toString();
      }
      if (u.pathname.startsWith("/embed")) {
        if (!u.searchParams.has("em")) u.searchParams.set("em", "2");
        return u.toString();
      }
    }
  } catch (_) {}
  return null;
}

/** @deprecated kept for backwards-compat import in CourseBuilder */
export function normalizeOneDriveUrl(url) {
  return toOneDriveEmbedUrl(url) || url;
}

// ─────────────────────────────────────────────────────────────────────────────
// Volume icon (shared SVG paths)
// ─────────────────────────────────────────────────────────────────────────────
function VolPaths({ muted, volume }) {
  if (muted || volume === 0)
    return (<><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></>);
  if (volume < 0.5)
    return (<><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></>);
  return (<><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></>);
}

// ─────────────────────────────────────────────────────────────────────────────
// YouTubePlayer — native YouTube embed (YouTube's own controls)
// ─────────────────────────────────────────────────────────────────────────────
function YouTubePlayer({ src, autoPlay }) {
  const videoId = getYouTubeId(src);

  if (!videoId)
    return (
      <div className="w-full flex items-center justify-center bg-black text-white/40 text-sm" style={{ minHeight: 300 }}>
        Invalid YouTube URL
      </div>
    );

  const embedUrl =
    `https://www.youtube.com/embed/${videoId}` +
    `?autoplay=${autoPlay ? 1 : 0}` +
    `&rel=0&playsinline=1`;

  return (
    <div className="w-full bg-black" style={{ aspectRatio: "16/9" }}>
      <iframe
        src={embedUrl}
        title="YouTube video"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        className="w-full h-full border-0"
        style={{ display: "block" }}
      />
    </div>
  );
}

// Build a proxy URL that streams an OneDrive video through our own backend
// (used for download?resid= URLs that have an authkey — won't work for share/embed links)
const API_BASE = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");
export function toProxyUrl(oneDriveUrl) {
  return `${API_BASE}/videos/proxy?url=${encodeURIComponent(oneDriveUrl)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// GoogleDrivePlayer — iframe using Google's own preview player
// Share the file as "Anyone with link → Viewer" in Google Drive first
// ─────────────────────────────────────────────────────────────────────────────
function GoogleDrivePlayer({ src }) {
  const fileId = getGoogleDriveId(src);
  if (!fileId) {
    return (
      <div className="w-full flex items-center justify-center bg-black text-white/40 text-sm" style={{ minHeight: 300 }}>
        Invalid Google Drive URL
      </div>
    );
  }
  return (
    <div className="w-full bg-black" style={{ aspectRatio: "16/9" }}>
      <iframe
        src={`https://drive.google.com/file/d/${fileId}/preview`}
        title="Google Drive video"
        allow="autoplay; fullscreen"
        allowFullScreen
        className="w-full h-full border-0"
        style={{ display: "block" }}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// OneDriveEmbedPlayer — iframe using Microsoft's own player
// Works for URLs from OneDrive → "..." → Embed → Generate → copy the src
// Format: https://onedrive.live.com/embed?resid=...&authkey=!...&em=2
// ─────────────────────────────────────────────────────────────────────────────
function OneDriveEmbedPlayer({ src }) {
  // Ensure em=2 is set (enables the media player mode)
  let embedSrc = src;
  try {
    const u = new URL(src);
    if (!u.searchParams.has("em")) u.searchParams.set("em", "2");
    embedSrc = u.toString();
  } catch (_) {}

  return (
    <div className="w-full bg-black relative" style={{ aspectRatio: "16/9" }}>
      <iframe
        src={embedSrc}
        title="OneDrive video"
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
        className="w-full h-full border-0"
        style={{ display: "block" }}
        frameBorder="0"
        scrolling="no"
      />
      {/* Block the "Open in browser" button (bottom-right of the player controls) */}
      <div style={{
        position: "absolute", bottom: 0, right: 0,
        width: 44, height: 44,
        zIndex: 10, cursor: "default",
        background: "transparent",
      }} />
      {/* Block the "About video / Help" bar at the top-right */}
      <div style={{
        position: "absolute", top: 0, right: 0,
        width: "100%", height: 40,
        zIndex: 10, cursor: "default",
        background: "transparent",
      }} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// OneDriveErrorCard — shown for 1drv.ms share links / viewer URLs that can't be
// streamed. Guides the user to generate a proper embed URL.
// ─────────────────────────────────────────────────────────────────────────────
function OneDriveErrorCard() {
  return (
    <div className="w-full flex items-center justify-center bg-black text-center p-8"
      style={{ minHeight: 300 }}>
      <div className="max-w-md">
        <div className="text-4xl mb-3">☁️</div>
        <p className="text-white/80 font-semibold mb-1">OneDrive share link can't be streamed</p>
        <p className="text-white/40 text-sm mb-4">
          OneDrive share links open a web player page — they can't be used as a video source.
          You need the <strong className="text-white/60">embed URL</strong> instead.
        </p>
        <div className="text-left text-xs text-white/40 bg-white/[0.04] rounded-xl p-4 space-y-2">
          <p className="text-white/70 font-semibold mb-2">How to fix — 2 steps:</p>
          <p>1. Right-click the video in OneDrive → <strong className="text-white/60">Embed</strong> → <strong className="text-white/60">Generate</strong></p>
          <p>2. Copy the URL shown (looks like <code className="text-purple-400">1drv.ms/v/c/…</code>) and paste it in Course Builder</p>
          <p className="mt-2 text-yellow-400/60">⚠ The URL you have ends with <code className="text-purple-400">?e=…</code> — that's a share link, not an embed link. The embed URL has no <code className="text-purple-400">?e=</code>.</p>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HTML5Player — custom controls over a native <video> element
// ─────────────────────────────────────────────────────────────────────────────
const HTML5Player = forwardRef(function HTML5Player(
  { src, onEnded, onError, autoPlay = true },
  forwardedRef
) {
  const internalRef = useRef(null);
  const videoRef    = forwardedRef || internalRef;

  const wrapRef    = useRef(null);
  const seekBar    = useRef(null);
  const hideTimer  = useRef(null);
  const seekingRef = useRef(false);

  const [playing,     setPlaying]     = useState(false);
  const [current,     setCurrent]     = useState(0);
  const [duration,    setDuration]    = useState(0);
  const [volume,      setVolume]      = useState(1);
  const [muted,       setMuted]       = useState(false);
  const [speed,       setSpeed]       = useState(1);
  const [quality,     setQuality]     = useState("auto");
  const [buffered,    setBuffered]    = useState(0);
  const [ctrlsVis,   setCtrlsVis]    = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [popup,       setPopup]       = useState(null);  // "speed" | "quality" | null
  const [loadError,   setLoadError]   = useState(false);

  // Fullscreen detection
  useEffect(() => {
    const fn = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange",       fn);
    document.addEventListener("webkitfullscreenchange", fn);
    document.addEventListener("mozfullscreenchange",    fn);
    document.addEventListener("msfullscreenchange",     fn);
    return () => {
      document.removeEventListener("fullscreenchange",       fn);
      document.removeEventListener("webkitfullscreenchange", fn);
      document.removeEventListener("mozfullscreenchange",    fn);
      document.removeEventListener("msfullscreenchange",     fn);
    };
  }, []);

  // Auto-hide controls
  const resetHide = useCallback(() => {
    setCtrlsVis(true);
    clearTimeout(hideTimer.current);
    if (playing && !popup)
      hideTimer.current = setTimeout(() => setCtrlsVis(false), 3000);
  }, [playing, popup]);

  useEffect(() => { resetHide(); }, [playing]);
  useEffect(() => {
    if (popup) { clearTimeout(hideTimer.current); setCtrlsVis(true); }
    else resetHide();
  }, [popup]);
  useEffect(() => () => clearTimeout(hideTimer.current), []);

  // Playback
  const toggle = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.paused ? v.play() : v.pause();
  }, [videoRef]);

  const handleTimeUpdate = () => {
    const v = videoRef.current;
    if (!v || seekingRef.current) return;
    setCurrent(v.currentTime);
    if (v.buffered.length > 0)
      setBuffered((v.buffered.end(v.buffered.length - 1) / v.duration) * 100);
  };

  const handleMetadata = () => {
    const v = videoRef.current;
    if (v) setDuration(v.duration);
  };

  // Seek bar
  const getSeekRatio = (e) => {
    const rect = seekBar.current.getBoundingClientRect();
    return Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  };
  const handleSeekClick = (e) => {
    if (!videoRef.current || !duration) return;
    const r = getSeekRatio(e);
    videoRef.current.currentTime = r * duration;
    setCurrent(r * duration);
  };
  const handleSeekDrag = (e) => {
    if (!seekingRef.current || !videoRef.current || !duration) return;
    setCurrent(getSeekRatio(e) * duration);
  };
  const startDrag = (e) => { seekingRef.current = true; handleSeekDrag(e); };
  const endDrag   = (e) => {
    if (!seekingRef.current) return;
    seekingRef.current = false;
    if (videoRef.current && duration) videoRef.current.currentTime = getSeekRatio(e) * duration;
  };

  // Volume
  const toggleMute = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !muted;
    setMuted(!muted);
  }, [muted, videoRef]);

  const handleVolume = (e) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) videoRef.current.volume = val;
    setMuted(val === 0);
  };

  // Speed
  const applySpeed = (s) => {
    setSpeed(s);
    if (videoRef.current) videoRef.current.playbackRate = s;
    setPopup(null);
  };

  // Quality (UI only — real multi-quality needs multiple source URLs)
  const applyQuality = (q) => { setQuality(q); setPopup(null); };

  // PiP
  const togglePip = async () => {
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await videoRef.current?.requestPictureInPicture();
    } catch (_) {}
  };

  // Fullscreen
  const toggleFullscreen = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    const isFs =
      document.fullscreenElement       ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement    ||
      document.msFullscreenElement;
    if (isFs) {
      (document.exitFullscreen        ||
       document.webkitExitFullscreen  ||
       document.mozCancelFullScreen   ||
       document.msExitFullscreen)?.call(document);
    } else {
      (el.requestFullscreen        ||
       el.webkitRequestFullscreen  ||
       el.mozRequestFullScreen     ||
       el.msRequestFullscreen)?.call(el);
    }
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if (["INPUT", "TEXTAREA"].includes(e.target.tagName)) return;
      if (e.code === "Space")      { e.preventDefault(); toggle(); }
      if (e.code === "ArrowRight" && videoRef.current) videoRef.current.currentTime += 10;
      if (e.code === "ArrowLeft"  && videoRef.current) videoRef.current.currentTime -= 10;
      if (e.code === "KeyF") toggleFullscreen();
      if (e.code === "KeyM") toggleMute();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [toggle, toggleMute, toggleFullscreen, videoRef]);

  const progress = duration > 0 ? (current / duration) * 100 : 0;

  // Same logic as YouTube player: fill full width, cap at 75vh so it never overflows screen
  const wrapStyle  = isFullscreen ? { width: "100vw", height: "100vh", maxHeight: "100vh" } : {};
  const videoStyle = isFullscreen
    ? { width: "100%", height: "100%", maxHeight: "100vh", display: "block", objectFit: "contain" }
    : { width: "100%", height: "min(56.25vw, 75vh)", display: "block", objectFit: "contain" };

  // ── Error overlay — shown when <video> fails to load ──────────────────────
  if (loadError) {
    return (
      <div className="w-full flex items-center justify-center bg-black text-center p-8"
        style={{ minHeight: 300 }}>
        <div className="max-w-sm">
          <div className="text-4xl mb-3">⚠️</div>
          <p className="text-white/70 font-semibold mb-2">Video failed to load</p>
          <p className="text-xs text-white/30 mt-2">
            Check the video URL in the Course Builder and make sure it points to a direct video file (MP4/WebM) or a supported platform.
          </p>
          <button
            onClick={() => setLoadError(false)}
            className="mt-4 text-xs text-white/40 hover:text-white underline transition-colors"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={wrapRef}
      className="relative bg-black w-full select-none"
      style={wrapStyle}
      onMouseMove={resetHide}
      onMouseLeave={() => { if (playing && !popup) setCtrlsVis(false); }}
      onClick={() => setPopup(null)}
    >
      {/* Raw video element */}
      <video
        ref={videoRef}
        key={src}
        src={src}
        autoPlay={autoPlay}
        className="w-full cursor-pointer"
        style={videoStyle}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleMetadata}
        onEnded={() => { setPlaying(false); onEnded?.(); }}
        onError={() => { setLoadError(true); onError?.(); }}
        onClick={(e) => { e.stopPropagation(); toggle(); }}
      />

      {/* Controls overlay */}
      <div
        className={`absolute inset-0 flex flex-col justify-end pointer-events-none transition-opacity duration-300 ${ctrlsVis ? "opacity-100" : "opacity-0"}`}
        style={{ background: "linear-gradient(transparent 55%, rgba(0,0,0,0.85) 100%)" }}
      >
        {/* Seek bar */}
        <div
          ref={seekBar}
          className="mx-4 mb-3 h-1.5 rounded-full cursor-pointer relative group pointer-events-auto"
          style={{ background: "rgba(255,255,255,0.15)" }}
          onClick={handleSeekClick}
          onMouseDown={startDrag}
          onMouseMove={handleSeekDrag}
          onMouseUp={endDrag}
          onMouseLeave={endDrag}
        >
          {/* Buffered */}
          <div className="absolute inset-y-0 left-0 rounded-full"
            style={{ width: `${buffered}%`, background: "rgba(255,255,255,0.2)" }} />
          {/* Played */}
          <div className="absolute inset-y-0 left-0 rounded-full bg-primary" style={{ width: `${progress}%` }}>
            {/* Thumb */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3.5 h-3.5 rounded-full bg-white shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ boxShadow: "0 0 6px rgba(232,71,26,0.6)" }} />
          </div>
        </div>

        {/* Controls bar */}
        <div className="flex items-center gap-2 px-4 pb-3 pointer-events-auto" onClick={(e) => e.stopPropagation()}>
          {/* Play / Pause */}
          <button onClick={toggle} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/10 text-white transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
              {playing
                ? <><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></>
                : <polygon points="5 3 19 12 5 21 5 3"/>}
            </svg>
          </button>

          {/* Volume */}
          <div className="flex items-center gap-1.5 group/vol">
            <button onClick={toggleMute} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-white transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2}>
                <VolPaths muted={muted} volume={volume} />
              </svg>
            </button>
            <input type="range" min={0} max={1} step={0.05} value={muted ? 0 : volume}
              onChange={handleVolume}
              className="w-0 group-hover/vol:w-16 transition-all duration-200 accent-primary h-1 rounded-full cursor-pointer opacity-0 group-hover/vol:opacity-100" />
          </div>

          {/* Time */}
          <span className="text-white/70 text-xs font-mono ml-1">
            {fmtTime(current)} / {fmtTime(duration)}
          </span>

          <div className="flex-1" />

          {/* Speed picker */}
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setPopup(popup === "speed" ? null : "speed"); }}
              className={`h-8 px-2.5 rounded-lg text-xs font-bold transition-colors ${popup === "speed" ? "bg-primary text-white" : "text-white/70 hover:text-white hover:bg-white/10"}`}
            >
              {speed === 1 ? "1× Speed" : `${speed}×`}
            </button>
            {popup === "speed" && (
              <div className="absolute bottom-11 right-0 w-36 bg-[#13162A] border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-50"
                onClick={(e) => e.stopPropagation()}>
                <p className="text-[10px] text-white/40 px-3 pt-3 pb-1.5 uppercase tracking-widest font-semibold">Playback speed</p>
                {SPEEDS.map((s) => (
                  <button key={s} onClick={() => applySpeed(s)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 text-sm transition-colors ${speed === s ? "text-primary font-bold bg-primary/10" : "text-white/70 hover:bg-white/5 hover:text-white"}`}>
                    <span>{s === 1 ? "Normal" : `${s}×`}</span>
                    {speed === s && <span className="text-primary text-xs">●</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quality picker */}
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setPopup(popup === "quality" ? null : "quality"); }}
              className={`h-8 px-2.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${popup === "quality" ? "bg-primary text-white" : "text-white/70 hover:text-white hover:bg-white/10"}`}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <rect x="2" y="3" width="20" height="14" rx="2"/>
                <line x1="8" y1="21" x2="16" y2="21"/>
                <line x1="12" y1="17" x2="12" y2="21"/>
              </svg>
              {quality === "auto" ? "Auto" : `${quality}p`}
            </button>
            {popup === "quality" && (
              <div className="absolute bottom-11 right-0 w-40 bg-[#13162A] border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-50"
                onClick={(e) => e.stopPropagation()}>
                <p className="text-[10px] text-white/40 px-3 pt-3 pb-1.5 uppercase tracking-widest font-semibold">Quality</p>
                {QUALITIES.map((q) => (
                  <button key={q.value} onClick={() => applyQuality(q.value)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 text-sm transition-colors ${quality === q.value ? "text-primary font-bold bg-primary/10" : "text-white/70 hover:bg-white/5 hover:text-white"}`}>
                    <span>{q.label}</span>
                    {quality === q.value && <span className="text-primary text-xs">●</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* PiP */}
          {!!document?.pictureInPictureEnabled && (
            <button onClick={togglePip} title="Picture-in-picture"
              className="w-8 h-8 flex items-center justify-center rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <rect x="2" y="3" width="20" height="14" rx="2"/>
                <rect x="12" y="11" width="9" height="6" rx="1" fill="currentColor" stroke="none"/>
              </svg>
            </button>
          )}

          {/* Fullscreen */}
          <button onClick={toggleFullscreen} title={isFullscreen ? "Exit Fullscreen (F)" : "Fullscreen (F)"}
            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${isFullscreen ? "text-primary bg-primary/15" : "text-white/70 hover:text-white hover:bg-white/10"}`}>
            {isFullscreen
              ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg>
              : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
            }
          </button>
        </div>
      </div>

      {/* Global click to close any popup */}
      {popup && <div className="fixed inset-0 z-40" onClick={() => setPopup(null)} />}
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// VideoPlayer — pure router, zero hooks, no Rules-of-Hooks violation
//
//  Routing logic:
//    YouTube URL           → YouTubePlayer         (YouTube iframe)
//    Google Drive URL      → GoogleDrivePlayer     (Google Drive preview iframe)
//    OneDrive embed URL    → OneDriveEmbedPlayer   (Microsoft's own player in iframe)
//    Other OneDrive URL    → OneDriveErrorCard     (guides user to use embed URL)
//    Other URL             → HTML5Player           (custom controls, Cloudinary / direct MP4)
// ─────────────────────────────────────────────────────────────────────────────
const VideoPlayer = forwardRef(function VideoPlayer(
  { src, onEnded, onError, autoPlay = true },
  forwardedRef
) {
  if (getYouTubeId(src))         return <YouTubePlayer src={src} autoPlay={autoPlay} />;
  if (getGoogleDriveId(src))     return <GoogleDrivePlayer src={src} />;
  if (isOneDriveEmbedUrl(src))   return <OneDriveEmbedPlayer src={src} />;
  // Other OneDrive URLs (share links, 1drv.ms, viewer URLs) → can't be streamed
  if (isOneDriveUrl(src))        return <OneDriveErrorCard />;
  // Everything else → HTML5 player (Cloudinary, direct MP4, etc.)
  return (
    <HTML5Player
      ref={forwardedRef}
      src={src}
      onEnded={onEnded}
      onError={onError}
      autoPlay={autoPlay}
    />
  );
});

export default VideoPlayer;
