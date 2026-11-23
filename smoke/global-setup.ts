// Before the test: forwards 127.0.0.1:<WA_UI_BASE_URL's port> to the
// cluster's ingress (WA_INGRESS) for as long as it runs. Chromium resolves
// every *.localhost to 127.0.0.1 itself, so the browser keeps the real origins
// (https://wallet.localhost:18443, https://auth.localhost:18443).
import { connect, createServer, type Socket } from "node:net";

export default async function globalSetup(): Promise<() => Promise<void>> {
  const [host, port] = (process.env["WA_INGRESS"] ?? "").split(":");
  const base = process.env["WA_UI_BASE_URL"];
  if (!host || !port || !base) {
    throw new Error("global-setup: set WA_INGRESS (host:port) and WA_UI_BASE_URL");
  }
  const listenPort = Number(new URL(base).port || 443);

  const sockets = new Set<Socket>();
  const server = createServer((client) => {
    const upstream = connect(Number(port), host);
    for (const socket of [client, upstream]) {
      sockets.add(socket);
      socket.on("close", () => sockets.delete(socket));
    }
    client.pipe(upstream).pipe(client);
    client.on("error", () => upstream.destroy());
    upstream.on("error", () => client.destroy());
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(listenPort, "127.0.0.1", resolve);
  });

  return () =>
    new Promise<void>((resolve) => {
      server.close(() => {
        resolve();
      });
      for (const socket of sockets) {
        socket.destroy();
      }
    });
}
