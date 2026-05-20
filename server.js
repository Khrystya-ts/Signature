require("dotenv").config();

const path = require("path");
const express = require("express");
const multer = require("multer");
const fs = require("fs");
const paths = require("./lib/paths");
const {
  generateKeyPair,
  signBuffer,
  verifyBuffer,
  hashBuffer,
} = require("./lib/crypto");

const app = express();
const PREFERRED_PORT = Number(process.env.PORT) || 3000;
const MAX_PORT_TRIES = 20;
const upload = multer({ storage: multer.memoryStorage() });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(paths.ROOT, "public")));

function resolveKeyName(req, fileName) {
  const raw =
    (req.body && req.body.keyName) ||
    req.query.keyName ||
    fileName ||
    paths.EXAMPLE_DOC;
  return paths.keyIdFromInput(raw);
}

app.get("/api/ping", function (req, res) {
  res.json({ ok: true, version: 2, multiKey: true });
});

app.get("/api/status", function (req, res) {
  const keyId = resolveKeyName(req, null);
  const p = paths.pathsForKey(keyId);

  res.json({
    keyId: p.keyId,
    keys: paths.listKeyIds(),
    hasPublicKey: fs.existsSync(p.publicKey),
    hasPrivateKey: fs.existsSync(p.privateKey),
    hasSignature: fs.existsSync(p.signature),
    hasDocument: fs.existsSync(paths.EXAMPLE_DOC),
  });
});

app.post("/api/generate-keys", function (req, res) {
  const keyId = resolveKeyName(req, null);
  const p = paths.pathsForKey(keyId);
  const existed = fs.existsSync(p.privateKey);

  paths.removeLegacyFiles();
  paths.ensureOutputDir();

  const keys = generateKeyPair();
  fs.writeFileSync(p.publicKey, keys.publicKey);
  fs.writeFileSync(p.privateKey, keys.privateKey);

  const allKeys = paths.listKeyIds();
  res.json({
    ok: true,
    keyId: p.keyId,
    created: !existed,
    keys: allKeys,
    files: {
      publicKey: p.publicKey,
      privateKey: p.privateKey,
    },
    message: existed
      ? "Оновлено " + p.keyId + ". Наборів: " + allKeys.length
      : "Створено " + p.keyId + ". Наборів: " + allKeys.length,
    publicKey: keys.publicKey,
  });
});

app.post("/api/sign", upload.single("document"), function (req, res) {
  if (!req.file) {
    return res.status(400).json({ error: "Завантажте документ" });
  }

  const keyId = resolveKeyName(req, req.file.originalname);
  const p = paths.pathsForKey(keyId);

  if (!fs.existsSync(p.privateKey)) {
    return res.status(400).json({
      error: "Немає ключів для " + p.keyId + ". Згенеруйте: " + p.keyId,
    });
  }

  paths.removeLegacyFiles();
  paths.ensureOutputDir();
  const privateKey = fs.readFileSync(p.privateKey, "utf8");
  const signature = signBuffer(req.file.buffer, privateKey);
  fs.writeFileSync(p.signature, signature);

  res.json({
    ok: true,
    keyId: p.keyId,
    keys: paths.listKeyIds(),
    message: "output/" + p.keyId + ".sig",
    signature: signature,
    hash: hashBuffer(req.file.buffer),
    fileName: req.file.originalname,
  });
});

app.post("/api/verify", upload.fields([
  { name: "document", maxCount: 1 },
  { name: "signature", maxCount: 1 },
]), function (req, res) {
  if (!req.files?.document?.[0]) {
    return res.status(400).json({ error: "Завантажте документ" });
  }

  const docFile = req.files.document[0];
  const keyId = resolveKeyName(req, docFile.originalname);
  const p = paths.pathsForKey(keyId);

  if (!fs.existsSync(p.publicKey)) {
    return res.status(400).json({ error: "Немає ключів для " + p.keyId });
  }

  let sigText = String(req.body.signatureText || "").trim();
  if (req.files.signature?.[0]) {
    sigText = req.files.signature[0].buffer.toString("utf8").trim();
  }
  if (!sigText && fs.existsSync(p.signature)) {
    sigText = fs.readFileSync(p.signature, "utf8").trim();
  }
  if (!sigText) {
    return res.status(400).json({ error: "Немає " + p.keyId + ".sig" });
  }

  const valid = verifyBuffer(docFile.buffer, fs.readFileSync(p.publicKey, "utf8"), sigText);

  res.json({
    valid: valid,
    keyId: p.keyId,
    hash: hashBuffer(docFile.buffer),
    message: valid
      ? "Підпис дійсний (" + p.keyId + ")"
      : "Підпис недійсний (" + p.keyId + ")",
  });
});

paths.removeLegacyFiles();

function startServer(port, attempt) {
  const server = app.listen(port, function () {
    const actual = server.address().port;
    console.log("http://localhost:" + actual);
    console.log("output:", paths.OUTPUT);
    console.log("Перевірка: GET /api/ping → version 2");
  });

  server.on("error", function (err) {
    if (err.code === "EADDRINUSE" && attempt < MAX_PORT_TRIES) {
      startServer(port + 1, attempt + 1);
      return;
    }
    console.error(err.code === "EADDRINUSE" ? "Порт зайнятий" : err.message);
    process.exit(1);
  });
}

startServer(PREFERRED_PORT, 0);
