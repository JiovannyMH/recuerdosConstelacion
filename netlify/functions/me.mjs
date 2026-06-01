import {
  applyRoleOverrides,
  getConfiguredUsers,
  getTokenFromEvent,
  handleOptions,
  jsonResponse,
  sanitizeUser,
  verifyToken,
} from "./_lib/auth.mjs";
import { getRoleOverrides } from "./_lib/store.mjs";

export async function handler(event) {
  const optionsResponse = handleOptions(event);
  if (optionsResponse) {
    return optionsResponse;
  }

  if (event.httpMethod !== "GET") {
    return jsonResponse(405, { message: "Metodo no permitido" });
  }

  const token = getTokenFromEvent(event);
  const payload = verifyToken(token);

  if (!payload) {
    return jsonResponse(401, { message: "Sesion invalida" });
  }

  const users = getConfiguredUsers();
  const roleOverrides = await getRoleOverrides();
  const usersWithCurrentRoles = applyRoleOverrides(users, roleOverrides);

  const user = usersWithCurrentRoles.find(
    (candidate) => candidate.username === payload.username,
  );

  if (!user) {
    return jsonResponse(404, { message: "Usuario no encontrado" });
  }

  return jsonResponse(200, {
    user: sanitizeUser(user),
  });
}
