// The pinned copy of the backend's contract (docs/architecture/conventions.md,
// "API client"). src/api/CONTRACT_VERSION names the backend release tag the
// UI needs; src/api/openapi.yaml is the contract at that tag.
//
//   node scripts/contract.ts check          the copy equals the file at the tag
//   node scripts/contract.ts update <ref>   copy the file at <ref> (a tag or a
//                                           commit); a release tag also becomes
//                                           the pinned version
import { readFile, writeFile } from "node:fs/promises";

const repository = "mumia/wallet-accountant";
const versionFile = new URL("../src/api/CONTRACT_VERSION", import.meta.url);
const copyFile = new URL("../src/api/openapi.yaml", import.meta.url);
const releaseTag = /^v\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/;

async function fetchContract(ref: string): Promise<string | undefined> {
  const url = `https://raw.githubusercontent.com/${repository}/${encodeURIComponent(ref)}/api/openapi.yaml`;
  const response = await fetch(url);
  if (response.status === 404) {
    return undefined;
  }
  if (!response.ok) {
    throw new Error(`${url}: HTTP ${String(response.status)}`);
  }
  return response.text();
}

async function check(): Promise<number> {
  const version = (await readFile(versionFile, "utf8")).trim();
  const pinned = await fetchContract(version);
  if (pinned === undefined) {
    // The backend's first release isn't tagged yet; the copy came from a commit.
    console.log(
      `::warning::${repository} has no tag ${version} yet, so src/api/openapi.yaml can't be checked against it.`,
    );
    return 0;
  }
  const copy = await readFile(copyFile, "utf8");
  if (copy !== pinned) {
    console.log(
      `::error::src/api/openapi.yaml differs from ${repository}@${version}. Run 'make contract-update ref=${version}'.`,
    );
    return 1;
  }
  console.log(`src/api/openapi.yaml matches ${repository}@${version}.`);
  return 0;
}

async function update(ref: string | undefined): Promise<number> {
  if (ref === undefined || ref === "") {
    console.error("usage: node scripts/contract.ts update <tag or commit>");
    return 2;
  }
  const contract = await fetchContract(ref);
  if (contract === undefined) {
    console.error(`${repository} has no ${ref}.`);
    return 1;
  }
  await writeFile(copyFile, contract);
  if (releaseTag.test(ref)) {
    await writeFile(versionFile, `${ref}\n`);
  }
  console.log(`Copied the contract at ${ref}. Run 'make generate' and commit both.`);
  return 0;
}

const [command, ref] = process.argv.slice(2);
switch (command) {
  case "check":
    process.exitCode = await check();
    break;
  case "update":
    process.exitCode = await update(ref);
    break;
  default:
    console.error("usage: node scripts/contract.ts check | update <ref>");
    process.exitCode = 2;
}
