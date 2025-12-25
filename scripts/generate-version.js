#!/usr/bin/env node
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const rootPackageJson = require("../package.json");

function getGitCommit() {
    try {
        return execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim();
    } catch {
        return "unknown";
    }
}

const versionInfo = {
    version: rootPackageJson.version,
    commit: getGitCommit(),
    buildTime: new Date().toISOString(),
};

const outputPath = path.join(__dirname, "../apps/api/src/version.json");
fs.writeFileSync(outputPath, JSON.stringify(versionInfo, null, 2) + "\n");

console.log(`Generated version.json: ${JSON.stringify(versionInfo)}`);
