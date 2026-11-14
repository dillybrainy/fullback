/** Load the engine only on Home with motion enabled. A generation token
 * prevents an import resolving after navigation or preference changes.
 * @param {HTMLElement} root
 */
export function mountHomeMotion(root, load = () => import("./home-motion.mjs"), preference = window.matchMedia("(prefers-reduced-motion: reduce)")) {
  let generation = 0;
  let dispose;
  const sync = () => {
    const current = ++generation;
    dispose?.();
    dispose = undefined;
    if (preference.matches) return;
    load().then(({ installHomeMotion }) => {
      if (current === generation) dispose = installHomeMotion(root);
    }).catch(() => { /* The static page is the fallback if a chunk fails. */ });
  };
  sync();
  preference.addEventListener("change", sync);
  return () => {
    ++generation;
    preference.removeEventListener("change", sync);
    dispose?.();
  };
}
