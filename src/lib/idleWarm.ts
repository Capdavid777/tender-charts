/**
 * idleWarm — a tiny cooperative scheduler that mounts deferred (below-the-fold)
 * sections during browser idle time once the page is actually visible.
 *
 * Sections still reveal instantly on scroll via IntersectionObserver; this just
 * warms them up beforehand so a fast scroll never lands on a skeleton.
 */

type WarmTask = { priority: number; run: () => void };

const queue: WarmTask[] = [];
let scheduled = false;

type IdleDeadline = { timeRemaining: () => number; didTimeout: boolean };

const requestIdle: (cb: (d: IdleDeadline) => void, opts?: { timeout: number }) => number =
  typeof window !== 'undefined' && 'requestIdleCallback' in window
    ? (window as unknown as { requestIdleCallback: typeof requestIdle }).requestIdleCallback
    : (cb) =>
        window.setTimeout(() => cb({ timeRemaining: () => 8, didTimeout: true }), 200);

function flush(deadline: IdleDeadline) {
  scheduled = false;
  queue.sort((a, b) => a.priority - b.priority);

  while (queue.length && (deadline.timeRemaining() > 4 || deadline.didTimeout)) {
    queue.shift()?.run();
    // Mount at most one section per idle slice to keep frames responsive.
    if (!deadline.didTimeout) break;
  }

  if (queue.length) schedule();
}

function schedule() {
  if (scheduled || typeof window === 'undefined') return;
  scheduled = true;

  const start = () => requestIdle(flush, { timeout: 1200 });

  if (document.visibilityState === 'visible') {
    start();
  } else {
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      document.removeEventListener('visibilitychange', onVisible);
      start();
    };
    document.addEventListener('visibilitychange', onVisible);
  }
}

/**
 * Queue a warm-up callback. Lower `priority` runs first (top-most section first).
 * Returns a cancel function.
 */
export function warmWhenIdle(run: () => void, priority = 0): () => void {
  const task: WarmTask = { priority, run };
  queue.push(task);
  schedule();
  return () => {
    const i = queue.indexOf(task);
    if (i >= 0) queue.splice(i, 1);
  };
}
