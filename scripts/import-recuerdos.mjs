import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"]);

function slugifyFileBase(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "recuerdo";
}

async function ensureDirectory(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function listImageFiles(sourceDir) {
  const entries = await fs.readdir(sourceDir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (!entry.isFile()) {
      continue;
    }

    const fullPath = path.join(sourceDir, entry.name);
    const extension = path.extname(entry.name).toLowerCase();

    if (!ALLOWED_EXTENSIONS.has(extension)) {
      continue;
    }

    const stat = await fs.stat(fullPath);
    files.push({
      fullPath,
      name: entry.name,
      extension,
      sizeBytes: stat.size,
      mtimeMs: stat.mtimeMs,
    });
  }

  files.sort((a, b) => a.mtimeMs - b.mtimeMs);
  return files;
}

async function copyWithUniqueName(sourceFile, destinationDir, index) {
  const baseName = path.basename(sourceFile.name, sourceFile.extension);
  const safeBase = `${String(index + 1).padStart(3, "0")}-${slugifyFileBase(baseName)}`;

  let candidateName = `${safeBase}${sourceFile.extension}`;
  let attempt = 1;

  while (true) {
    const candidatePath = path.join(destinationDir, candidateName);

    try {
      await fs.access(candidatePath);
      candidateName = `${safeBase}-${attempt}${sourceFile.extension}`;
      attempt += 1;
    } catch {
      await fs.copyFile(sourceFile.fullPath, candidatePath);
      return candidateName;
    }
  }
}

async function main() {
  const projectRoot = process.cwd();
  const sourceDir = process.env.SOURCE_DIR || path.join(os.homedir(), "Downloads");
  const destinationDir = path.join(projectRoot, "public", "recuerdos");
  const manifestPath = path.join(destinationDir, "recuerdos-manifest.json");

  await ensureDirectory(destinationDir);

  const sourceFiles = await listImageFiles(sourceDir);

  if (sourceFiles.length === 0) {
    console.log("No se encontraron imagenes en Descargas para importar.");
    return;
  }

  const copiedEntries = [];

  for (let i = 0; i < sourceFiles.length; i += 1) {
    const sourceFile = sourceFiles[i];
    const copiedName = await copyWithUniqueName(sourceFile, destinationDir, i);

    copiedEntries.push({
      id: `recuerdo-${String(i + 1).padStart(3, "0")}`,
      title: path.basename(sourceFile.name, sourceFile.extension),
      fileName: copiedName,
      publicUrl: `/recuerdos/${copiedName}`,
      sizeBytes: sourceFile.sizeBytes,
      sourceName: sourceFile.name,
    });
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    sourceDir,
    destinationDir: "public/recuerdos",
    count: copiedEntries.length,
    memories: copiedEntries,
  };

  await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  console.log(`Importacion completada. Copiadas ${copiedEntries.length} imagenes.`);
  console.log(`Manifest creado: public/recuerdos/recuerdos-manifest.json`);
}

main().catch((error) => {
  console.error("Error al importar recuerdos:");
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
