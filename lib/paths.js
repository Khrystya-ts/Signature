const path = require("path");
const fs = require("fs");

const ROOT = path.join(__dirname, "..");
const OUTPUT = path.join(ROOT, "output");
const EXAMPLE_DOC = path.join(ROOT, "examples", "document.txt");

const LEGACY_FILES = ["public_key.pem", "private_key.pem", "signature.sig"];

function keyIdFromInput(input) {
  const raw = String(input || "").trim();
  if (!raw) return keyIdFromInput(path.basename(EXAMPLE_DOC));

  const base = path.basename(raw, path.extname(raw)).replace(/[^\w.-]/g, "_");
  if (!base) return "fileKey";

  if (/[\\/]/.test(raw) || path.extname(raw)) {
    if (/key$/i.test(base)) return base;
    return base + "Key";
  }

  if (/key$/i.test(base)) return base;
  return base + "Key";
}

function pathsForKey(keyId) {
  const id = keyIdFromInput(keyId);
  return {
    keyId: id,
    publicKey: path.join(OUTPUT, id + "_public.pem"),
    privateKey: path.join(OUTPUT, id + "_private.pem"),
    signature: path.join(OUTPUT, id + ".sig"),
  };
}

function listKeyIds() {
  if (!fs.existsSync(OUTPUT)) return [];
  return fs
    .readdirSync(OUTPUT)
    .filter(function (name) {
      return name.endsWith("_private.pem");
    })
    .map(function (name) {
      return name.slice(0, -"_private.pem".length);
    })
    .sort();
}

function removeLegacyFiles() {
  ensureOutputDir();
  LEGACY_FILES.forEach(function (name) {
    const filePath = path.join(OUTPUT, name);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  });
}

function ensureOutputDir() {
  if (!fs.existsSync(OUTPUT)) {
    fs.mkdirSync(OUTPUT);
  }
}

module.exports = {
  ROOT,
  OUTPUT,
  EXAMPLE_DOC,
  keyIdFromInput,
  pathsForKey,
  listKeyIds,
  removeLegacyFiles,
  ensureOutputDir,
};
