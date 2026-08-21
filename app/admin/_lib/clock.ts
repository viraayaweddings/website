/**
 * Reading the clock during render makes a component impure — the same props
 * would produce different output on a re-render. Server components still need
 * "3 hours ago", so the read lives here, outside any component body.
 */
export async function currentTime(): Promise<number> {
  return Date.now();
}
