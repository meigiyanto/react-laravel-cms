import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const advisoryUrl = "https://github.com/advisories/GHSA-fc5q-39xc-vjpf";
const advisoryName = "GHSA-fc5q-39xc-vjpf";
const audit = spawnSync("npm", ["audit", "--json"], { encoding: "utf8" });

let report;
try {
  report = JSON.parse(audit.stdout);
} catch {
  process.stderr.write(audit.stderr || "");
  process.stderr.write(audit.stdout || "");
  console.error("Unable to parse npm audit JSON; failing closed.");
  process.exit(1);
}

const lock = JSON.parse(readFileSync("package-lock.json", "utf8"));
const vulnerabilities = report.vulnerabilities || {};
const names = Object.keys(vulnerabilities);

function isOnlyKnownAdvisory(name, stack = []) {
  if (stack.includes(name)) return false;
  const vulnerability = vulnerabilities[name];
  if (!vulnerability || !Array.isArray(vulnerability.via) || vulnerability.via.length === 0) return false;

  return vulnerability.via.every((item) => {
    if (typeof item === "string") return isOnlyKnownAdvisory(item, [...stack, name]);
    return item?.name === "picomatch" && item?.url === advisoryUrl;
  });
}

const unapproved = [];
for (const name of names) {
  const vulnerability = vulnerabilities[name];
  const nodes = Array.isArray(vulnerability.nodes) ? vulnerability.nodes : [];
  const devOnly = nodes.length > 0 && nodes.every((node) => lock.packages?.[node]?.dev === true);

  if (!devOnly || !isOnlyKnownAdvisory(name)) {
    unapproved.push({ name, severity: vulnerability.severity, nodes, via: vulnerability.via });
  }
}

if (unapproved.length > 0) {
  console.error("npm audit found vulnerabilities outside the temporary picomatch development-tooling exception:");
  console.error(JSON.stringify(unapproved, null, 2));
  process.exit(1);
}

if (names.length > 0) {
  console.warn(
    `Accepted temporary development-only exception: ${names.length} affected package paths resolve exclusively to ${advisoryName}. Review again by 2026-12-01 or earlier when upstream publishes a fixed release.`
  );
} else {
  console.log("npm audit passed with no vulnerabilities.");
}

if (audit.status !== 0 && names.length === 0) {
  console.error("npm audit exited unsuccessfully without a parsed vulnerability; failing closed.");
  process.exit(audit.status || 1);
}
