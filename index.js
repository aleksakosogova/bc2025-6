import { Command } from "commander";
import express from "express";
import fs from "fs";
import path from "path";
import multer from "multer";
import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";

// --- 1. CLI ---
const program = new Command();
program
  .requiredOption("--host <host>", "Server host")
  .requiredOption("--port <port>", "Server port")
  .requiredOption("--cache <path>", "Cache directory");
program.parse(process.argv);
const options = program.opts();

// --- 2. Папка кешу ---
if (!fs.existsSync(options.cache)) {
  fs.mkdirSync(options.cache, { recursive: true });
  console.log(`📁 Створено директорію кешу: ${options.cache}`);
}

// --- 3. Express ---
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(".")); 

// --- 4. "БД" ---
let inventory = [];
let idCounter = 1;

// --- 5. Multer ---
const upload = multer({ dest: options.cache });

// --- 6. API ---

// ------------------ REGISTER ------------------
app.post("/register", upload.single("photo"), (req, res) => {
  const { inventory_name, description } = req.body;

  if (!inventory_name) {
    return res.status(400).json({ error: "Missing inventory name" });
  }

  const newItem = {
    id: idCounter++,
    name: inventory_name,
    description: description || "",
    photo: req.file ? req.file.filename : null,
  };

  inventory.push(newItem);

  res.status(201).json({
    message: "Inventory item created successfully",
    item: newItem,
  });
});

// ------------------ GET ALL ------------------
app.get("/inventory", (req, res) => {
  res.json({ count: inventory.length, items: inventory });
});

// ------------------ GET BY ID ------------------
app.get("/inventory/:id", (req, res) => {
  const item = inventory.find((i) => i.id == req.params.id);

  if (!item) {
    return res.status(404).json({ error: "Item not found" });
  }

  res.json({
    ...item,
    photoUrl: item.photo ? `/inventory/${item.id}/photo` : null,
  });
});

// ------------------ UPDATE ------------------
app.put("/inventory/:id", (req, res) => {
  const item = inventory.find((i) => i.id == req.params.id);

  if (!item) {
    return res.status(404).json({ error: "Item not found" });
  }

  const { name, description } = req.body;

  if (name) item.name = name;
  if (description) item.description = description;

  res.json({ message: "Item updated successfully", item });
});

// ------------------ DELETE ------------------
app.delete("/inventory/:id", (req, res) => {
  const index = inventory.findIndex((i) => i.id == req.params.id);

  if (index === -1) {
    return res.status(404).json({ error: "Item not found" });
  }

  const item = inventory[index];

  // видалення фото
  if (item.photo) {
    fs.unlink(path.join(options.cache, item.photo), () => {});
  }

  inventory.splice(index, 1);

  res.json({ message: "Item deleted successfully" });
});

// ------------------ GET PHOTO ------------------
app.get("/inventory/:id/photo", (req, res) => {
  const item = inventory.find((i) => i.id == req.params.id);

  if (!item) {
    return res.status(404).json({ error: "Item not found" });
  }

  if (!item.photo) {
    return res.status(404).json({ error: "Photo not found" });
  }

  const filePath = path.resolve(options.cache, item.photo);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "Photo file missing" });
  }

  res.setHeader("Content-Type", "image/jpeg");
  res.sendFile(filePath);
});

// ------------------ UPDATE PHOTO ------------------
app.put("/inventory/:id/photo", upload.single("photo"), (req, res) => {
  const item = inventory.find((i) => i.id == req.params.id);

  if (!item) {
    return res.status(404).json({ error: "Item not found" });
  }

  if (!req.file) {
    return res.status(400).json({ error: "No photo uploaded" });
  }

  if (item.photo) {
    fs.unlink(path.join(options.cache, item.photo), () => {});
  }

  item.photo = req.file.filename;

  res.json({ message: "Photo updated", item });
});

// ------------------ SEARCH (ВИПРАВЛЕНО) ------------------
app.post("/search", (req, res) => {
  const { id, has_photo } = req.body;
  const item = inventory.find((i) => i.id == id);

  if (!item) {
    return res.status(404).json({ error: "Item not found" });
  }

  const result = {
    ...item,
    photoUrl: item.photo ? `/inventory/${item.id}/photo` : null,
  };

  if ((has_photo === "on" || has_photo === "true" || has_photo === "1") && item.photo) {
    result.description = (result.description || "") + `\nФото: ${result.photoUrl}`;
  }

  res.json(result);
});

// ------------------ SWAGGER ------------------
const specs = swaggerJsdoc({
  definition: {
    openapi: "3.0.0",
    info: { title: "Inventory API", version: "1.0.0" },
  },
  apis: ["./index.js"],
});

app.use("/docs", swaggerUi.serve, swaggerUi.setup(specs));

// ------------------ 405 HANDLER ------------------
app.use((req, res) => {
  res.status(405).json({ error: "Method Not Allowed" });
});

// ------------------ START SERVER ------------------
app.listen(options.port, options.host, () => {
  console.log(`🚀 Server running at http://${options.host}:${options.port}`);
});
