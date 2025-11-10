import { Command } from "commander";
import express from "express";
import fs from "fs";
import path from "path";

const program = new Command();

program
  .requiredOption("-h, --host <host>", "Server host")
  .requiredOption("-p, --port <port>", "Server port")
  .requiredOption("-c, --cache <path>", "Cache directory");

program.parse(process.argv);
const options = program.opts();

if (!fs.existsSync(options.cache)) {
  fs.mkdirSync(options.cache, { recursive: true });
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.listen(options.port, options.host, () => {
  console.log(`✅ Server running at http://${options.host}:${options.port}`);
});
