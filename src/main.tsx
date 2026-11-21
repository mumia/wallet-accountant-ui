import { boot } from "./app/boot";

const root = document.getElementById("root");
if (root === null) {
  throw new Error("index.html has no #root element");
}

await boot(root);
