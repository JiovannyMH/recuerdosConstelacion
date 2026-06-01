import crypto from "node:crypto";

const ROLE_VIEWER = "viewer";
const ROLE_EDITOR = "editor";
const ROLE_ADMIN = "admin";

const ALLOWED_ROLES = [ROLE_VIEWER, ROLE_EDITOR, ROLE_ADMIN];

const DEFAULT_USERS = [
  {
    username: "tu_usuario",
    password: "cambia-esta-clave",
    displayName: "Tu",
    role: ROLE_ADMIN,
  },
  {
    username: "Ibeth",
    password: "IbeJio2026",
    displayName: "Ibeth",
    role: ROLE_VIEWER,
  },
];

function base64UrlEncode(text) {
  return Buffer.from(text)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecode(text) {
  const base64 = text.replace(/-/g, "+").replace(/_/g, "/");
  const padLength = (4 - (base64.length % 4)) % 4;
  return Buffer.from(base64 + "=".repeat(padLength), "base64").toString("utf8");
}

function getSecret() {
  return process.env.APP_JWT_SECRET || "dev-secret-change-this";
}

export function withCorsHeaders(extraHeaders = {}) {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Content-Type": "application/json",
    ...extraHeaders,
  };
}

export function handleOptions(event) {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: withCorsHeaders(),
      body: JSON.stringify({ ok: true }),
    };
  }

  return null;
}

export function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: withCorsHeaders(),
    body: JSON.stringify(body),
  };
}

export function parseBody(event) {
  if (!event.body) {
    return {};
  }

  try {
    return JSON.parse(event.body);
  } catch {
    return {};
  }
}

export function getConfiguredUsers() {
  const envConfig = process.env.APP_USERS_JSON;

  if (!envConfig) {
    return DEFAULT_USERS;
  }

  try {
    const users = JSON.parse(envConfig);

    if (!Array.isArray(users) || users.length === 0) {
      return DEFAULT_USERS;
    }

    return users
      .filter((user) => user && user.username && user.password)
      .map((user) => ({
        username: String(user.username),
        password: String(user.password),
        displayName: String(user.displayName || user.username),
        role: ALLOWED_ROLES.includes(user.role) ? user.role : ROLE_VIEWER,
      }));
  } catch {
    return DEFAULT_USERS;
  }
}

export function applyRoleOverrides(users, roleOverrides) {
  return users.map((user) => ({
    ...user,
    role: roleOverrides[user.username] || user.role,
  }));
}

export function createToken(payload) {
  const configuredDays = Number(process.env.APP_TOKEN_DAYS || 0.5);
  const expiresInDays = Number.isFinite(configuredDays) && configuredDays > 0 ? configuredDays : 0.5;
  const data = {
    ...payload,
    exp: Date.now() + expiresInDays * 24 * 60 * 60 * 1000,
  };

  const payloadText = JSON.stringify(data);
  const payloadPart = base64UrlEncode(payloadText);
  const signature = crypto
    .createHmac("sha256", getSecret())
    .update(payloadPart)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  return `${payloadPart}.${signature}`;
}

export function verifyToken(token) {
  if (!token || !token.includes(".")) {
    return null;
  }

  const [payloadPart, signaturePart] = token.split(".");
  const expected = crypto
    .createHmac("sha256", getSecret())
    .update(payloadPart)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  if (signaturePart !== expected) {
    return null;
  }

  try {
    const parsed = JSON.parse(base64UrlDecode(payloadPart));
    if (!parsed.exp || Date.now() > parsed.exp) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function getTokenFromEvent(event) {
  const authHeader =
    event.headers?.authorization ||
    event.headers?.Authorization ||
    event.headers?.AUTHORIZATION;

  if (!authHeader) {
    return null;
  }

  if (authHeader.startsWith("Bearer ")) {
    return authHeader.replace("Bearer ", "").trim();
  }

  return authHeader.trim();
}

export function canEdit(role) {
  return role === ROLE_ADMIN || role === ROLE_EDITOR;
}

export function isAdmin(role) {
  return role === ROLE_ADMIN;
}

export function sanitizeUser(user) {
  return {
    username: user.username,
    displayName: user.displayName,
    role: user.role,
  };
}

export { ALLOWED_ROLES, ROLE_ADMIN, ROLE_EDITOR, ROLE_VIEWER };
