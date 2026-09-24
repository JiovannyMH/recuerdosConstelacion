import {
  canEdit,
  getConfiguredUsers,
  getTokenFromEvent,
  handleOptions,
  jsonResponse,
  parseBody,
  verifyToken,
  applyRoleOverrides,
} from "./_lib/auth.mjs";
import { getRoleOverrides } from "./_lib/store.mjs";
import {
  createReadUrl,
  createUploadUrl,
  deleteObject,
  isAllowedObjectKey,
  validateMediaInput,
} from "./_lib/gcs.mjs";

function getCurrentUser(payload, roleOverrides) {
  return applyRoleOverrides(getConfiguredUsers(), roleOverrides).find(
    (candidate) => candidate.username === payload.username,
  );
}

function requireSession(event) {
  const payload = verifyToken(getTokenFromEvent(event));
  if (!payload) {
    throw new Error("Sesion invalida");
  }

  return payload;
}

export async function handler(event) {
  const optionsResponse = handleOptions(event);
  if (optionsResponse) {
    return optionsResponse;
  }

  try {
    const payload = requireSession(event);
    const roleOverrides = await getRoleOverrides();
    const currentUser = getCurrentUser(payload, roleOverrides);

    if (!currentUser) {
      return jsonResponse(401, { message: "Usuario no encontrado" });
    }

    if (event.httpMethod === "POST") {
      if (!canEdit(currentUser.role)) {
        return jsonResponse(403, { message: "No tienes permiso para subir archivos" });
      }

      const body = parseBody(event);
      const media = validateMediaInput({
        fileName: body.fileName,
        contentType: body.contentType,
        sizeBytes: body.sizeBytes,
      });
      const uploadUrl = await createUploadUrl(media);

      return jsonResponse(200, {
        uploadUrl,
        objectKey: media.objectKey,
        contentType: media.contentType,
        mediaType: media.mediaType,
      });
    }

    if (event.httpMethod === "GET") {
      const objectKey = String(event.queryStringParameters?.objectKey || "");
      if (!isAllowedObjectKey(objectKey)) {
        return jsonResponse(400, { message: "Referencia de archivo invalida" });
      }

      const readUrl = await createReadUrl(objectKey);
      return jsonResponse(200, { readUrl, objectKey });
    }

    if (event.httpMethod === "DELETE") {
      if (!canEdit(currentUser.role)) {
        return jsonResponse(403, { message: "No tienes permiso para eliminar archivos" });
      }

      const body = parseBody(event);
      const objectKey = String(body.objectKey || "");
      if (!isAllowedObjectKey(objectKey)) {
        return jsonResponse(400, { message: "Referencia de archivo invalida" });
      }

      await deleteObject(objectKey);
      return jsonResponse(200, { objectKey });
    }

    return jsonResponse(405, { message: "Metodo no permitido" });
  } catch (error) {
    const statusCode = error?.message === "Sesion invalida" ? 401 : 400;
    return jsonResponse(statusCode, {
      message: error?.message || "No se pudo completar la operacion multimedia",
    });
  }
}
