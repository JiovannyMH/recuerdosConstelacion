import crypto from "node:crypto";
import { Storage } from "@google-cloud/storage";

const DEFAULT_MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const DEFAULT_MAX_VIDEO_BYTES = 250 * 1024 * 1024;
const SIGNED_URL_TTL_MS = 15 * 60 * 1000;
const MIME_EXTENSION_MAP = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};

let bucketPromise;

function getConfiguredNumber(name, fallback) {
  const value = Number(process.env[name] || fallback);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function getCredentials() {
  const rawJson = process.env.GCS_SERVICE_ACCOUNT_JSON;

  if (rawJson) {
    const parsed = JSON.parse(rawJson);
    return {
      client_email: parsed.client_email,
      private_key: String(parsed.private_key || "").replace(/\\n/g, "\n"),
    };
  }

  if (process.env.GCS_CLIENT_EMAIL && process.env.GCS_PRIVATE_KEY) {
    return {
      client_email: process.env.GCS_CLIENT_EMAIL,
      private_key: String(process.env.GCS_PRIVATE_KEY).replace(/\\n/g, "\n"),
    };
  }

  throw new Error("Falta configurar GCS_SERVICE_ACCOUNT_JSON en Netlify");
}

async function getBucket() {
  if (!bucketPromise) {
    bucketPromise = Promise.resolve().then(() => {
      const bucketName = String(process.env.GCS_BUCKET_NAME || "").trim();
      const projectId = String(process.env.GCS_PROJECT_ID || "").trim();

      if (!bucketName || !projectId) {
        throw new Error("Faltan GCS_PROJECT_ID o GCS_BUCKET_NAME en Netlify");
      }

      const storage = new Storage({
        projectId,
        credentials: getCredentials(),
      });

      return storage.bucket(bucketName);
    });
  }

  return bucketPromise;
}

function sanitizeBaseName(name) {
  return String(name || "archivo")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64) || "archivo";
}

function getExtension(fileName, contentType) {
  const mappedExtension = MIME_EXTENSION_MAP[contentType];
  if (mappedExtension) {
    return mappedExtension;
  }

  const extension = String(fileName || "").match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase();
  return extension || "bin";
}

export function validateMediaInput({ fileName, contentType, sizeBytes }) {
  const normalizedType = String(contentType || "").toLowerCase();
  const isImage = normalizedType.startsWith("image/");
  const isVideo = normalizedType.startsWith("video/");

  if (!isImage && !isVideo) {
    throw new Error("Solo se permiten imagenes y videos");
  }

  if (!MIME_EXTENSION_MAP[normalizedType]) {
    throw new Error("Formato multimedia no soportado");
  }

  const size = Number(sizeBytes);
  const maxBytes = isImage
    ? getConfiguredNumber("GCS_MAX_IMAGE_BYTES", DEFAULT_MAX_IMAGE_BYTES)
    : getConfiguredNumber("GCS_MAX_VIDEO_BYTES", DEFAULT_MAX_VIDEO_BYTES);

  if (!Number.isFinite(size) || size <= 0) {
    throw new Error("El tamaño del archivo no es valido");
  }

  if (size > maxBytes) {
    const maxMb = Math.round(maxBytes / 1024 / 1024);
    throw new Error(`El archivo supera el limite de ${maxMb} MB`);
  }

  return {
    contentType: normalizedType,
    mediaType: isImage ? "image" : "video",
    objectKey: `memories/${isImage ? "images" : "videos"}/${Date.now()}-${crypto.randomUUID()}-${sanitizeBaseName(fileName)}.${getExtension(fileName, normalizedType)}`,
  };
}

export function isAllowedObjectKey(objectKey) {
  return /^memories\/(images|videos)\/[^/]+$/.test(objectKey) && !objectKey.includes("..");
}

export async function createUploadUrl({ objectKey, contentType }) {
  const bucket = await getBucket();
  const [url] = await bucket.file(objectKey).getSignedUrl({
    version: "v4",
    action: "write",
    expires: Date.now() + SIGNED_URL_TTL_MS,
    contentType,
  });

  return url;
}

export async function createReadUrl(objectKey) {
  const bucket = await getBucket();
  const [url] = await bucket.file(objectKey).getSignedUrl({
    version: "v4",
    action: "read",
    expires: Date.now() + SIGNED_URL_TTL_MS,
  });

  return url;
}

export async function deleteObject(objectKey) {
  const bucket = await getBucket();
  await bucket.file(objectKey).delete({ ignoreNotFound: true });
}
