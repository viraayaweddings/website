import { spawn } from "node:child_process";
import { writeFile } from "node:fs/promises";

const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const htmlUrl = "file:///C:/Users/RohitKumar/Downloads/viraayaweddings.com/output/pdf/RateGain_Complete_Cookie_Register_2026-08-16.html";
const outPath = "C:\\Users\\RohitKumar\\Downloads\\viraayaweddings.com\\output\\pdf\\RateGain_Complete_Cookie_Register_2026-08-16.pdf";
const port = 9333;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response.json();
}

class CDP {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 1;
    this.pending = new Map();
  }
  async open() {
    await new Promise((resolve, reject) => {
      this.ws.addEventListener("open", resolve, { once: true });
      this.ws.addEventListener("error", reject, { once: true });
    });
    this.ws.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (!message.id || !this.pending.has(message.id)) return;
      const { resolve, reject } = this.pending.get(message.id);
      this.pending.delete(message.id);
      message.error ? reject(new Error(JSON.stringify(message.error))) : resolve(message.result);
    });
  }
  send(method, params = {}) {
    const id = this.id++;
    this.ws.send(JSON.stringify({ id, method, params }));
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
}

async function main() {
  const chrome = spawn(chromePath, [
    "--headless=new",
    "--disable-gpu",
    `--remote-debugging-port=${port}`,
    "--user-data-dir=C:\\Users\\RohitKumar\\Downloads\\viraayaweddings.com\\tmp\\chrome-print-profile",
    "about:blank",
  ], { stdio: "ignore" });

  try {
    let version;
    for (let i = 0; i < 40; i++) {
      try {
        version = await getJson(`http://127.0.0.1:${port}/json/version`);
        break;
      } catch {
        await sleep(250);
      }
    }
    if (!version) throw new Error("Chrome DevTools endpoint did not start");

    const cdp = new CDP(version.webSocketDebuggerUrl);
    await cdp.open();
    const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" });
    const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });

    const send = (method, params = {}) => cdp.send(method, params, sessionId);
    // Flattened sessions are not needed for Page.printToPDF; use a target WebSocket instead.
    const targets = await getJson(`http://127.0.0.1:${port}/json/list`);
    const target = targets.find((t) => t.id === targetId);
    const page = new CDP(target.webSocketDebuggerUrl);
    await page.open();
    await page.send("Page.enable");
    await page.send("Page.navigate", { url: htmlUrl });
    await sleep(1500);
    const pdf = await page.send("Page.printToPDF", {
      landscape: true,
      displayHeaderFooter: false,
      printBackground: true,
      preferCSSPageSize: true,
      marginTop: 0.35,
      marginBottom: 0.35,
      marginLeft: 0.35,
      marginRight: 0.35,
    });
    await writeFile(outPath, Buffer.from(pdf.data, "base64"));
    console.log(outPath);
  } finally {
    chrome.kill();
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
