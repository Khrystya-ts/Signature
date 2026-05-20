# Система електронного підпису файлу

---

## Структура

```
Signature/
├── cli.js
├── server.js
├── lib/
│   ├── crypto.js
│   └── paths.js
├── public/
├── examples/document.txt
└── output/              ← усі ключі та підписи
```

---

## Встановлення

```bash
cd Signature
npm install
```

---

## CLI

```bash
node cli.js keys document       
node cli.js sign examples/document.txt
node cli.js verify examples/document.txt
```

Другий файл (окремі ключі):

```bash
node cli.js keys report
node cli.js sign examples/report.txt
node cli.js verify examples/report.txt
```

Скорочено через npm (приклад для `document.txt`):

```bash
npm run keys
npm run sign
npm run verify
```

---

## Веб

```bash
npm start
```

1. Введіть ім’я (`documentKey`) або залиште за замовчуванням → «Згенерувати ключі».
2. Завантажте файл — ключі підберуться за ім’ям файлу.
3. Завантажте той самий файл для перевірки.

---

## Захист

1. `npm run keys` → `sign` → `verify` для `document.txt` — дійсний.
2. Змініть символ у файлі → `verify` — недійсний.
3. Покажіть два файли з різними ключами в `output/`.

**Не передають:** `*_private.pem`.

---

## Технології

Node.js 18+ · Express · `crypto`
