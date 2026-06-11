/* MerrinLab Patch Bus v0.1
   Shared browser control bus for standalone MerrinLab instruments.
   Uses BroadcastChannel when available, with local CustomEvent fallback.
*/
(function () {
  const CHANNEL = "merrinlab-patch-bus";

  class MerrinLabPatchBus {
    constructor(moduleId) {
      this.moduleId = moduleId;
      this.listeners = new Set();
      this.enabled = true;
      this.channel = null;

      if ("BroadcastChannel" in window) {
        this.channel = new BroadcastChannel(CHANNEL);
        this.channel.onmessage = (event) => this.receive(event.data);
      }

      window.addEventListener(CHANNEL, (event) => this.receive(event.detail));
    }

    setEnabled(value) {
      this.enabled = Boolean(value);
    }

    send(type, payload = {}) {
      if (!this.enabled) return;
      const message = {
        protocol: "merrinlab.patch.v0.1",
        source: this.moduleId,
        type,
        time: performance.now(),
        payload,
      };
      if (this.channel) this.channel.postMessage(message);
      window.dispatchEvent(new CustomEvent(CHANNEL, { detail: message }));
    }

    on(listener) {
      this.listeners.add(listener);
      return () => this.listeners.delete(listener);
    }

    receive(message) {
      if (!this.enabled || !message || message.source === this.moduleId) return;
      if (message.protocol !== "merrinlab.patch.v0.1") return;
      for (const listener of this.listeners) listener(message);
    }
  }

  window.MerrinLabPatchBus = MerrinLabPatchBus;
})();
