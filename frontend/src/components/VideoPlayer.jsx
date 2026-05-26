/**
 * VideoPlayer.jsx
 * Supports both:
 *  - YouTube URLs  → renders a YouTube iframe embed
 *  - Direct video  → custom HTML5 player with speed, PiP, fullscreen, seekbar
 */
import { useState, useRef, useEffect, useCallback, forwardRef } from "react";

// ── YouTube URL detection & embed ────────────────────────────────────────────
function getYouTubeId(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    // youtu.be/ID
    if (u.hostname === "youtu.be") return u.pathname.slice(1).split("?")[0];
    // youtube.com/watch?v=ID
    if (u.hostname.includes("youtube.com")) {
      if (u.pathname === "/watch") return u.searchParams.get("v");
      // youtube.com/embed/ID
      if (u.pathname.startsWith("/embed/")) return u.pathname.split("/embed/")[1].split("?")[0];
      // youtube.com/shorts/ID
      if (u.pathname.startsWith("/shorts/")) return u.pathname.split("/shorts/")[1].split("?")[0];
    }
  } catch (_) {}
  return null;
}

function YouTubePlayer({ src, autoPlay }) {
  const videoId = getYouTubeId(src);
  if (!videoId) return (
    <div className="w-full flex items-center justify-center bg-black text-white/40 text-sm" style={{ minHeight: 300 }}>
      Invalid YouTube URL
    </div>
  );
  const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=${autoPlay ? 1 : 0}&rel=0&modestbranding=1`;
  return (
    <div className="w-full bg-black" style={{ aspectRatio: "16/9", maxHeight: "75vh" }}>
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

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
const QUALITIES = [
  { label: "Auto",   value: "auto" },
  { label: "1080p",  value: "1080" },
  { label: "720p",   value: "720"  },
  { label: "480p",   value: "480"  },
  { label: "240p",   value: "240"  },
];

const fmtTime = (s) => {
  if (!s || isNaN(s)) return "0:00";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(Math.floor(s % 60)).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
};

// ── icons ─────────────────────────────────────────────────────────────────────
const PlayIcon  = () => <polygon points="5 3 19 12 5 21 5 3" />;
const PauseIcon = () => (<><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></>);

const VideoPlayer = forwardRef(function VideoPlayer(
  { src, onEnded, onError, autoPlay = true },
  forwardedRef
) {
  // ── YouTube: render iframe, skip all HTML5 logic ─────────────────────────
  if (getYouTubeId(src)) {
    return <YouTubePlayer src={src} autoPlay={autoPlay} />;
  }

  // internal ref — we also forward it so LearnPage can call .pause() / reset currentTime
  const internalRef = useRef(null);
  const videoRef    = forwardedRef || internalRef;

  const wrapRef        = useRef(null);
  const hideTimer      = useRef(null);
  const seekingRef     = useRef(false);

  const [playing,   setPlaying]   = useState(false);
  const [current,   setCurrent]   = useState(0);
  const [duration,  setDuration]  = useState(0);
  const [volume,    setVolume]    = useState(1);
  const [muted,     setMuted]     = useState(false);
  const [speed,     setSpeed]     = useState(1);
  const [quality,   setQuality]   = useState("auto");
  const [buffered,  setBuffered]  = useState(0);
  const [ctrlsVis,  setCtrlsVis] = useState(true);

  // which popup is open — "speed" | "quality" | null
  const [popup, setPopup] = useState(null);

  // ── Fullscreen state (drives max-height removal) ──────────────────────────
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange",       onFsChange);
    document.addEventListener("webkitfullscreenchange", onFsChange);
    document.addEventListener("mozfullscreenchange",    onFsChange);
    document.addEventListener("msfullscreenchange",     onFsChange);
    return () => {
      document.removeEventListener("fullscreenchange",       onFsChange);
      document.removeEventListener("webkitfullscreenchange", onFsChange);
      document.removeEventListener("mozfullscreenchange",    onFsChange);
      document.removeEventListener("msfullscreenchange",     onFsChange);
    };
  }, []);

  // ── auto-hide controls ────────────────────────────────────────────────────
  const resetHide = useCallback(() => {
    setCtrlsVis(true);
    clearTimeout(hideTimer.current);
    if (playing) {
      hideTimer.current = setTimeout(() => {
        if (!popup) setCtrlsVis(false);
      }, 3000);
    }
  }, [playing, popup]);

  useEffect(() => { resetHide(); }, [playing]);
  useEffect(() => {
    // keep controls visible while a popup is open
    if (popup) {
      clearTimeout(hideTimer.current);
      setCtrlsVis(true);
    } else {
      resetHide();
    }
  }, [popup]);
  useEffect(() => () => clearTimeout(hideTimer.current), []);

  // ── playback controls ─────────────────────────────────────────────────────
  const toggle = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play(); else v.pause();
  };

  const handleTimeUpdate = () => {
    const v = videoRef.current;
    if (!v || seekingRef.current) return;
    setCurrent(v.currentTime);
    // buffered
    if (v.buffered.length > 0) {
      setBuffered((v.buffered.end(v.buffered.length - 1) / v.duration) * 100);
    }
  };

  const handleMetadata = () => {
    const v = videoRef.current;
    if (v) { setDuration(v.duration); }
  };

  // ── seek bar ──────────────────────────────────────────────────────────────
  const seekBar  = useRef(null);

  const getSeekRatio = (e) => {
    const rect = seekBar.current.getBoundingClientRect();
    return Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  };

  const handleSeekClick = (e) => {
    if (!videoRef.current || !duration) return;
    const ratio = getSeekRatio(e);
    videoRef.current.currentTime = ratio * duration;
    setCurrent(ratio * duration);
  };

  const handleSeekDrag = (e) => {
    if (!seekingRef.current || !videoRef.current || !duration) return;
    const ratio = getSeekRatio(e);
    setCurrent(ratio * duration);
  };

  const startDrag  = (e) => { seekingRef.current = true; handleSeekDrag(e); };
  const endDrag    = (e) => {
    if (!seekingRef.current) return;
    seekingRef.current = false;
    if (videoRef.current && duration) {
      const ratio = getSeekRatio(e);
      videoRef.current.currentTime = ratio * duration;
    }
  };

  // ── volume ────────────────────────────────────────────────────────────────
  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !muted;
    setMuted(!muted);
  };
  const handleVolume = (e) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) videoRef.current.volume = val;
    setMuted(val === 0);
  };

  // ── speed ─────────────────────────────────────────────────────────────────
  const applySpeed = (s) => {
    setSpeed(s);
    if (videoRef.current) videoRef.current.playbackRate = s;
    setPopup(null);
  };

  // ── quality ───────────────────────────────────────────────────────────────
  const applyQuality = (q) => {
    setQuality(q);
    setPopup(null);
    // NOTE: With a single video URL all options play the same file.
    // To serve real multi-quality, store per-quality URLs in the lecture
    // and swap videoRef.current.src here along with saving/restoring currentTime.
  };

  // ── PiP ──────────────────────────────────────────────────────────────────
  const togglePip = async () => {
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await videoRef.current?.requestPictureInPicture();
    } catch (_) {}
  };

  // ── Fullscreen — vendor-prefixed for full browser coverage ──────────────
  const toggleFullscreen = () => {
    const el = wrapRef.current;
    if (!el) return;

    const isFs =
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement;

    if (isFs) {
      (document.exitFullscreen ||
       document.webkitExitFullscreen ||
       document.mozCancelFullScreen ||
       document.msExitFullscreen)?.call(document);
    } else {
      (el.requestFullscreen ||
       el.webkitRequestFullscreen ||
       el.mozRequestFullScreen ||
       el.msRequestFullscreen)?.call(el);
    }
  };

  // keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if (["INPUT","TEXTAREA"].includes(e.target.tagName)) return;
      if (e.code === "Space") { e.preventDefault(); toggle(); }
      if (e.code === "ArrowRight" && videoRef.current) videoRef.current.currentTime += 10;
      if (e.code === "ArrowLeft"  && videoRef.current) videoRef.current.currentTime -= 10;
      if (e.code === "KeyF") toggleFullscreen();
      if (e.code === "KeyM") toggleMute();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [playing, muted]);

  const progress = duration > 0 ? (current / duration) * 100 : 0;

  const VolumeIcon = () => muted || volume === 0
    ? (<><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></>)
    : volume < 0.5
    ? (<><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></>)
    : (<><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></>);

  // Wrapper size: full viewport when fullscreen, capped at 75vh otherwise
  const wrapStyle = isFullscreen
    ? { width: "100vw", height: "100vh", maxHeight: "100vh" }
    : { maxHeight: "75vh" };

  const videoStyle = isFullscreen
    ? { width: "100%", height: "100%", maxHeight: "100vh", display: "block", objectFit: "contain" }
    : { maxHeight: "75vh", display: "block" };

  return (
    <div
      ref={wrapRef}
      className="relative bg-black w-full select-none"
      style={wrapStyle}
      onMouseMove={resetHide}
      onMouseLeave={() => { if (playing && !popup) setCtrlsVis(false); }}
      onClick={() => { setPopup(null); }}
    >
      {/* ── Raw video element ── */}
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
        onError={() => onError?.()}
        onClick={(e) => { e.stopPropagation(); toggle(); }}
      />

      {/* ── Controls overlay ── */}
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
          <div className="absolute inset-y-0 left-0 rounded-full bg-primary"
            style={{ width: `${progress}%` }}>
            {/* Thumb */}
            <div
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3.5 h-3.5 rounded-full bg-white shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ boxShadow: "0 0 6px rgba(232,71,26,0.6)" }}
            />
          </div>
        </div>

        {/* Controls bar */}
        <div className="flex items-center gap-2 px-4 pb-3 pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Play / Pause */}
          <button onClick={toggle}
            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/10 text-white transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
              {playing ? <PauseIcon /> : <PlayIcon />}
            </svg>
          </button>

          {/* Volume */}
          <div className="flex items-center gap-1.5 group/vol">
            <button onClick={toggleMute}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-white transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2}>
                <VolumeIcon />
              </svg>
            </button>
            <input
              type="range" min={0} max={1} step={0.05}
              value={muted ? 0 : volume}
              onChange={handleVolume}
              className="w-0 group-hover/vol:w-16 transition-all duration-200 accent-primary h-1 rounded-full cursor-pointer opacity-0 group-hover/vol:opacity-100"
            />
          </div>

          {/* Time */}
          <span className="text-white/70 text-xs font-mono ml-1">
            {fmtTime(current)} / {fmtTime(duration)}
          </span>

          <div className="flex-1" />

          {/* ── Speed picker ── */}
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setPopup(popup === "speed" ? null : "speed"); }}
              className={`h-8 px-2.5 rounded-lg text-xs font-bold transition-colors ${popup === "speed" ? "bg-primary text-white" : "text-white/70 hover:text-white hover:bg-white/10"}`}
            >
              {speed === 1 ? "1× Speed" : `${speed}×`}
            </button>
            {popup === "speed" && (
              <div
                className="absolute bottom-11 right-0 w-36 bg-[#13162A] border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-50"
                onClick={(e) => e.stopPropagation()}
              >
                <p className="text-[10px] text-white/40 px-3 pt-3 pb-1.5 uppercase tracking-widest font-semibold">
                  Playback speed
                </p>
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

          {/* ── Quality picker ── */}
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setPopup(popup === "quality" ? null : "quality"); }}
              className={`h-8 px-2.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${popup === "quality" ? "bg-primary text-white" : "text-white/70 hover:text-white hover:bg-white/10"}`}
            >
              {/* monitor icon */}
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <rect x="2" y="3" width="20" height="14" rx="2"/>
                <line x1="8" y1="21" x2="16" y2="21"/>
                <line x1="12" y1="17" x2="12" y2="21"/>
              </svg>
              {quality === "auto" ? "Auto" : `${quality}p`}
            </button>
            {popup === "quality" && (
              <div
                className="absolute bottom-11 right-0 w-40 bg-[#13162A] border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-50"
                onClick={(e) => e.stopPropagation()}
              >
                <p className="text-[10px] text-white/40 px-3 pt-3 pb-1.5 uppercase tracking-widest font-semibold">
                  Quality
                </p>
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
            {isFullscreen ? (
              /* exit-fullscreen icon */
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/>
              </svg>
            ) : (
              /* enter-fullscreen icon */
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Global click to close any popup */}
      {popup && (
        <div className="fixed inset-0 z-40" onClick={() => setPopup(null)} />
      )}
    </div>
  );
});

export default VideoPlayer;
