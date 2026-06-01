import crypto from "node:crypto";
import {
  ALLOWED_ROLES,
  applyRoleOverrides,
  getConfiguredUsers,
  getTokenFromEvent,
  handleOptions,
  isAdmin,
  jsonResponse,
  parseBody,
  sanitizeUser,
  verifyToken,
} from "./_lib/auth.mjs";
import { getRoleOverrides, saveRoleOverrides } from "./_lib/store.mjs";

function findCurrentUser(users, payload) {
  return users.find((candidate) => candidate.username === payload.username);
}

export async function handler(event) {
  const optionsResponse = handleOptions(event);
  if (optionsResponse) {
    return optionsResponse;
  }

  const token = getTokenFromEvent(event);
  const payload = verifyToken(token);

  if (!payload) {
    return jsonResponse(401, { message: "Sesion invalida" });
  }

  const roleOverrides = await getRoleOverrides();
  const users = applyRoleOverrides(getConfiguredUsers(), roleOverrides);
  const currentUser = findCurrentUser(users, payload);

  if (!currentUser || !isAdmin(currentUser.role)) {
    return jsonResponse(403, { message: "No autorizado" });
  }

  if (event.httpMethod === "GET") {
    return jsonResponse(200, {
      users: users.map(sanitizeUser),
      availableRoles: ALLOWED_ROLES,
    });
  }

  if (event.httpMethod !== "POST") {
    return jsonResponse(405, { message: "Metodo no permitido" });
  }

  const body = parseBody(event);

  if (body.action === "updateRole") {
    const username = String(body.username || "").trim();
    const role = String(body.role || "").trim();

    if (!username || !ALLOWED_ROLES.includes(role)) {
      return jsonResponse(400, { message: "Datos de rol invalidos" });
    }

    const userExists = users.some((candidate) => candidate.username === username);

    if (!userExists) {
      return jsonResponse(404, { message: "Usuario no encontrado" });
    }

    const nextOverrides = {
      ...roleOverrides,
      [username]: role,
    };

    await saveRoleOverrides(nextOverrides);
    const refreshedUsers = applyRoleOverrides(getConfiguredUsers(), nextOverrides);

    return jsonResponse(200, {
      message: "Rol actualizado",
      users: refreshedUsers.map(sanitizeUser),
    });
  }

  if (body.action === "createUser") {
    return jsonResponse(400, {
      message:
        "La creacion de usuario en runtime no esta habilitada. Agrega el usuario en APP_USERS_JSON y vuelve a desplegar.",
      hintId: crypto.randomUUID(),
    });
  }

  return jsonResponse(400, { message: "Accion no soportada" });
}
