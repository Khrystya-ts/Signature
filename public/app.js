(function () {
  var lastSignature = "";
  var lastKeyId = "documentKey";

  function $(id) {
    return document.getElementById(id);
  }

  function keyIdFromFileName(name) {
    var base = name.replace(/\.[^.]+$/, "").replace(/[^\w.-]/g, "_");
    if (!base) return "fileKey";
    if (/key$/i.test(base)) return base;
    return base + "Key";
  }

  var EMPTY_SHA256 =
    "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

  function getKeyName(fileName) {
    if (fileName) return keyIdFromFileName(fileName);
    var input = $("keyName");
    if (input && input.value.trim()) return input.value.trim();
    return "documentKey";
  }

  function getKeyNameForVerify(docFileName, sigFileName) {
    if (sigFileName) return keyIdFromFileName(sigFileName);
    if (docFileName) return keyIdFromFileName(docFileName);
    var input = $("keyName");
    if (input && input.value.trim()) return input.value.trim();
    return "documentKey";
  }

  async function fetchJson(url, options) {
    var res = await fetch(url, options || {});
    var text = await res.text();
    var data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      throw new Error("Запустіть новий сервер: npm start (потрібен /api/ping)");
    }
    if (!res.ok) throw new Error(data.error || data.message || "Помилка");
    return data;
  }

  async function ensureServer() {
    var ping = await fetch("/api/ping");
    var info = await ping.json();
    if (!info.multiKey) {
      throw new Error(
        "Старий сервер. PowerShell: Get-Process node | Stop-Process ; npm start"
      );
    }
  }

  function show(el, text, kind) {
    if (!el) return;
    el.hidden = false;
    el.textContent = text;
    el.className = "result " + (kind || "");
  }

  function setBusy(btn, busy) {
    if (btn) btn.disabled = busy;
  }

  var keysDoc = $("keysDoc");
  if (keysDoc) {
    keysDoc.onchange = function () {
      var f = keysDoc.files[0];
      if (f) {
        var kid = keyIdFromFileName(f.name);
        var input = $("keyName");
        if (input) input.value = kid;
      }
    };
  }

  var signDoc = $("signDoc");
  if (signDoc) {
    signDoc.onchange = function () {
      var f = signDoc.files[0];
      if (f) {
        var input = $("keyName");
        if (input) input.value = keyIdFromFileName(f.name);
      }
    };
  }

  $("btnKeys").onclick = async function () {
    var keyName = getKeyName();
    setBusy($("btnKeys"), true);
    try {
      await ensureServer();
      var url =
        "/api/generate-keys?keyName=" + encodeURIComponent(keyName);
      var data = await fetchJson(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyName: keyName }),
      });
      lastKeyId = data.keyId;
      var box = $("publicKeyBox");
      if (box) {
        box.hidden = false;
        box.textContent = data.publicKey;
      }
      var list = data.keys && data.keys.length ? data.keys.join(", ") : data.keyId;
      show($("keysResult"), data.message + "\nУ output/: " + list, "ok");
    } catch (e) {
      show($("keysResult"), e.message, "err");
    } finally {
      setBusy($("btnKeys"), false);
    }
  };

  $("btnSign").onclick = async function () {
    var file = signDoc && signDoc.files[0];
    if (!file) {
      show($("signResult"), "Оберіть файл", "err");
      return;
    }
    var keyName = getKeyName(file.name);
    var form = new FormData();
    form.append("document", file);
    form.append("keyName", keyName);
    setBusy($("btnSign"), true);
    try {
      await ensureServer();
      var data = await fetchJson("/api/sign", { method: "POST", body: form });
      lastSignature = data.signature;
      lastKeyId = data.keyId;
      var list = data.keys && data.keys.length ? "\nУ output/: " + data.keys.join(", ") : "";
      show($("signResult"), data.message + list + "\nSHA-256: " + data.hash, "ok");
      var dl = $("btnDownloadSig");
      if (dl) {
        dl.hidden = false;
        dl.textContent = "Завантажити " + data.keyId + ".sig";
      }
    } catch (e) {
      show($("signResult"), e.message, "err");
    } finally {
      setBusy($("btnSign"), false);
    }
  };

  var btnDl = $("btnDownloadSig");
  if (btnDl) {
    btnDl.onclick = function () {
      if (!lastSignature) return;
      var blob = new Blob([lastSignature], { type: "text/plain" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = lastKeyId + ".sig";
      a.click();
      URL.revokeObjectURL(a.href);
    };
  }

  $("btnVerify").onclick = async function () {
    var doc = $("verifyDoc") && $("verifyDoc").files[0];
    if (!doc) {
      show($("verifyResult"), "Оберіть документ", "err");
      return;
    }
    var form = new FormData();
    form.append("document", doc);
    var sig = $("verifySig") && $("verifySig").files[0];
    var keyName = getKeyNameForVerify(doc.name, sig && sig.name);
    form.append("keyName", keyName);
    if (sig) form.append("signature", sig);
    setBusy($("btnVerify"), true);
    try {
      await ensureServer();
      var data = await fetchJson("/api/verify", { method: "POST", body: form });
      var lines = [data.message, "Ключі: " + data.keyId, "SHA-256: " + data.hash];
      if (data.hash === EMPTY_SHA256) {
        lines.push(
          "Увага: файл порожній. Якщо підписували document.txt — завантажте саме його."
        );
      }
      show($("verifyResult"), lines.join("\n"), data.valid ? "ok" : "err");
    } catch (e) {
      show($("verifyResult"), e.message, "err");
    } finally {
      setBusy($("btnVerify"), false);
    }
  };

  ensureServer().catch(function (e) {
    show($("keysResult"), e.message, "err");
  });
})();
