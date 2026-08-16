const fs = require("fs");
const net = require("net");
const { spawn } = require("child_process");
const WebSocket = require("ws");

const chromePath = "C:\\Users\\RohitKumar\\AppData\\Local\\ms-playwright\\chromium-1228\\chrome-win64\\chrome.exe";
const port = 18000 + Math.floor(Math.random() * 1000);
const cases = [
  { route: "/", viewport: "mobile", width: 390, height: 844, mobile: true },
  { route: "/index.html", viewport: "mobile", width: 390, height: 844, mobile: true },
  { route: "/appointment/payment-failed", viewport: "mobile", width: 390, height: 844, mobile: true },
  { route: "/appointment/payment-success", viewport: "mobile", width: 390, height: 844, mobile: true },
  { route: "/", viewport: "tablet", width: 768, height: 1024, mobile: false },
  { route: "/index.html", viewport: "tablet", width: 768, height: 1024, mobile: false },
  { route: "/appointment/payment-failed", viewport: "tablet", width: 768, height: 1024, mobile: false },
  { route: "/appointment/payment-success", viewport: "tablet", width: 768, height: 1024, mobile: false },
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
        if (Date.now() - start > timeout) reject(new Error("Chrome CDP timeout"));
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

    const results = [];
    for (const testCase of cases) {
      await cdp.call("Emulation.setDeviceMetricsOverride", {
        width: testCase.width,
        height: testCase.height,
        deviceScaleFactor: 1,
        mobile: testCase.mobile,
      });
      const startEvents = cdp.events.length;
      await cdp.call("Page.navigate", { url: `http://127.0.0.1:4177${testCase.route}` });
      await wait(2500);
      const evaluated = await cdp.call("Runtime.evaluate", {
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
            return { tag: el.tagName, cls: String(el.className).slice(0, 100), left: Math.round(r.left), right: Math.round(r.right), width: Math.round(r.width) };
          });
          const brokenImages = Array.from(document.images).filter((img) => img.complete && img.naturalWidth === 0).map((img) => img.currentSrc || img.src).slice(0, 10);
          return { overflow: Math.max(doc.scrollWidth, body.scrollWidth) - innerWidth, visibleOver, brokenImages, title: document.title };
        })()`,
      });
      const events = cdp.events.slice(startEvents);
      const exceptions = events.filter((event) => event.method === "Runtime.exceptionThrown").map((event) => event.params?.exceptionDetails?.exception?.description || event.params?.exceptionDetails?.text);
      const consoleErrors = events.filter((event) => event.method === "Runtime.consoleAPICalled" && ["error", "warning"].includes(event.params?.type)).map((event) => (event.params?.args || []).map((arg) => arg.value || arg.description || "").join(" ").slice(0, 300));
      results.push({ route: testCase.route, viewport: testCase.viewport, ...evaluated.result.value, exceptions, consoleErrors });
    }

    fs.writeFileSync("tmp/production-audit/focused-render-check.json", JSON.stringify(results, null, 2));
    console.log(JSON.stringify(results.map((result) => ({
      route: result.route,
      viewport: result.viewport,
      overflow: result.overflow,
      visibleOver: result.visibleOver.length,
      brokenImages: result.brokenImages.length,
      exceptions: result.exceptions.length,
      consoleErrors: result.consoleErrors.length,
    })), null, 2));
    cdp.close();
  } finally {
    chrome.kill();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
