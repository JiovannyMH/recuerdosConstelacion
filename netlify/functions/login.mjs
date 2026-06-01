import {
  applyRoleOverrides,
  createToken,
  getConfiguredUsers,
  handleOptions,
  jsonResponse,
  parseBody,
  sanitizeUser,
} from "./_lib/auth.mjs";
import { getRoleOverrides } from "./_lib/store.mjs";

export async function handler(event) {
  const optionsResponse = handleOptions(event);
  if (optionsResponse) {
    return optionsResponse;
  }

  if (event.httpMethod !== "POST") {
    return jsonResponse(405, { message: "Metodo no permitido" });
  }

  const body = parseBody(event);
  const username = String(body.username || "").trim();
  const password = String(body.password || "").trim();

  if (!username || !password) {
    return jsonResponse(400, { message: "Usuario y clave son requeridos" });
  }

  const users = getConfiguredUsers();
  const roleOverrides = await getRoleOverrides();
  const usersWithCurrentRoles = applyRoleOverrides(users, roleOverrides);

  const user = usersWithCurrentRoles.find(
    (candidate) => candidate.username === username && candidate.password === password,
  );

  if (!user) {
    return jsonResponse(401, { message: "Credenciales invalidas" });
  }

  const token = createToken({
    username: user.username,
    displayName: user.displayName,
    role: user.role,
  });

  return jsonResponse(200, {
    token,
    user: sanitizeUser(user),
  });
}
