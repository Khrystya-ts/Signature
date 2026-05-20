const fs = require("fs");
const path = require("path");
const paths = require("./lib/paths");
const {
  generateKeyPair,
  signDocument,
  verifyDocument,
  hashFile,
} = require("./lib/crypto");

const command = process.argv[2];
const arg = process.argv[3];

function resolveDocPath() {
  if (arg && (/[\\/]/.test(arg) || path.extname(arg))) {
    return path.resolve(arg);
  }
  return paths.EXAMPLE_DOC;
}

function resolveKeyId() {
  if (command === "keys") {
    return paths.keyIdFromInput(arg || paths.EXAMPLE_DOC);
  }
  return paths.keyIdFromInput(arg || resolveDocPath());
}

function keys() {
  const p = paths.pathsForKey(resolveKeyId());
  paths.ensureOutputDir();
  const pair = generateKeyPair();
  fs.writeFileSync(p.publicKey, pair.publicKey);
  fs.writeFileSync(p.privateKey, pair.privateKey);
  console.log("Ключі для " + p.keyId + ":");
  console.log("  output/" + p.keyId + "_public.pem");
  console.log("  output/" + p.keyId + "_private.pem");
}

function sign() {
  const docPath = resolveDocPath();
  const p = paths.pathsForKey(paths.keyIdFromInput(docPath));

  if (!fs.existsSync(docPath)) {
    console.error("Файл не знайдено:", docPath);
    process.exit(1);
  }
  if (!fs.existsSync(p.privateKey)) {
    console.error("Немає ключів для " + p.keyId + ". Запустіть:");
    console.error("  node cli.js keys " + p.keyId);
    process.exit(1);
  }

  paths.ensureOutputDir();
  const privateKey = fs.readFileSync(p.privateKey, "utf8");
  const signature = signDocument(docPath, privateKey);
  fs.writeFileSync(p.signature, signature);

  console.log("Файл успішно підписаний!");
  console.log("  Документ:", docPath);
  console.log("  Ключі:    " + p.keyId);
  console.log("  Підпис:   output/" + p.keyId + ".sig");
  console.log("  SHA-256: ", hashFile(docPath));
}

function verify() {
  const docPath = resolveDocPath();
  const p = paths.pathsForKey(paths.keyIdFromInput(docPath));

  if (!fs.existsSync(docPath)) {
    console.error("Файл не знайдено:", docPath);
    process.exit(1);
  }
  if (!fs.existsSync(p.publicKey)) {
    console.error("Немає ключів для " + p.keyId);
    process.exit(1);
  }
  if (!fs.existsSync(p.signature)) {
    console.error("Немає підпису output/" + p.keyId + ".sig");
    process.exit(1);
  }

  const publicKey = fs.readFileSync(p.publicKey, "utf8");
  const signature = fs.readFileSync(p.signature, "utf8").trim();
  const isValid = verifyDocument(docPath, publicKey, signature);

  console.log("Документ:", docPath);
  console.log("Ключі:", p.keyId);
  console.log("SHA-256: ", hashFile(docPath));

  if (isValid) {
    console.log("Підпис дійсний. Документ не змінено.");
  } else {
    console.log("Підпис недійсний! Документ змінено або ключ неправильний.");
    process.exit(1);
  }
}

function usage() {
  console.log("Використання:");
  console.log("  node cli.js keys [ім'я|файл]     → documentKey, reportKey…");
  console.log("  node cli.js sign [файл]");
  console.log("  node cli.js verify [файл]");
  console.log("");
  console.log("Приклад для document.txt:");
  console.log("  node cli.js keys document");
  console.log("  node cli.js sign examples/document.txt");
  process.exit(1);
}

if (command === "keys") keys();
else if (command === "sign") sign();
else if (command === "verify") verify();
else usage();
