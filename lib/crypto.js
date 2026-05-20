const crypto = require("crypto");
const fs = require("fs");

function generateKeyPair() {
  return crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });
}

function signDocument(filePath, privateKeyPem) {
  const fileData = fs.readFileSync(filePath);
  const signer = crypto.createSign("SHA256");
  signer.update(fileData);
  signer.end();
  return signer.sign(privateKeyPem, "base64");
}

function signBuffer(buffer, privateKeyPem) {
  const signer = crypto.createSign("SHA256");
  signer.update(buffer);
  signer.end();
  return signer.sign(privateKeyPem, "base64");
}

function verifyDocument(filePath, publicKeyPem, signatureBase64) {
  const fileData = fs.readFileSync(filePath);
  return verifyBuffer(fileData, publicKeyPem, signatureBase64);
}

function verifyBuffer(buffer, publicKeyPem, signatureBase64) {
  const checker = crypto.createVerify("SHA256");
  checker.update(buffer);
  checker.end();
  return checker.verify(publicKeyPem, signatureBase64, "base64");
}

function hashFile(filePath) {
  const data = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(data).digest("hex");
}

function hashBuffer(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

module.exports = {
  generateKeyPair,
  signDocument,
  signBuffer,
  verifyDocument,
  verifyBuffer,
  hashFile,
  hashBuffer,
};
