// Keep native captions above controls in the taller portrait player. This does
// not load media, select a language, or change the viewer's caption preference.
export function mountDemoCaptionLayout(video) {
  if (!video) return () => {};
  const win = video.ownerDocument.defaultView;
  const listeners = [];
  const listen = (node, event, fn) => {
    if (!node?.addEventListener) return;
    node.addEventListener(event, fn);
    listeners.push(() => node.removeEventListener(event, fn));
  };
  function position() {
    const box = video.getBoundingClientRect();
    if (!box.width || !box.height) return;
    const tutorial = video.hasAttribute('data-demo-tutorial-video');
    const line = box.height / box.width > .7 ? (tutorial ? 60 : 78) : 84;
    for (const track of video.textTracks || []) {
      for (const cue of track.cues || []) {
        cue.snapToLines = false;
        cue.line = line;
        if (tutorial) cue.size = 90;
      }
    }
  }
  for (const track of video.querySelectorAll('track')) listen(track, 'load', position);
  for (const event of ['loadedmetadata', 'webkitbeginfullscreen', 'webkitendfullscreen']) listen(video, event, position);
  listen(video.textTracks, 'change', position);
  listen(win, 'resize', position);
  listen(video.ownerDocument, 'fullscreenchange', position);
  position();
  return () => listeners.forEach(remove => remove());
}

export function mountDemoTutorial(details) {
  const video = details?.querySelector('[data-demo-tutorial-video]');
  if (!video) return () => {};
  const disposeCaptions = mountDemoCaptionLayout(video);
  const onToggle = () => { if (!details.open) video.pause(); };
  details.addEventListener('toggle', onToggle);
  return () => { details.removeEventListener('toggle', onToggle); disposeCaptions(); };
}

// Chapter navigation is a user-initiated enhancement; the guide works without video or JS.
export function mountProductDemo(root) {
  const video = root?.querySelector('.product-demo-player');
  const guide = root?.querySelector('[data-demo-guide]');
  const status = guide?.querySelector('[data-demo-status]');
  if (!video || !guide || !status) return () => {};
  const disposeCaptions = mountDemoCaptionLayout(video);
  const chapters = [...guide.querySelectorAll('[data-demo-seek]')].map(button => ({
    button, time: Number(button.dataset.demoSeek),
  })).filter(({button, time}) => button.dataset.demoSeek?.trim() && Number.isFinite(time) && time >= 0 &&
    button.getAttribute('aria-controls') === video.id);
  let pending = null, timer = null, disposed = false, loading = false;
  const listeners = [];
  const listen = (node, type, fn) => {
    node.addEventListener(type, fn);
    listeners.push(() => node.removeEventListener(type, fn));
  };
  const message = (key, chapter) => (guide.dataset[key] || '')
    .replace('{time}', chapter?.button.dataset.demoClock || '')
    .replace('{title}', chapter?.button.dataset.demoTitle || '');
  function mark(chapter) {
    for (const entry of chapters) {
      if (entry === chapter) entry.button.setAttribute('aria-current', 'true');
      else entry.button.removeAttribute('aria-current');
    }
  }
  function finish() {
    if (!pending) return;
    mark(pending.chapter);
    status.textContent = message('ready', pending.chapter);
    pending = null;
    clearTimeout(timer);
    guide.removeAttribute('aria-busy');
  }
  function fail() {
    if (!pending) return;
    pending = null;
    loading = false;
    clearTimeout(timer);
    guide.removeAttribute('aria-busy');
    status.textContent = message('error');
  }
  function canSeekTo(time) {
    const ranges = video.seekable;
    for (let i = 0; i < ranges.length; i++) {
      if (time >= ranges.start(i) && time <= ranges.end(i)) return true;
    }
    return false;
  }
  function settleSeek() {
    if (pending?.applied && video.readyState >= 2 && !video.seeking &&
        canSeekTo(pending.target) && Math.abs(video.currentTime - pending.target) < 0.1) finish();
  }
  function applySeek() {
    if (disposed || !pending || pending.applied || video.readyState < 1 ||
        !Number.isFinite(video.duration) || video.duration <= 0) return;
    // Metadata may arrive after several chapter clicks; only the latest request wins.
    const request = pending;
    // A stale chapter map must not silently jump to a different scene or claim success.
    if (request.chapter.time >= video.duration) { fail(); return; }
    // Metadata alone does not make a time seekable. An empty range can silently
    // cancel currentTime assignment rather than throw; retry after media progress.
    if (!canSeekTo(request.chapter.time)) return;
    request.target = request.chapter.time;
    request.applied = true;
    try { video.currentTime = request.target; }
    catch { request.applied = false; return; } // Retry when loadeddata/canplay makes seeking possible.
    settleSeek();
  }
  function seek(chapter) {
    video.pause();
    pending = {chapter, applied: false, target: null};
    clearTimeout(timer);
    timer = setTimeout(fail, 15000);
    status.textContent = message('loading', chapter);
    guide.setAttribute('aria-busy', 'true');
    // No play() call: clicking a chapter positions the video and leaves playback to the viewer.
    video.scrollIntoView?.({block: 'center', behavior: 'instant'});
    // Only an explicit chapter click requests media data. Metadata-only preload
    // can otherwise suspend a paused video before its target frame is available.
    video.preload = 'auto';
    if (video.readyState < 1 || video.error || video.networkState === 3) {
      if (!loading || video.error || video.networkState === 3) {
        loading = true;
        try { video.load(); } catch { loading = false; fail(); }
      }
    } else applySeek();
  }
  for (const chapter of chapters) {
    chapter.button.disabled = false;
    listen(chapter.button, 'click', () => seek(chapter));
  }
  for (const event of ['loadedmetadata', 'durationchange', 'loadeddata', 'canplay', 'progress']) listen(video, event, () => {
    applySeek();
    settleSeek();
  });
  listen(video, 'seeked', () => {
    settleSeek();
    // A decoder may clamp a seek as its ranges change. Wait for later progress
    // rather than claiming readiness or immediately starting another seek loop.
    if (pending?.applied && !video.seeking && Math.abs(video.currentTime - pending.target) >= 0.1) {
      pending.applied = false;
    }
  });
  listen(video, 'timeupdate', () => {
    if (!pending && video.readyState >= 1) {
      const chapter = chapters.filter(entry => entry.time <= video.currentTime + 0.05)
        .sort((a, b) => b.time - a.time)[0];
      if (chapter) mark(chapter);
    }
  });
  listen(video, 'error', () => { loading = false; fail(); });
  return () => {
    disposeCaptions();
    disposed = true;
    pending = null;
    clearTimeout(timer);
    listeners.forEach(remove => remove());
    guide.removeAttribute('aria-busy');
    for (const {button} of chapters) button.disabled = true;
  };
}

if (typeof document !== 'undefined') {
  document.querySelectorAll('.product-demo').forEach(mountProductDemo);
  document.querySelectorAll('.product-demo-tutorial').forEach(mountDemoTutorial);
}
