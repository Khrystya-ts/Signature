const fs = require("fs");
const {
  generateKeyPair,
  saveKeysToFiles,
  signDocument,
  verifyDocument,
  hashFile,
} = require("./crypto-utils");

const command = process.argv[2];
const docPath = process.argv[3] || "document.txt";

function keys() {
  const pair = generateKeyPair();
  saveKeysToFiles(pair.publicKey, pair.privateKey);
  console.log("Ключі збережено:");
  console.log("  public_key.pem  — для перевірки (можна передавати іншим)");
  console.log("  private_key.pem — для підпису (тримайте в секреті)");
}

function sign() {
  if (!fs.existsSync(docPath)) {
    console.error("Файл не знайдено:", docPath);
    process.exit(1);
  }
  if (!fs.existsSync("private_key.pem")) {
    console.error("Спочатку: npm run keys");
    process.exit(1);
  }

  const privateKey = fs.readFileSync("private_key.pem", "utf8");
  const signature = signDocument(docPath, privateKey);
  fs.writeFileSync("signature.sig", signature);

  console.log("Файл успішно підписаний!");
  console.log("  Документ:", docPath);
  console.log("  Підпис:   signature.sig");
  console.log("  SHA-256: ", hashFile(docPath));
}

function verify() {
  if (!fs.existsSync(docPath)) {
    console.error("Файл не знайдено:", docPath);
    process.exit(1);
  }
  if (!fs.existsSync("public_key.pem")) {
    console.error("Спочатку: npm run keys");
    process.exit(1);
  }
  if (!fs.existsSync("signature.sig")) {
    console.error("Спочатку: npm run sign");
    process.exit(1);
  }

  const publicKey = fs.readFileSync("public_key.pem", "utf8");
  const signature = fs.readFileSync("signature.sig", "utf8").trim();
  const isValid = verifyDocument(docPath, publicKey, signature);

  console.log("Документ:", docPath);
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
  console.log("  node cli.js keys");
  console.log("  node cli.js sign [document.txt]");
  console.log("  node cli.js verify [document.txt]");
  process.exit(1);
}

if (command === "keys") keys();
else if (command === "sign") sign();
else if (command === "verify") verify();
else usage();
