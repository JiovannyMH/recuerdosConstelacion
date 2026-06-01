import {
  DEFAULT_CONSTELLATIONS,
  mergeMissingDefaultConstellations,
  mergeMissingDefaultConstellationItems,
  isDefaultConstellationMemory,
} from "../../shared/constellations.mjs";

const API_BASE = "/api";
const LOCAL_USERS_KEY = "anniversary_local_users";
const LOCAL_ROLE_OVERRIDES_KEY = "anniversary_local_role_overrides";
const LOCAL_CONSTELLATIONS_KEY = "anniversary_local_constellations";
const LOCAL_TOKEN_PREFIX = "local-anniversary-token.";
const LOCAL_ALLOWED_ROLES = ["viewer", "editor", "admin"];
const LOCAL_TOKEN_DURATION_MS = 12 * 60 * 60 * 1000;
const FORCE_LOCAL_API =
  import.meta.env.VITE_FORCE_LOCAL_API === "true" ||
  (typeof window !== "undefined" && window.location.protocol === "file:");

const DEFAULT_USERS = [
  {
    username: "Jiovanny",
    password: "M3g@JMdev",
    displayName: "Tu",
    role: "admin",
  },
  {
    username: "Ibeth",
    password: "IbeJio2026",
    displayName: "Ibeth",
    role: "viewer",
  },
];

function clone(data) {
  return JSON.parse(JSON.stringify(data));
}

function withAuth(token) {
  if (!token) {
    return { "Content-Type": "application/json" };
  }

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

function parseJsonText(text) {
  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

function shouldUseLocalFallback(response, contentType) {
  if (FORCE_LOCAL_API) {
    return true;
  }

  return response.status === 404 || (contentType && contentType.includes("text/html"));
}

async function request(path, options = {}, localHandler) {
  if (FORCE_LOCAL_API) {
    return localHandler();
  }

  try {
    const response = await fetch(`${API_BASE}${path}`, options);
    const contentType = response.headers.get("content-type") || "";
    const text = await response.text();
    const body = parseJsonText(text);

    if (!response.ok) {
      if (localHandler && shouldUseLocalFallback(response, contentType)) {
        return localHandler();
      }

      throw new Error(body.message || "Error de red");
    }

    if (!contentType.includes("application/json") && localHandler) {
      return localHandler();
    }

    return body;
  } catch (error) {
    if (localHandler) {
      return localHandler();
    }

    throw error;
  }
}

function readStorage(key, fallbackValue) {
  const stored = window.localStorage.getItem(key);
  if (!stored) {
    const nextValue = clone(fallbackValue);
    window.localStorage.setItem(key, JSON.stringify(nextValue));
    return nextValue;
  }

  try {
    return JSON.parse(stored);
  } catch {
    const nextValue = clone(fallbackValue);
    window.localStorage.setItem(key, JSON.stringify(nextValue));
    return nextValue;
  }
}

function writeStorage(key, value) {
  window.localStorage.setItem(key, JSON.stringify(value));
  return value;
}

function parseConfiguredUsers() {
  const rawUsers = import.meta.env.VITE_LOCAL_USERS_JSON;

  if (!rawUsers) {
    return DEFAULT_USERS;
  }

  try {
    const parsedUsers = JSON.parse(rawUsers);
    if (!Array.isArray(parsedUsers) || parsedUsers.length === 0) {
      return DEFAULT_USERS;
    }

    return parsedUsers
      .filter((user) => user && user.username && user.password)
      .map((user) => ({
        username: String(user.username),
        password: String(user.password),
        displayName: String(user.displayName || user.username),
        role: LOCAL_ALLOWED_ROLES.includes(user.role) ? user.role : "viewer",
      }));
  } catch {
    return DEFAULT_USERS;
  }
}

function getLocalUsers() {
  return readStorage(LOCAL_USERS_KEY, parseConfiguredUsers());
}

function getLocalRoleOverrides() {
  return readStorage(LOCAL_ROLE_OVERRIDES_KEY, {});
}

function getUsersWithRoles() {
  const users = getLocalUsers();
  const roleOverrides = getLocalRoleOverrides();

  return users.map((user) => ({
    ...user,
    role: roleOverrides[user.username] || user.role,
  }));
}

function saveLocalRoleOverrides(roleOverrides) {
  return writeStorage(LOCAL_ROLE_OVERRIDES_KEY, roleOverrides);
}

function getLocalConstellations() {
  const data = readStorage(LOCAL_CONSTELLATIONS_KEY, DEFAULT_CONSTELLATIONS);
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

    return saveLocalConstellations(mergedItemsResult.merged);
  }

  return saveLocalConstellations(clone(DEFAULT_CONSTELLATIONS));
}

function saveLocalConstellations(data) {
  return writeStorage(LOCAL_CONSTELLATIONS_KEY, data);
}

function sanitizeUser(user) {
  return {
    username: user.username,
    displayName: user.displayName,
    role: user.role,
  };
}

function createLocalToken(user) {
  const payload = {
    username: user.username,
    exp: Date.now() + LOCAL_TOKEN_DURATION_MS,
  };

  return `${LOCAL_TOKEN_PREFIX}${window.btoa(JSON.stringify(payload))}`;
}

function verifyLocalToken(token) {
  if (!token || !token.startsWith(LOCAL_TOKEN_PREFIX)) {
    return null;
  }

  try {
    const payload = JSON.parse(window.atob(token.slice(LOCAL_TOKEN_PREFIX.length)));
    if (!payload.exp || Date.now() > payload.exp) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

function getCurrentLocalUser(token) {
  const payload = verifyLocalToken(token);
  if (!payload) {
    return null;
  }

  return getUsersWithRoles().find((user) => user.username === payload.username) || null;
}

function ensureEditor(token) {
  const user = getCurrentLocalUser(token);
  if (!user || !["admin", "editor"].includes(user.role)) {
    throw new Error("No tienes permiso para editar recuerdos");
  }

  return user;
}

function ensureAdmin(token) {
  const user = getCurrentLocalUser(token);
  if (!user || user.role !== "admin") {
    throw new Error("No autorizado");
  }

  return user;
}

function normalizeMemory(memoryInput) {
  return {
    id: memoryInput.id || crypto.randomUUID(),
    type: ["image", "video", "text"].includes(memoryInput.type)
      ? memoryInput.type
      : "text",
    title: String(memoryInput.title || "Sin titulo"),
    description: String(memoryInput.description || ""),
    url: memoryInput.url ? String(memoryInput.url) : "",
    x: Number.isFinite(Number(memoryInput.x)) ? Number(memoryInput.x) : 50,
    y: Number.isFinite(Number(memoryInput.y)) ? Number(memoryInput.y) : 50,
  };
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

function resolveMemoryPosition(items, memoryInput, normalizeFn) {
  const normalized = normalizeFn(memoryInput);
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

function normalizeConstellation(input) {
  const normalizedItems = Array.isArray(input.items) ? input.items.map(normalizeMemory) : [];
  const validIds = new Set(normalizedItems.map((item) => item.id));
  const normalizedConnections = Array.isArray(input.connections)
    ? input.connections
        .filter((pair) => Array.isArray(pair) && pair.length === 2)
        .map((pair) => [String(pair[0]), String(pair[1])])
        .filter(
          ([fromId, toId]) => validIds.has(fromId) && validIds.has(toId) && fromId !== toId,
        )
    : [];

  return {
    id: input.id || crypto.randomUUID(),
    title: String(input.title || "Nueva constelacion"),
    subtitle: String(input.subtitle || ""),
    items: normalizedItems,
    connections: normalizedConnections,
  };
}

function randomId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeMemoryWithFallback(memoryInput) {
  return {
    ...normalizeMemory({ ...memoryInput, id: memoryInput.id || randomId() }),
  };
}

function normalizeConstellationWithFallback(input) {
  const normalized = normalizeConstellation({ ...input, id: input.id || randomId() });
  const fallbackItems = Array.isArray(input.items)
    ? input.items.map(normalizeMemoryWithFallback)
    : normalized.items;
  const validIds = new Set(fallbackItems.map((item) => item.id));
  const fallbackConnections = Array.isArray(input.connections)
    ? input.connections
        .filter((pair) => Array.isArray(pair) && pair.length === 2)
        .map((pair) => [String(pair[0]), String(pair[1])])
        .filter(
          ([fromId, toId]) => validIds.has(fromId) && validIds.has(toId) && fromId !== toId,
        )
    : normalized.connections;

  return {
    ...normalized,
    items: fallbackItems,
    connections: fallbackConnections,
  };
}

async function localLogin(username, password) {
  const user = getUsersWithRoles().find(
    (candidate) => candidate.username === username && candidate.password === password,
  );

  if (!user) {
    throw new Error("Credenciales invalidas");
  }

  return {
    token: createLocalToken(user),
    user: sanitizeUser(user),
  };
}

async function localMe(token) {
  const user = getCurrentLocalUser(token);
  if (!user) {
    throw new Error("Sesion invalida");
  }

  return { user: sanitizeUser(user) };
}

async function localGetMemories() {
  return getLocalConstellations();
}

async function localUpdateMemories(token, payload) {
  ensureEditor(token);
  const state = getLocalConstellations();
  const currentConstellations = Array.isArray(state.constellations) ? state.constellations : [];

  if (payload.action === "addConstellation") {
    const nextState = {
      constellations: [
        ...currentConstellations,
        normalizeConstellationWithFallback(payload.constellation || {}),
      ],
    };

    return saveLocalConstellations(nextState);
  }

  if (payload.action === "addMemory") {
    const nextState = {
      constellations: currentConstellations.map((constellation) => {
        if (constellation.id !== payload.constellationId) {
          return constellation;
        }

        const resolvedMemory = resolveMemoryPosition(
          constellation.items || [],
          payload.memory || {},
          normalizeMemoryWithFallback,
        );

        return {
          ...constellation,
          items: [
            ...(constellation.items || []),
            resolvedMemory,
          ],
        };
      }),
    };

    return saveLocalConstellations(nextState);
  }

  if (payload.action === "deleteMemory") {
    if (isDefaultConstellationMemory(payload.constellationId, payload.memoryId)) {
      throw new Error("No se pueden borrar estrellas base de la constelacion");
    }

    const nextState = {
      constellations: currentConstellations.map((constellation) => {
        if (constellation.id !== payload.constellationId) {
          return constellation;
        }

        return {
          ...constellation,
          items: (constellation.items || []).filter((memory) => memory.id !== payload.memoryId),
        };
      }),
    };

    return saveLocalConstellations(nextState);
  }

  if (payload.action === "updateMemory") {
    const nextState = {
      constellations: currentConstellations.map((constellation) => {
        if (constellation.id !== payload.constellationId) {
          return constellation;
        }

        return {
          ...constellation,
          items: (constellation.items || []).map((memory) => {
            if (memory.id !== payload.memoryId) {
              return memory;
            }

            return normalizeMemoryWithFallback({
              ...memory,
              ...(payload.updates || {}),
              id: memory.id,
              x: memory.x,
              y: memory.y,
            });
          }),
        };
      }),
    };

    return saveLocalConstellations(nextState);
  }

  throw new Error("Accion no soportada");
}

async function localGetUsers(token) {
  ensureAdmin(token);
  return {
    users: getUsersWithRoles().map(sanitizeUser),
    availableRoles: LOCAL_ALLOWED_ROLES,
  };
}

async function localUpdateUserRole(token, username, role) {
  ensureAdmin(token);

  if (!username || !LOCAL_ALLOWED_ROLES.includes(role)) {
    throw new Error("Datos de rol invalidos");
  }

  const users = getLocalUsers();
  if (!users.some((user) => user.username === username)) {
    throw new Error("Usuario no encontrado");
  }

  const nextOverrides = {
    ...getLocalRoleOverrides(),
    [username]: role,
  };

  saveLocalRoleOverrides(nextOverrides);

  return {
    users: getUsersWithRoles().map(sanitizeUser),
  };
}

export async function login(username, password) {
  return request(
    "/login",
    {
      method: "POST",
      headers: withAuth(),
      body: JSON.stringify({ username, password }),
    },
    () => localLogin(username, password),
  );
}

export async function me(token) {
  return request(
    "/me",
    {
      method: "GET",
      headers: withAuth(token),
    },
    () => localMe(token),
  );
}

export async function getMemories() {
  return request(
    "/memories",
    {
      method: "GET",
      headers: withAuth(),
    },
    () => localGetMemories(),
  );
}

export async function updateMemories(token, payload) {
  return request(
    "/memories",
    {
      method: "POST",
      headers: withAuth(token),
      body: JSON.stringify(payload),
    },
    () => localUpdateMemories(token, payload),
  );
}

export async function getUsers(token) {
  return request(
    "/users",
    {
      method: "GET",
      headers: withAuth(token),
    },
    () => localGetUsers(token),
  );
}

export async function updateUserRole(token, username, role) {
  return request(
    "/users",
    {
      method: "POST",
      headers: withAuth(token),
      body: JSON.stringify({ action: "updateRole", username, role }),
    },
    () => localUpdateUserRole(token, username, role),
  );
}
