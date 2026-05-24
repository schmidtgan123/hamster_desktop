import { app, BrowserWindow, ipcMain, screen } from "electron";
import path from "path";
import type { BehaviorConfig } from "./behaviorTypes";
import { loadBehaviorConfig } from "./configLoader";

let petWindow: BrowserWindow | undefined;
let dragTimer: NodeJS.Timeout | undefined;
let dragOffset = { x: 0, y: 0 };
let behaviorConfig: BehaviorConfig;

function finiteNumber(value: unknown, fallback = 0): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizePoint(point: unknown): { x: number; y: number } {
  if (!point || typeof point !== "object") {
    return { x: 0, y: 0 };
  }

  const candidate = point as { x?: unknown; y?: unknown };
  return {
    x: finiteNumber(candidate.x),
    y: finiteNumber(candidate.y)
  };
}

function createPetWindow(): void {
  behaviorConfig = loadBehaviorConfig(app.getAppPath(), app.getPath("userData")).config;

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
  petWindow.webContents.on("before-input-event", (_event, input) => {
    if (input.type !== "keyDown") return;
    if (input.meta || input.control || input.alt || input.key === "Escape") return;

    petWindow?.webContents.send("pet:keyboard-input");
  });
  petWindow.loadFile(path.join(__dirname, "..", "src", "index.html"));
}

function stopDrag(): void {
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

ipcMain.handle("pet:get-behavior-config", () => behaviorConfig);

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
