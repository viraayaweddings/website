const endpoint = "http://127.0.0.1:9222";
const ua =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36";

async function getJson(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} ${url}`);
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
    await new Promise((res, rej) => {
      this.ws.addEventListener("open", res, { once: true });
      this.ws.addEventListener("error", rej, { once: true });
    });
    this.ws.addEventListener("message", (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
      } else if (msg.method) {
        this.handlers.forEach((h) => h(msg));
      }
    });
  }
  send(method, params = {}, sessionId) {
    const id = this.id++;
    const msg = { id, method, params };
    if (sessionId) msg.sessionId = sessionId;
    this.ws.send(JSON.stringify(msg));
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
  on(handler) {
    this.handlers.push(handler);
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function classify(url) {
  const u = url.toLowerCase();
  return [
    ["ga4", /google-analytics\.com\/g\/collect/.test(u)],
    ["google_ads", /googleads|googleadservices|doubleclick|\/pagead\//.test(u)],
    ["clarity", /clarity\.ms/.test(u)],
    ["bing", /bat\.bing\.com|bing\.com/.test(u)],
    ["facebook", /facebook/.test(u)],
    ["linkedin", /linkedin|licdn/.test(u)],
    ["hotjar", /hotjar/.test(u)],
    ["dreamdata", /dreamdata/.test(u)],
    ["pardot", /ww2\.rategain\.com\/l\/413792|pardot|pi\.pardot/.test(u)],
  ].filter(([, ok]) => ok).map(([k]) => k);
}

async function evalExpr(cdp, s, expression) {
  const r = await cdp.send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true, timeout: 15000 }, s);
  return r.result?.value ?? r.exceptionDetails?.text;
}

async function main() {
  const version = await getJson(`${endpoint}/json/version`);
  const cdp = new CDP(version.webSocketDebuggerUrl);
  await cdp.open();
  const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" });
  const { sessionId: s } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });
  await cdp.send("Page.enable", {}, s);
  await cdp.send("Runtime.enable", {}, s);
  await cdp.send("Network.enable", {}, s);
  await cdp.send("Network.setUserAgentOverride", { userAgent: ua }, s);
  await cdp.send("Network.clearBrowserCookies", {}, s);
  await cdp.send("Network.clearBrowserCache", {}, s);
  await cdp.send("Page.navigate", { url: "https://rategain.com/" }, s);
  await sleep(8000);
  await evalExpr(cdp, s, `OneTrust.UpdateConsent("Category","C0002:1")`);
  await sleep(1500);

  const requests = [];
  cdp.on((msg) => {
    if (msg.sessionId !== s) return;
    if (msg.method === "Network.requestWillBeSent") {
      requests.push({ url: msg.params.request.url, type: msg.params.type });
    }
  });
  await cdp.send("Page.reload", { ignoreCache: true }, s);
  await sleep(12000);
  const page = await evalExpr(cdp, s, `({groups: window.OnetrustActiveGroups, cookie: document.cookie, title: document.title})`);
  const cookies = (await cdp.send("Network.getAllCookies", {}, s)).cookies;
  const vendors = {};
  const samples = {};
  for (const r of requests) {
    for (const label of classify(r.url)) {
      vendors[label] = (vendors[label] || 0) + 1;
      samples[label] ||= [];
      if (samples[label].length < 5) samples[label].push(r.url);
    }
  }
  console.log(JSON.stringify({
    page,
    vendors,
    samples,
    adCookies: cookies.filter((c) => /^(?:_ga|_gid|_gat|_gcl|_fbp|_uet|_cl|_hj|_lfa|visitor_id|pardot|bcookie|lidc|li_sugr|UserMatchHistory|IDE|NID|MUID|fr)/.test(c.name)).map((c) => `${c.name}@${c.domain}`),
  }, null, 2));
}

main().catch((e) => {
  console.error(e.stack || e.message);
  process.exit(1);
});
