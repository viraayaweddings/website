/**
 * The panel's stored theme, and the script that applies it before first paint.
 *
 * Deliberately a plain module rather than part of ThemeToggle: every export of
 * a `"use client"` module becomes a client reference on the server, so the
 * layout — a server component — was injecting a reference object into a script
 * tag instead of this source, and the pre-paint theme never applied.
 */

export const THEME_KEY = "vw-admin-theme";

/**
 * Runs before paint. Kept as a string so it can be inlined in the layout: a
 * React effect would run after the first frame and flash the wrong theme.
 */
export const THEME_BOOTSTRAP = `(function(){try{
var stored=localStorage.getItem('${THEME_KEY}');
var dark=stored?stored==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;
var root=document.currentScript&&document.currentScript.parentElement;
while(root&&!root.classList.contains('vw-admin'))root=root.parentElement;
if(root)root.setAttribute('data-theme',dark?'dark':'light');
}catch(e){}})();`;
