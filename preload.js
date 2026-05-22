const { contextBridge, ipcRenderer } = require("electron");

function normalizePoint(point) {
  const x = Number(point?.x);
  const y = Number(point?.y);

  return {
    x: Number.isFinite(x) ? x : 0,
    y: Number.isFinite(y) ? y : 0
  };
}

contextBridge.exposeInMainWorld("petApi", {
  startDrag(offset) {
    ipcRenderer.send("pet:drag-start", normalizePoint(offset));
  },
  endDrag() {
    ipcRenderer.send("pet:drag-end");
  },
  close() {
    ipcRenderer.send("pet:close");
  }
});
