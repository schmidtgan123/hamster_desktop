const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("petApi", {
  startDrag(offset) {
    ipcRenderer.send("pet:drag-start", offset);
  },
  endDrag() {
    ipcRenderer.send("pet:drag-end");
  },
  close() {
    ipcRenderer.send("pet:close");
  }
});
