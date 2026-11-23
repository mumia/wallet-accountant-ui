// Prints Chromium's --ignore-certificate-errors-spki-list value for the
// certificates the cluster's ingress serves for each name in WA_TLS_NAMES,
// after checking that each one chains to the mkcert CA (WA_CA_FILE) and names
// its host. The Playwright image has no certutil to add the CA to Chromium's
// NSS store, so the browser trusts exactly these checked certificates instead.
// The same check as wallet-accountant's stand-in UI test (e2e/tls-pin.js).
//
// WA_INGRESS is host:port of the ingress (the k3d load balancer's 443).
import { createHash, X509Certificate } from "node:crypto";
import { readFileSync } from "node:fs";
import { connect } from "node:tls";

const [host, port] = (process.env["WA_INGRESS"] ?? "").split(":");
const caFile = process.env["WA_CA_FILE"];
const names = (process.env["WA_TLS_NAMES"] ?? "").split(/\s+/).filter(Boolean);
if (!host || !port || !caFile || names.length === 0) {
  console.error("tls-pin: set WA_INGRESS (host:port), WA_CA_FILE and WA_TLS_NAMES");
  process.exit(2);
}
const ca = readFileSync(caFile);

function pin(name: string): Promise<string> {
  return new Promise((resolve, reject) => {
    // `ca` alone, and checkServerIdentity's default: the chain and the name.
    const socket = connect({ host, port: Number(port), servername: name, ca }, () => {
      const certificate = socket.getPeerCertificate();
      socket.end();
      const spki = new X509Certificate(certificate.raw).publicKey.export({
        type: "spki",
        format: "der",
      });
      resolve(createHash("sha256").update(spki).digest("base64"));
    });
    socket.on("error", (error) => {
      reject(new Error(`${name}: ${error.message}`));
    });
  });
}

Promise.all(names.map(pin)).then(
  (pins) => {
    process.stdout.write([...new Set(pins)].join(","));
  },
  (error: unknown) => {
    console.error(`tls-pin: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  },
);
