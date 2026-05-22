const { app, BrowserWindow, ipcMain, screen } = require("electron");
const path = require("path");

let petWindow;
let dragTimer;
let dragOffset = { x: 0, y: 0 };

function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizePoint(point) {
  if (!point || typeof point !== "object") {
    return { x: 0, y: 0 };
  }

  return {
    x: finiteNumber(point.x),
    y: finiteNumber(point.y)
  };
}

function createPetWindow() {
  const display = screen.getPrimaryDisplay();
  const { width, height } = display.workAreaSize;

  petWindow = new BrowserWindow({
    width: 260,
    height: 260,
    x: Math.max(40, width - 340),
    y: Math.max(40, height - 340),
    frame: false,
    transparent: true,
    resizable: false,
    hasShadow: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    fullscreenable: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js")
    }
  });

  petWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  petWindow.setAlwaysOnTop(true, "floating");
  petWindow.loadFile(path.join(__dirname, "src", "index.html"));
}

function stopDrag() {
  if (dragTimer) {
    clearInterval(dragTimer);
    dragTimer = undefined;
  }
}

app.whenReady().then(createPetWindow);

app.on("window-all-closed", () => {
  stopDrag();
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createPetWindow();
});

ipcMain.on("pet:drag-start", (_event, offset) => {
  dragOffset = normalizePoint(offset);
  stopDrag();

  dragTimer = setInterval(() => {
    if (!petWindow || petWindow.isDestroyed()) return;

    const cursor = normalizePoint(screen.getCursorScreenPoint());
    const nextX = Math.round(cursor.x - dragOffset.x);
    const nextY = Math.round(cursor.y - dragOffset.y);

    if (!Number.isFinite(nextX) || !Number.isFinite(nextY)) return;

    try {
      petWindow.setPosition(nextX, nextY, false);
    } catch (error) {
      console.warn("Unable to move pet window during drag:", error);
      stopDrag();
    }
  }, 16);
});

ipcMain.on("pet:drag-end", stopDrag);

ipcMain.on("pet:close", () => {
  stopDrag();
  app.quit();
});
