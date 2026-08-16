const endpoint = "http://127.0.0.1:9222";
const normalUA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36";

async function json(url, opts) {
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`${url} ${res.status}`);
  return await res.json();
}

class CDP {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.nextId = 1;
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
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(JSON.stringify(msg.error)));
        else resolve(msg.result);
      } else if (msg.method) {
        for (const handler of this.handlers) handler(msg);
      }
    });
  }
  send(method, params = {}, sessionId) {
    const id = this.nextId++;
    const message = { id, method, params };
    if (sessionId) message.sessionId = sessionId;
    this.ws.send(JSON.stringify(message));
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error(`Timeout: ${method}`));
        }
      }, 20000);
    });
  }
  on(handler) {
    this.handlers.push(handler);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function hostOf(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

function classify(url) {
  const host = hostOf(url);
  const u = url.toLowerCase();
  const checks = [
    ["ga_collect", /google-analytics\.com\/g\/collect/.test(u)],
    ["google_ads", /googleadservices\.com|doubleclick\.net|pagead\/|\/ccm\/conversion|\/pagead\/1p-user-list/.test(u)],
    ["facebook", /facebook\.com|connect\.facebook\.net|fbevents/.test(u)],
    ["clarity", /clarity\.ms/.test(u)],
    ["bing", /bat\.bing\.com|bing\.com/.test(u)],
    ["linkedin", /linkedin\.com|licdn\.com/.test(u)],
    ["hotjar", /hotjar\.com|hotjar\.io/.test(u)],
    ["maze", /maze\.co|maze\./.test(u)],
    ["factors", /factors\.ai|factors\.in|nlium3434ss8usbjq14t6jflqz4jx3bt/.test(u)],
    ["bombora", /ml314\.com|bombora|85250|rategain/.test(u) && /ml314|bombora/.test(u)],
    ["leadfeeder", /leadfeeder|dealfront|lfeeder|lftracker/.test(u)],
    ["pardot", /pardot|pi\.pardot\.com|413792|visitor_id/.test(u)],
    ["storylane", /storylane/.test(u)],
    ["dreamdata", /dreamdata/.test(u)],
    ["onetrust", /cookielaw\.org|onetrust/.test(u)],
    ["gtm", /googletagmanager\.com\/gtm\.js/.test(u)],
  ];
  return checks.filter(([, ok]) => ok).map(([name]) => name);
}

async function setupTab(cdp) {
  const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await cdp.send("Target.attachToTarget", {
    targetId,
    flatten: true,
  });
  await cdp.send("Page.enable", {}, sessionId);
  await cdp.send("Runtime.enable", {}, sessionId);
  await cdp.send("Network.enable", {}, sessionId);
  await cdp.send("Network.setUserAgentOverride", { userAgent: normalUA }, sessionId);
  return sessionId;
}

async function evalExpr(cdp, sessionId, expression) {
  const result = await cdp.send(
    "Runtime.evaluate",
    {
      expression,
      awaitPromise: true,
      returnByValue: true,
      timeout: 15000,
    },
    sessionId,
  );
  if (result.exceptionDetails) return { error: result.exceptionDetails.text };
  return result.result.value;
}

async function navigate(cdp, sessionId, url, waitMs = 9000) {
  await cdp.send("Page.navigate", { url }, sessionId);
  await sleep(waitMs);
}

async function clearState(cdp, sessionId) {
  await cdp.send("Network.clearBrowserCookies", {}, sessionId);
  await cdp.send("Network.clearBrowserCache", {}, sessionId);
  await cdp.send("Storage.clearDataForOrigin", {
    origin: "https://rategain.com",
    storageTypes: "all",
  }, sessionId).catch(() => {});
}

function summarizeRequests(requests) {
  const byVendor = {};
  const samples = {};
  for (const req of requests) {
    const labels = classify(req.url);
    for (const label of labels) {
      byVendor[label] = (byVendor[label] || 0) + 1;
      samples[label] ||= [];
      if (samples[label].length < 5) samples[label].push(req.url);
    }
  }
  return { byVendor, samples };
}

function gcsEvidence(requests) {
  return requests
    .filter((r) => /google-analytics\.com\/g\/collect|googleadservices\.com|doubleclick\.net|\/ccm\/conversion/.test(r.url))
    .slice(0, 100)
    .map((r) => {
      const u = new URL(r.url);
      return {
        host: u.hostname,
        path: u.pathname,
        gcs: u.searchParams.get("gcs"),
        npa: u.searchParams.get("npa"),
        gcd: u.searchParams.get("gcd"),
        url: r.url.slice(0, 240),
      };
    });
}

async function snapshot(cdp, sessionId, label, action) {
  const requests = [];
  const responses = [];
  const handler = (msg) => {
    if (msg.sessionId !== sessionId) return;
    if (msg.method === "Network.requestWillBeSent") {
      requests.push({
        url: msg.params.request.url,
        type: msg.params.type,
      });
    }
    if (msg.method === "Network.responseReceivedExtraInfo") {
      const setCookie = msg.params.headers?.["set-cookie"] || msg.params.headers?.["Set-Cookie"];
      if (setCookie) responses.push({ setCookie });
    }
  };
  cdp.on(handler);
  await action();
  await sleep(5000);
  const cookies = (await cdp.send("Network.getAllCookies", {}, sessionId)).cookies;
  const page = await evalExpr(cdp, sessionId, `({
    url: location.href,
    title: document.title,
    activeGroups: window.OnetrustActiveGroups || null,
    bodyText: document.body ? document.body.innerText.slice(0, 5000) : "",
    cookie: document.cookie
  })`);
  return {
    label,
    page,
    cookies: cookies.map((c) => ({
      name: c.name,
      domain: c.domain,
      expires: c.expires,
      sameSite: c.sameSite,
      secure: c.secure,
    })),
    requestSummary: summarizeRequests(requests),
    gcs: gcsEvidence(requests),
    adAnalyticsCookies: cookies
      .filter((c) => /^(?:_ga|_gid|_gat|_gcl|_fbp|_uet|_cl|_hj|_lfa|visitor_id|pardot|bcookie|lidc|li_sugr|UserMatchHistory|IDE|NID|MUID|fr)/.test(c.name))
      .map((c) => `${c.name}@${c.domain}`),
    requestCount: requests.length,
    responseSetCookieSamples: responses.slice(0, 20),
  };
}

async function main() {
  const version = await json(`${endpoint}/json/version`);
  const cdp = new CDP(version.webSocketDebuggerUrl);
  await cdp.open();
  const sessionId = await setupTab(cdp);

  const results = [];

  await clearState(cdp, sessionId);
  results.push(
    await snapshot(cdp, sessionId, "before_choice", async () => {
      await navigate(cdp, sessionId, "https://rategain.com/");
    }),
  );

  results.push(
    await snapshot(cdp, sessionId, "reject_all", async () => {
      await evalExpr(cdp, sessionId, `window.OneTrust && OneTrust.RejectAll && OneTrust.RejectAll()`);
      await sleep(1500);
      await cdp.send("Page.reload", { ignoreCache: true }, sessionId);
      await sleep(9000);
    }),
  );

  await clearState(cdp, sessionId);
  await navigate(cdp, sessionId, "https://rategain.com/");
  results.push(
    await snapshot(cdp, sessionId, "accept_all", async () => {
      await evalExpr(cdp, sessionId, `window.OneTrust && OneTrust.AllowAll && OneTrust.AllowAll()`);
      await sleep(1500);
      await cdp.send("Page.reload", { ignoreCache: true }, sessionId);
      await sleep(12000);
    }),
  );

  await clearState(cdp, sessionId);
  await navigate(cdp, sessionId, "https://rategain.com/");
  results.push(
    await snapshot(cdp, sessionId, "performance_only", async () => {
      await evalExpr(cdp, sessionId, `window.OneTrust && OneTrust.UpdateConsent && OneTrust.UpdateConsent("Category", "C0002:1,C0003:0,C0004:0,C0005:0")`);
      await sleep(1500);
      await cdp.send("Page.reload", { ignoreCache: true }, sessionId);
      await sleep(10000);
    }),
  );

  for (const url of ["https://rategain.com/cookie-policy/", "https://rategain.com/privacy-policy/"]) {
    results.push(
      await snapshot(cdp, sessionId, url, async () => {
        await navigate(cdp, sessionId, url, 8000);
      }),
    );
  }

  console.log(JSON.stringify(results, null, 2));
}

main().catch((err) => {
  console.error(err.stack || err.message);
  process.exit(1);
});
