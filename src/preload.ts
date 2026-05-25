import { contextBridge, ipcRenderer } from "electron";
import type { BehaviorConfig } from "./behaviorTypes";

function normalizePoint(point: unknown): { x: number; y: number } {
  const candidate = point as { x?: unknown; y?: unknown } | undefined;
  const x = Number(candidate?.x);
  const y = Number(candidate?.y);

  return {
    x: Number.isFinite(x) ? x : 0,
    y: Number.isFinite(y) ? y : 0
  };
}

contextBridge.exposeInMainWorld("petApi", {
  getBehaviorConfig(): Promise<BehaviorConfig> {
    return ipcRenderer.invoke("pet:get-behavior-config") as Promise<BehaviorConfig>;
  },
  onKeyboardInput(callback: () => void): () => void {
    const listener = () => callback();
    ipcRenderer.on("pet:keyboard-input", listener);

    return () => {
      ipcRenderer.removeListener("pet:keyboard-input", listener);
    };
  },
  startDrag(offset: unknown): void {
    ipcRenderer.send("pet:drag-start", normalizePoint(offset));
  },
  endDrag(): void {
    ipcRenderer.send("pet:drag-end");
  },
  close(): void {
    ipcRenderer.send("pet:close");
  }
});
