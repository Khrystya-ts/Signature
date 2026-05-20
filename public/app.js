(function () {
  var statusEl = document.getElementById("status");
  var lastSignature = "";

  function $(id) {
    return document.getElementById(id);
  }

  async function fetchJson(url, options) {
    var res = await fetch(url, options || {});
    var text = await res.text();
    var data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      if (res.status === 404) {
        throw new Error(
          "Невірний сервер на цьому порту. Зупиніть старий процес і запустіть: npm start"
        );
      }
      throw new Error("Сервер не відповів JSON. Запустіть: npm start");
    }
    if (!res.ok) throw new Error(data.error || data.message || "Помилка");
    return data;
  }

  function show(el, text, kind) {
    if (!el) return;
    el.hidden = false;
    el.textContent = text;
    el.className = "result " + kind;
  }

  function setStatus(text, kind) {
    if (!statusEl) return;
    statusEl.textContent = text;
    statusEl.className = "status" + (kind ? " " + kind : "");
  }

  function setBusy(btn, busy) {
    if (!btn) return;
    btn.disabled = busy;
  }

  async function loadStatus() {
    var s = await fetchJson("/api/status");
    var parts = [];
    if (s.hasPublicKey) parts.push("публічний ключ ✓");
    if (s.hasPrivateKey) parts.push("приватний ключ ✓");
    if (s.hasSignature) parts.push("signature.sig ✓");
    setStatus(
      parts.length ? parts.join(" · ") : "Ключі ще не створені",
      s.hasPublicKey ? "ok" : ""
    );
  }

  $("btnKeys").onclick = async function () {
    setBusy($("btnKeys"), true);
    try {
      var data = await fetchJson("/api/generate-keys", { method: "POST" });
      var box = $("publicKeyBox");
      if (box) {
        box.hidden = false;
        box.textContent = data.publicKey;
      }
      show($("keysResult"), data.message, "ok");
      await loadStatus();
    } catch (e) {
      show($("keysResult"), e.message, "err");
      setStatus(e.message, "err");
    } finally {
      setBusy($("btnKeys"), false);
    }
  };

  $("btnSign").onclick = async function () {
    var file = $("signDoc") && $("signDoc").files[0];
    if (!file) {
      show($("signResult"), "Оберіть файл", "err");
      return;
    }
    var form = new FormData();
    form.append("document", file);
    setBusy($("btnSign"), true);
    try {
      var data = await fetchJson("/api/sign", { method: "POST", body: form });
      lastSignature = data.signature;
      show($("signResult"), data.message + "\nSHA-256: " + data.hash, "ok");
      var dl = $("btnDownloadSig");
      if (dl) dl.hidden = false;
      await loadStatus();
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
      a.download = "signature.sig";
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
    if (sig) form.append("signature", sig);
    setBusy($("btnVerify"), true);
    try {
      var data = await fetchJson("/api/verify", { method: "POST", body: form });
      show(
        $("verifyResult"),
        data.message + "\nSHA-256: " + data.hash,
        data.valid ? "ok" : "err"
      );
    } catch (e) {
      show($("verifyResult"), e.message, "err");
    } finally {
      setBusy($("btnVerify"), false);
    }
  };

  loadStatus().catch(function (e) {
    setStatus(e.message || "Запустіть сервер: npm start", "err");
  });
})();
