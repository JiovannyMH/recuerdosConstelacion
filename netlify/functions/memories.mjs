import crypto from "node:crypto";
import {
  canEdit,
  getTokenFromEvent,
  handleOptions,
  jsonResponse,
  parseBody,
  verifyToken,
} from "./_lib/auth.mjs";
import {
  getConstellationsData,
  getRoleOverrides,
  saveConstellationsData,
} from "./_lib/store.mjs";
import { applyRoleOverrides, getConfiguredUsers } from "./_lib/auth.mjs";
import { isDefaultConstellationMemory } from "../../shared/constellations.mjs";
import { createReadUrl, deleteObject, isAllowedObjectKey } from "./_lib/gcs.mjs";

function currentUserFromPayload(payload, roleOverrides) {
  const users = applyRoleOverrides(getConfiguredUsers(), roleOverrides);
  return users.find((candidate) => candidate.username === payload.username) || null;
}

function normalizeMemory(memoryInput) {
  const objectKey =
    memoryInput.objectKey && isAllowedObjectKey(String(memoryInput.objectKey))
      ? String(memoryInput.objectKey)
      : "";
  const mediaType = objectKey.startsWith("memories/images/")
    ? "image"
    : objectKey.startsWith("memories/videos/")
      ? "video"
      : null;

  return {
    id: memoryInput.id || crypto.randomUUID(),
    type: mediaType || (["image", "video", "text"].includes(memoryInput.type)
      ? memoryInput.type
      : "text"),
    title: String(memoryInput.title || "Sin titulo"),
    description: String(memoryInput.description || ""),
    url: memoryInput.url ? String(memoryInput.url) : "",
    objectKey,
    x: Number.isFinite(Number(memoryInput.x)) ? Number(memoryInput.x) : 50,
    y: Number.isFinite(Number(memoryInput.y)) ? Number(memoryInput.y) : 50,
  };
}

async function addSignedMediaUrls(data) {
  const constellations = Array.isArray(data?.constellations) ? data.constellations : [];
  const hydratedConstellations = await Promise.all(
    constellations.map(async (constellation) => ({
      ...constellation,
      items: await Promise.all(
        (constellation.items || []).map(async (memory) => {
          if (!memory.objectKey || !isAllowedObjectKey(memory.objectKey)) {
            return memory;
          }

          return {
            ...memory,
            url: await createReadUrl(memory.objectKey),
          };
        }),
      ),
    })),
  );

  return { ...data, constellations: hydratedConstellations };
}

function clampToSkyBounds(value) {
  return Math.max(4, Math.min(96, value));
}

function hasPositionCollision(items, x, y, minDistance = 8) {
  return (items || []).some((item) => {
    const itemX = Number(item?.x);
    const itemY = Number(item?.y);

    if (!Number.isFinite(itemX) || !Number.isFinite(itemY)) {
      return false;
    }

    return Math.hypot(itemX - x, itemY - y) < minDistance;
  });
}

function resolveMemoryPosition(items, memoryInput) {
  const normalized = normalizeMemory(memoryInput);
  const baseX = clampToSkyBounds(normalized.x);
  const baseY = clampToSkyBounds(normalized.y);

  if (!hasPositionCollision(items, baseX, baseY)) {
    return {
      ...normalized,
      x: baseX,
      y: baseY,
    };
  }

  for (let step = 1; step <= 48; step += 1) {
    const angle = (step * 137.507764) * (Math.PI / 180);
    const radius = 2 + Math.floor(step / 6) * 2.1;
    const candidateX = clampToSkyBounds(baseX + Math.cos(angle) * radius);
    const candidateY = clampToSkyBounds(baseY + Math.sin(angle) * radius);

    if (!hasPositionCollision(items, candidateX, candidateY)) {
      return {
        ...normalized,
        x: candidateX,
        y: candidateY,
      };
    }
  }

  return {
    ...normalized,
    x: clampToSkyBounds(baseX + 3.5),
    y: clampToSkyBounds(baseY + 2.4),
  };
}

function normalizeConnections(items, rawConnections) {
  const validIds = new Set(items.map((item) => item.id));

  if (!Array.isArray(rawConnections)) {
    return [];
  }

  return rawConnections
    .filter((pair) => Array.isArray(pair) && pair.length === 2)
    .map((pair) => [String(pair[0]), String(pair[1])])
    .filter(([fromId, toId]) => validIds.has(fromId) && validIds.has(toId) && fromId !== toId);
}

function normalizeConstellation(input) {
  const normalizedItems = Array.isArray(input.items) ? input.items.map(normalizeMemory) : [];

  return {
    id: input.id || crypto.randomUUID(),
    title: String(input.title || "Nueva constelacion"),
    subtitle: String(input.subtitle || ""),
    items: normalizedItems,
    connections: normalizeConnections(normalizedItems, input.connections),
  };
}

export async function handler(event) {
  const optionsResponse = handleOptions(event);
  if (optionsResponse) {
    return optionsResponse;
  }

  if (event.httpMethod === "GET") {
    const payload = verifyToken(getTokenFromEvent(event));
    if (!payload) {
      return jsonResponse(401, { message: "Sesion invalida" });
    }

    const roleOverrides = await getRoleOverrides();
    if (!currentUserFromPayload(payload, roleOverrides)) {
      return jsonResponse(401, { message: "Usuario no encontrado" });
    }

    const data = await getConstellationsData();
    return jsonResponse(200, await addSignedMediaUrls(data));
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
    return jsonResponse(403, { message: "No tienes permiso para editar recuerdos" });
  }

  const body = parseBody(event);
  const action = String(body.action || "");
  const state = await getConstellationsData();
  const currentConstellations = Array.isArray(state.constellations)
    ? state.constellations
    : [];

  if (action === "addConstellation") {
    const nextConstellation = normalizeConstellation(body.constellation || {});
    const nextState = {
      constellations: [...currentConstellations, nextConstellation],
    };

    await saveConstellationsData(nextState);
    return jsonResponse(200, await addSignedMediaUrls(nextState));
  }

  if (action === "addMemory") {
    const constellationId = String(body.constellationId || "");

    const nextState = {
      constellations: currentConstellations.map((constellation) => {
        if (constellation.id !== constellationId) {
          return constellation;
        }

        const resolvedMemory = resolveMemoryPosition(constellation.items || [], body.memory || {});

        return {
          ...constellation,
          items: [...(constellation.items || []), resolvedMemory],
        };
      }),
    };

    await saveConstellationsData(nextState);
    return jsonResponse(200, await addSignedMediaUrls(nextState));
  }

  if (action === "updateMemory") {
    const constellationId = String(body.constellationId || "");
    const memoryId = String(body.memoryId || "");
    const updates = body.updates || {};
    const currentConstellation = currentConstellations.find(
      (constellation) => constellation.id === constellationId,
    );
    const currentMemory = currentConstellation?.items?.find((memory) => memory.id === memoryId);

    if (!currentConstellation || !currentMemory) {
      return jsonResponse(404, { message: "No se encontro la estrella que intentas actualizar" });
    }

    const nextObjectKey =
      updates.objectKey !== undefined ? String(updates.objectKey || "") : currentMemory?.objectKey || "";

    if (currentMemory?.objectKey && currentMemory.objectKey !== nextObjectKey) {
      await deleteObject(currentMemory.objectKey);
    }

    const nextState = {
      constellations: currentConstellations.map((constellation) => {
        if (constellation.id !== constellationId) {
          return constellation;
        }

        return {
          ...constellation,
          items: (constellation.items || []).map((memory) => {
            if (memory.id !== memoryId) {
              return memory;
            }

            return normalizeMemory({ ...memory, ...updates, id: memory.id });
          }),
        };
      }),
    };

    await saveConstellationsData(nextState);
    const persistedState = await getConstellationsData();
    return jsonResponse(200, await addSignedMediaUrls(persistedState));
  }

  if (action === "deleteMemory") {
    const constellationId = String(body.constellationId || "");
    const memoryId = String(body.memoryId || "");

    if (isDefaultConstellationMemory(constellationId, memoryId)) {
      return jsonResponse(400, { message: "No se pueden borrar estrellas base de la constelacion" });
    }

    const memoryToDelete = currentConstellations
      .find((constellation) => constellation.id === constellationId)
      ?.items?.find((memory) => memory.id === memoryId);

    if (memoryToDelete?.objectKey) {
      await deleteObject(memoryToDelete.objectKey);
    }

    const nextState = {
      constellations: currentConstellations.map((constellation) => {
        if (constellation.id !== constellationId) {
          return constellation;
        }

        return {
          ...constellation,
          items: (constellation.items || []).filter((memory) => memory.id !== memoryId),
        };
      }),
    };

    await saveConstellationsData(nextState);
    return jsonResponse(200, await addSignedMediaUrls(nextState));
  }

  return jsonResponse(400, { message: "Accion no soportada" });
}
