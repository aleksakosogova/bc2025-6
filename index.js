import { Command } from "commander";
import express from "express";
import fs from "fs";
import path from "path";
import multer from "multer";

// --- 1. Налаштування командного рядка ---
const program = new Command();

program
  .requiredOption("--host <host>", "Server host")
  .requiredOption("--port <port>", "Server port")
  .requiredOption("--cache <path>", "Cache directory");

program.parse(process.argv);
const options = program.opts();

// --- 2. Перевірка директорії кешу ---
if (!fs.existsSync(options.cache)) {
  fs.mkdirSync(options.cache, { recursive: true });
  console.log(`📁 Створено директорію кешу: ${options.cache}`);
}

// --- 3. Ініціалізація Express ---
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- 4. Дані (у пам'яті) ---
let inventory = [];
let idCounter = 1;

// --- 5. Налаштування multer для фото ---
const upload = multer({ dest: options.cache });

// --- 6. Реалізація API ---

// 📌 POST /register — реєстрація нової речі
app.post("/register", upload.single("photo"), (req, res) => {
  const { inventory_name, description } = req.body;

  if (!inventory_name) {
    return res.status(400).send("❌ Error: missing inventory name");
  }

  const newItem = {
    id: idCounter++,
    name: inventory_name,
    description: description || "",
    photo: req.file ? req.file.filename : null,
  };

  inventory.push(newItem);
  res.status(201).json({
    message: "✅ Inventory item created successfully",
    item: newItem,
  });
});

// 📌 GET /inventory — отримання списку всіх речей
app.get("/inventory", (req, res) => {
  res.json({
    count: inventory.length,
    items: inventory,
  });
});

// 📌 GET /inventory/:id — отримання конкретної речі
app.get("/inventory/:id", (req, res) => {
  const item = inventory.find((i) => i.id == req.params.id);
  if (!item) {
    return res.status(404).send("❌ Item not found");
  }
  res.json(item);
});

// 📌 PUT /inventory/:id — оновлення назви або опису
app.put("/inventory/:id", (req, res) => {
  const item = inventory.find((i) => i.id == req.params.id);
  if (!item) {
    return res.status(404).send("❌ Item not found");
  }

  const { name, description } = req.body;
  if (name) item.name = name;
  if (description) item.description = description;

  res.json({
    message: "✅ Item updated successfully",
    item,
  });
});

// 📌 DELETE /inventory/:id — видалення речі
app.delete("/inventory/:id", (req, res) => {
  const index = inventory.findIndex((i) => i.id == req.params.id);
  if (index === -1) {
    return res.status(404).send("❌ Item not found");
  }

  inventory.splice(index, 1);
  res.json({ message: "🗑️ Item deleted successfully" });
});

// --- 7. Обробка неправильних методів ---
app.all("*", (req, res) => {
  res.status(405).send
