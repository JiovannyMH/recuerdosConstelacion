import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import {
  canEdit,
  getTokenFromEvent,
  handleOptions,
  jsonResponse,
  parseBody,
  verifyToken,
} from "./_lib/auth.mjs";
import { applyRoleOverrides, getConfiguredUsers } from "./_lib/auth.mjs";
import { getRoleOverrides } from "./_lib/store.mjs";

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const MIME_EXTENSION_MAP = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
};

function currentUserFromPayload(payload, roleOverrides) {
  const users = applyRoleOverrides(getConfiguredUsers(), roleOverrides);
  return users.find((candidate) => candidate.username === payload.username) || null;
}

function sanitizeBaseName(name) {
  return String(name || "imagen")
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64) || "imagen";
}

function parseDataUrl(input) {
  const raw = String(input || "").trim();
  const match = raw.match(/^data:([^;]+);base64,(.+)$/i);

  if (!match) {
    throw new Error("Formato de imagen invalido");
  }

  const mimeType = String(match[1] || "").toLowerCase();
  const base64Payload = String(match[2] || "");
  const extension = MIME_EXTENSION_MAP[mimeType];

  if (!extension) {
    throw new Error("Formato no soportado. Usa jpg, png, webp, gif o svg");
  }

  const bytes = Buffer.from(base64Payload, "base64");
  if (bytes.length === 0) {
    throw new Error("No se recibio contenido de imagen");
  }

  if (bytes.length > MAX_IMAGE_BYTES) {
    throw new Error("La imagen supera 4 MB luego de procesarse");
  }

  return { bytes, extension };
}

async function appendToManifest(entry) {
  const manifestPath = path.resolve(process.cwd(), "public", "recuerdos", "recuerdos-manifest.json");
  const fallbackManifest = {
    generatedAt: new Date().toISOString(),
    sourceDir: "upload-api",
    destinationDir: "public/recuerdos",
    count: 0,
    memories: [],
  };

  let manifest = fallbackManifest;

  try {
    const raw = await fs.readFile(manifestPath, "utf8");
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.memories)) {
      manifest = parsed;
    }
  } catch {
    manifest = fallbackManifest;
  }

  manifest.generatedAt = new Date().toISOString();
  manifest.memories = [...(manifest.memories || []), entry];
  manifest.count = manifest.memories.length;

  await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

export async function handler(event) {
  const optionsResponse = handleOptions(event);
  if (optionsResponse) {
    return optionsResponse;
  }

  if (event.httpMethod !== "POST") {
    return jsonResponse(405, { message: "Metodo no permitido" });
  }

  const payload = verifyToken(getTokenFromEvent(event));
  if (!payload) {
    return jsonResponse(401, { message: "Sesion invalida" });
  }

  const roleOverrides = await getRoleOverrides();
  const currentUser = currentUserFromPayload(payload, roleOverrides);
  if (!currentUser || !canEdit(currentUser.role)) {
    return jsonResponse(403, { message: "No tienes permiso para subir imagenes" });
  }

  try {
    const body = parseBody(event);
    const originalName = String(body.fileName || "imagen");
    const { bytes, extension } = parseDataUrl(body.dataUrl);
    const baseName = sanitizeBaseName(originalName);
    const uniqueTag = `${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
    const fileName = `${uniqueTag}-${baseName}.${extension}`;
    const publicDir = path.resolve(process.cwd(), "public", "recuerdos");
    const absolutePath = path.join(publicDir, fileName);
    const publicUrl = `/recuerdos/${fileName}`;

    await fs.mkdir(publicDir, { recursive: true });
    await fs.writeFile(absolutePath, bytes);

    await appendToManifest({
      id: `recuerdo-upload-${uniqueTag}`,
      title: originalName,
      fileName,
      publicUrl,
      sizeBytes: bytes.length,
      sourceName: originalName,
    });

    return jsonResponse(200, {
      publicUrl,
      fileName,
      sizeBytes: bytes.length,
    });
  } catch (error) {
    return jsonResponse(400, {
      message: error?.message || "No se pudo guardar la imagen en /recuerdos",
    });
  }
}
