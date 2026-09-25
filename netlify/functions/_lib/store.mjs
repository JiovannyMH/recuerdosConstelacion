import {
  DEFAULT_CONSTELLATIONS,
  mergeMissingDefaultConstellations,
  mergeMissingDefaultConstellationItems,
} from "../../../shared/constellations.mjs";

const DEFAULT_ROLE_OVERRIDES = {};

function clone(data) {
  return JSON.parse(JSON.stringify(data));
}

async function getBlobStore() {
  try {
    const { getStore } = await import("@netlify/blobs");

    const siteID = String(process.env.NETLIFY_SITE_ID || "").trim();
    const token = String(process.env.NETLIFY_AUTH_TOKEN || "").trim();

    if (siteID && token) {
      return getStore({
        name: "anniversary-memory-app",
        siteID,
        token,
      });
    }

    return getStore("anniversary-memory-app");
  } catch (error) {
    console.error("No se pudo inicializar Netlify Blobs:", error);
    return null;
  }
}

function getRuntimeStore() {
  if (!globalThis.__anniversaryRuntimeStore) {
    globalThis.__anniversaryRuntimeStore = {};
  }

  return globalThis.__anniversaryRuntimeStore;
}

async function readKey(key, fallbackValue) {
  const blobStore = await getBlobStore();

  if (blobStore) {
    try {
      const blobValue = await blobStore.get(key, { type: "json" });
      if (blobValue) {
        return blobValue;
      }
    } catch (error) {
      console.error(`No se pudo leer Netlify Blobs (${key}):`, error);
    }
  }

  const runtimeStore = getRuntimeStore();
  if (!(key in runtimeStore)) {
    runtimeStore[key] = clone(fallbackValue);
  }

  return clone(runtimeStore[key]);
}

async function writeKey(key, value) {
  const blobStore = await getBlobStore();

  if (blobStore) {
    try {
      await blobStore.setJSON(key, value);
      return value;
    } catch (error) {
      console.error(`No se pudo guardar Netlify Blobs (${key}):`, error);
    }
  }

  const runtimeStore = getRuntimeStore();
  runtimeStore[key] = clone(value);

  return value;
}

export async function getConstellationsData() {
  const data = await readKey("constellations", DEFAULT_CONSTELLATIONS);
  const constellations = Array.isArray(data?.constellations) ? data.constellations : [];
  const isLegacySeed =
    constellations.length === 1 &&
    constellations[0]?.id === "constellation-inicio";

  if (!isLegacySeed) {
    const mergedConstellationsResult = mergeMissingDefaultConstellations(data);
    const mergedItemsResult = mergeMissingDefaultConstellationItems(mergedConstellationsResult.merged);
    const hasChanges = mergedConstellationsResult.hasChanges || mergedItemsResult.hasChanges;

    if (!hasChanges) {
      return data;
    }

    await writeKey("constellations", mergedItemsResult.merged);
    return mergedItemsResult.merged;
  }

  await writeKey("constellations", DEFAULT_CONSTELLATIONS);
  return clone(DEFAULT_CONSTELLATIONS);
}

export async function saveConstellationsData(data) {
  return writeKey("constellations", data);
}

export async function getRoleOverrides() {
  return readKey("roleOverrides", DEFAULT_ROLE_OVERRIDES);
}

export async function saveRoleOverrides(overrides) {
  return writeKey("roleOverrides", overrides);
}
