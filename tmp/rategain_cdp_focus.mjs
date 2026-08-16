const endpoint = "http://127.0.0.1:9222";
const normalUA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36";

async function j(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url} ${r.status}`);
  return r.json();
}

class CDP {
  constructor(ws) {
    this.ws = new WebSocket(ws);
    this.id = 1;
    this.pending = new Map();
    this.handlers = [];
  }
  async open() {
    await new Promise((resolve, reject) => {
      this.ws.addEventListener("open", resolve, { once: true });
      this.ws.addEventListener("error", reject, { once: true });
    });
    this.ws.addEventListener("message", (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const p = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        msg.error ? p.reject(new Error(JSON.stringify(msg.error))) : p.resolve(msg.result);
      } else if (msg.method) {
        for (const h of this.handlers) h(msg);
      }
    });
  }
  send(method, params = {}, sessionId) {
    const id = this.id++;
    const m = { id, method, params };
    if (sessionId) m.sessionId = sessionId;
    this.ws.send(JSON.stringify(m));
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error(`timeout ${method}`));
        }
      }, 15000);
    });
  }
  on(h) {
    this.handlers.push(h);
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function evalExpr(cdp, s, expression) {
  const result = await cdp.send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true, timeout: 15000 }, s);
  return result.result?.value ?? result.exceptionDetails?.text;
}

async function main() {
  const version = await j(`${endpoint}/json/version`);
  const cdp = new CDP(version.webSocketDebuggerUrl);
  await cdp.open();
  const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" });
  const { sessionId: s } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });
  await cdp.send("Page.enable", {}, s);
  await cdp.send("Runtime.enable", {}, s);
  await cdp.send("Network.enable", {}, s);
  await cdp.send("Network.setUserAgentOverride", { userAgent: normalUA }, s);

  for (const url of ["https://rategain.com/privacy-policy/", "https://rategain.com/cookie-policy/"]) {
    await cdp.send("Page.navigate", { url }, s);
    await sleep(9000);
    const text = await evalExpr(cdp, s, `document.body ? document.body.innerText : ""`);
    console.log(`===== ${url} =====`);
    console.log(text);
  }

  await cdp.send("Network.clearBrowserCookies", {}, s);
  await cdp.send("Network.clearBrowserCache", {}, s);
  await cdp.send("Page.navigate", { url: "https://rategain.com/" }, s);
  await sleep(9000);
  const methods = await evalExpr(cdp, s, `Object.keys(window.OneTrust || {}).filter(k => /consent|allow|reject|group|cookie|toggle/i.test(k)).sort()`);
  console.log("===== OneTrust methods =====");
  console.log(JSON.stringify(methods));
  const attempts = [
    `OneTrust.UpdateConsent("Category","C0002:1")`,
    `OneTrust.UpdateConsent("Category","C0002:1,C0003:0,C0004:0,C0005:0")`,
    `OneTrust.UpdateConsent("Category","C0001:1,C0002:1,C0003:0,C0004:0,C0005:0")`,
  ];
  for (const attempt of attempts) {
    await cdp.send("Network.clearBrowserCookies", {}, s);
    await cdp.send("Page.navigate", { url: "https://rategain.com/" }, s);
    await sleep(7000);
    const before = await evalExpr(cdp, s, `({groups: window.OnetrustActiveGroups, consent: document.cookie})`);
    const ret = await evalExpr(cdp, s, attempt);
    await sleep(1200);
    const after = await evalExpr(cdp, s, `({groups: window.OnetrustActiveGroups, consent: document.cookie})`);
    await cdp.send("Page.reload", { ignoreCache: true }, s);
    await sleep(9000);
    const post = await evalExpr(cdp, s, `({groups: window.OnetrustActiveGroups, consent: document.cookie})`);
    console.log("===== attempt =====");
    console.log(attempt);
    console.log(JSON.stringify({ ret, before, after, post }, null, 2));
  }
}

main().catch((e) => {
  console.error(e.stack || e.message);
  process.exit(1);
});
