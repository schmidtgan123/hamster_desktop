const fs = require("node:fs");
const path = require("node:path");
const { app, BrowserWindow } = require("electron");

const outputPath = process.argv[2] || "build/icon.png";
const emoji = process.argv[3] || "\u{1F439}";
const size = 1024;

async function renderIcon() {
  const window = new BrowserWindow({
    width: size,
    height: size,
    show: false,
    transparent: true,
    webPreferences: {
      backgroundThrottling: false
    }
  });

  const html = [
    "<!doctype html>",
    '<meta charset="utf-8">',
    '<body style="margin:0;overflow:hidden;background:transparent">',
    `<canvas id="icon" width="${size}" height="${size}"></canvas>`,
    "</body>"
  ].join("");

  await window.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

  const dataUrl = await window.webContents.executeJavaScript(`
    (() => {
      const canvas = document.getElementById("icon");
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, ${size}, ${size});
      ctx.shadowColor = "rgba(0, 0, 0, 0.16)";
      ctx.shadowBlur = 22;
      ctx.shadowOffsetY = 16;
      ctx.font = '790px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(${JSON.stringify(emoji)}, ${size / 2}, ${size / 2 + 24});
      return canvas.toDataURL("image/png");
    })()
  `);

  const base64Data = dataUrl.replace(/^data:image\/png;base64,/, "");
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, Buffer.from(base64Data, "base64"));
  window.close();
}

app.whenReady()
  .then(renderIcon)
  .then(() => app.quit())
  .catch((error) => {
    console.error(error);
    app.exit(1);
  });
