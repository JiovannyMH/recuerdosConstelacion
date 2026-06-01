import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

function usage() {
  console.log("Uso: npm run sync:recuerdos -- [ruta-al-json-exportado]");
  console.log("Si no pasas ruta, busca el export mas reciente en Descargas.");
}

async function resolveInputFile() {
  const argPath = process.argv[2];

  if (argPath && ["-h", "--help"].includes(argPath)) {
    usage();
    process.exit(0);
  }

  if (argPath) {
    return path.resolve(process.cwd(), argPath);
  }

  const downloadsDir = path.join(os.homedir(), "Downloads");
  const entries = await fs.readdir(downloadsDir, { withFileTypes: true });
  const candidates = entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => /^recuerdos-export-.*\.json$/i.test(name));

  if (candidates.length === 0) {
    throw new Error("No se encontro un recuerdos-export-*.json en Descargas");
  }

  const withStat = await Promise.all(
    candidates.map(async (name) => {
      const fullPath = path.join(downloadsDir, name);
      const stat = await fs.stat(fullPath);
      return { fullPath, mtimeMs: stat.mtimeMs };
    }),
  );

  withStat.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return withStat[0].fullPath;
}

function normalizeConstellationsPayload(payload) {
  const raw = Array.isArray(payload?.constellations) ? payload.constellations : [];

  if (raw.length === 0) {
    throw new Error("El JSON no trae constellations[]");
  }

  return {
    constellations: raw,
  };
}

function toModuleText(data) {
  return `export const USER_CONSTELLATIONS = ${JSON.stringify(data, null, 2)};\n`;
}

async function main() {
  const projectRoot = process.cwd();
  const inputFile = await resolveInputFile();
  const outputFile = path.join(projectRoot, "shared", "user-constellations.mjs");

  const content = await fs.readFile(inputFile, "utf8");
  const parsed = JSON.parse(content);
  const normalized = normalizeConstellationsPayload(parsed);

  await fs.writeFile(outputFile, toModuleText(normalized), "utf8");

  console.log(`Sincronizacion completada.`);
  console.log(`Origen: ${inputFile}`);
  console.log(`Destino: shared/user-constellations.mjs`);
  console.log(`Constelaciones sincronizadas: ${normalized.constellations.length}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
