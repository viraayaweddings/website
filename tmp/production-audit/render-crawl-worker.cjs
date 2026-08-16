const fs = require("fs");
const net = require("net");
const { spawn } = require("child_process");
const WebSocket = require("ws");

const chunkId = Number(process.argv[2]);
const chunkCount = Number(process.argv[3]);
const allPages = JSON.parse(fs.readFileSync("tmp/production-audit/page-inventory.json", "utf8")).pages;
const pages = allPages.filter((_, index) => index % chunkCount === chunkId);
const chromePath = "C:\\Users\\RohitKumar\\AppData\\Local\\ms-playwright\\chromium-1228\\chrome-win64\\chrome.exe";
const port = 16000 + chunkId;
const viewports = [
  { name: "mobile", width: 390, height: 844, mobile: true },
  { name: "tablet", width: 768, height: 1024, mobile: false },
];

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function waitPort(portNumber, timeout = 10000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    function check() {
      const socket = net.connect(portNumber, "127.0.0.1");
      socket.on("connect", () => {
        socket.destroy();
        resolve();
      });
      socket.on("error", () => {
        if (Date.now() - start > timeout) reject(new Error(`Chrome CDP timeout ${portNumber}`));
        else setTimeout(check, 150);
      });
    }
    check();
  });
}

async function makeCdp(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let id = 0;
  const pending = new Map();
  const events = [];

  await new Promise((resolve, reject) => {
    ws.once("open", resolve);
    ws.once("error", reject);
  });

  ws.on("message", (message) => {
    const data = JSON.parse(message);
    if (data.id && pending.has(data.id)) {
      const callbacks = pending.get(data.id);
      pending.delete(data.id);
      if (data.error) callbacks.reject(new Error(JSON.stringify(data.error)));
      else callbacks.resolve(data.result);
      return;
    }
    if (data.method) events.push(data);
  });

  return {
    events,
    call(method, params = {}) {
      const callId = ++id;
      ws.send(JSON.stringify({ id: callId, method, params }));
      return new Promise((resolve, reject) => pending.set(callId, { resolve, reject }));
    },
    close() {
      ws.close();
    },
  };
}

async function main() {
  const results = [];
  const chrome = spawn(
    chromePath,
    [
      "--headless=new",
      `--remote-debugging-port=${port}`,
      "--disable-gpu",
      "--no-first-run",
      "--no-default-browser-check",
      "about:blank",
    ],
    { stdio: "ignore" },
  );

  try {
    await waitPort(port);
    const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: "PUT" })).json();
    const cdp = await makeCdp(target.webSocketDebuggerUrl);
    await cdp.call("Runtime.enable");
    await cdp.call("Page.enable");
    await cdp.call("Network.enable");
    await cdp.call("Log.enable");

    for (const viewport of viewports) {
      await cdp.call("Emulation.setDeviceMetricsOverride", {
        width: viewport.width,
        height: viewport.height,
        deviceScaleFactor: 1,
        mobile: viewport.mobile,
      });

      for (const route of pages) {
        const startEvents = cdp.events.length;
        const started = Date.now();
        let navError = null;

        try {
          await cdp.call("Page.navigate", { url: `http://127.0.0.1:4177${route}` });
        } catch (error) {
          navError = String(error.message || error);
        }

        await wait(1500);

        const evalResult = await cdp.call("Runtime.evaluate", {
          returnByValue: true,
          expression: `(() => {
            const doc = document.documentElement;
            const body = document.body;
            const visibleOver = Array.from(document.querySelectorAll('*')).filter((el) => {
              const cs = getComputedStyle(el);
              if (cs.display === 'none' || cs.visibility === 'hidden' || cs.position === 'fixed' || el.closest('.slick-list')) return false;
              const r = el.getBoundingClientRect();
              return r.width > 1 && r.height > 1 && (r.left < -2 || r.right > innerWidth + 2);
            }).slice(0, 5).map((el) => {
              const r = el.getBoundingClientRect();
              return {
                tag: el.tagName,
                id: el.id,
                cls: String(el.className).slice(0, 100),
                left: Math.round(r.left),
                right: Math.round(r.right),
                width: Math.round(r.width)
              };
            });
            const brokenImages = Array.from(document.images)
              .filter((img) => img.complete && img.naturalWidth === 0)
              .map((img) => img.currentSrc || img.src)
              .slice(0, 10);
            return {
              title: document.title,
              statusText: document.body ? 'loaded' : 'no-body',
              viewport: { width: innerWidth, height: innerHeight },
              scrollWidth: doc.scrollWidth,
              bodyScrollWidth: body.scrollWidth,
              overflow: Math.max(doc.scrollWidth, body.scrollWidth) - innerWidth,
              visibleOver,
              brokenImages,
              imageCount: document.images.length,
              bodyTextLength: (document.body?.innerText || '').length
            };
          })()`,
        }).catch((error) => ({ result: { value: { evalError: String(error.message || error) } } }));

        const events = cdp.events.slice(startEvents);
        const consoleIssues = events
          .filter((event) => event.method === "Runtime.consoleAPICalled" && ["error", "warning"].includes(event.params?.type))
          .slice(0, 10)
          .map((event) => ({
            type: event.params.type,
            text: (event.params.args || []).map((arg) => arg.value || arg.description || "").join(" ").slice(0, 300),
          }));
        const exceptions = events
          .filter((event) => event.method === "Runtime.exceptionThrown")
          .slice(0, 10)
          .map((event) => ({
            text: event.params?.exceptionDetails?.text,
            description: event.params?.exceptionDetails?.exception?.description?.slice(0, 300),
          }));
        const failedRequests = events
          .filter((event) => event.method === "Network.loadingFailed")
          .slice(0, 10)
          .map((event) => ({
            requestId: event.params?.requestId,
            errorText: event.params?.errorText,
            canceled: event.params?.canceled,
          }));

        results.push({
          route,
          viewport: viewport.name,
          navError,
          loadMs: Date.now() - started,
          ...evalResult.result.value,
          consoleIssues,
          exceptions,
          failedRequests,
        });
      }
    }

    fs.writeFileSync(`tmp/production-audit/render-audit-chunk-${chunkId}.json`, JSON.stringify(results, null, 2));
    console.log(JSON.stringify({
      chunkId,
      pages: pages.length,
      results: results.length,
      overflows: results.filter((result) => result.overflow > 0).length,
      brokenImages: results.filter((result) => result.brokenImages?.length).length,
      exceptions: results.filter((result) => result.exceptions?.length).length,
      navErrors: results.filter((result) => result.navError).length,
    }));
    cdp.close();
  } finally {
    chrome.kill();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
