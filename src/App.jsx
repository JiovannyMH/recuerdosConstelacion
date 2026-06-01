import { Fragment, useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import "./App.css";
import {
  getMemories,
  getUsers,
  login,
  me,
  updateMemories,
  updateUserRole,
} from "./services/api";

const TOKEN_KEY = "anniversary_token";
const SESSION_START_MODE_KEY = "anniversary_session_start_mode";
const LAST_VIEW_POSITION_KEY = "anniversary_last_view_position";
const START_YEAR = 2025;
const START_MONTH = 7;
const START_DAY = 8;
const FLOWERS_YEAR = 2026;
const FLOWERS_MONTH = 2;
const FLOWERS_DAY = 14;
const SKIP_MONTHS_START_YEAR = 2025;
const SKIP_MONTHS_START_MONTH = 8;
const SKIP_MONTHS_END_YEAR = 2026;
const SKIP_MONTHS_END_MONTH = 1;
const MODAL_IMAGE_ZOOM_DEFAULT = 2.1;
const MODAL_IMAGE_ZOOM_MIN = 1;
const MODAL_IMAGE_ZOOM_MAX = 4;
const MAX_UPLOAD_VIDEO_BYTES = 8 * 1024 * 1024;
const MAX_UPLOAD_IMAGE_INPUT_BYTES = 20 * 1024 * 1024;
const TARGET_IMAGE_DATA_URL_BYTES = 950 * 1024;
const MAX_IMAGE_DIMENSION = 1600;
const PROJECT_MEMORIES_IMAGE_PREFIX = "/recuerdos/";
const MONTH_NAMES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const DEMO_DROP_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 180 220'%3E%3Cdefs%3E%3ClinearGradient id='bg' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0' stop-color='%23ffd3e1'/%3E%3Cstop offset='1' stop-color='%2384c3ff'/%3E%3C/linearGradient%3E%3CradialGradient id='shine' cx='0.32' cy='0.25' r='0.7'%3E%3Cstop offset='0' stop-color='%23fff9ff' stop-opacity='0.92'/%3E%3Cstop offset='1' stop-color='%23fff9ff' stop-opacity='0'/%3E%3C/radialGradient%3E%3C/defs%3E%3Crect width='180' height='220' fill='url(%23bg)'/%3E%3Ccircle cx='128' cy='58' r='38' fill='url(%23shine)'/%3E%3Cpath d='M32 168c14-36 40-58 58-58s44 22 58 58' fill='none' stroke='%23ffffff' stroke-opacity='0.62' stroke-width='11' stroke-linecap='round'/%3E%3Ccircle cx='70' cy='86' r='7' fill='%23ffffff' fill-opacity='0.95'/%3E%3Ccircle cx='112' cy='102' r='6' fill='%23ffffff' fill-opacity='0.88'/%3E%3Ccircle cx='90' cy='130' r='5' fill='%23ffffff' fill-opacity='0.84'/%3E%3C/svg%3E";

function getEmbedUrl(url) {
  if (!url) {
    return "";
  }

  if (url.includes("youtube.com/watch?v=")) {
    return url.replace("watch?v=", "embed/");
  }

  if (url.includes("youtu.be/")) {
    return `https://www.youtube.com/embed/${url.split("youtu.be/")[1]}`;
  }

  if (url.includes("vimeo.com/")) {
    return `https://player.vimeo.com/video/${url.split("vimeo.com/")[1]}`;
  }

  return "";
}

function normalizeProjectImagePath(rawPath) {
  const value = String(rawPath || "").trim();

  if (!value) {
    return "";
  }

  // Files in public/recuerdos are served from /recuerdos/... in Vite/Netlify.
  if (value.startsWith(PROJECT_MEMORIES_IMAGE_PREFIX)) {
    return value;
  }

  if (value.startsWith("recuerdos/")) {
    return `/${value}`;
  }

  if (value.startsWith("./recuerdos/")) {
    return `/${value.slice(2)}`;
  }

  if (value.startsWith("/public/recuerdos/")) {
    return value.replace("/public", "");
  }

  if (value.startsWith("public/recuerdos/")) {
    return `/${value.replace(/^public\//, "")}`;
  }

  return `${PROJECT_MEMORIES_IMAGE_PREFIX}${value.replace(/^\/+/, "")}`;
}

function isExternalMediaUrl(url) {
  return /^https?:\/\//i.test(String(url || "").trim());
}

function isDataMediaUrl(url) {
  return /^data:/i.test(String(url || "").trim());
}

function hasSupportedImageExtension(pathValue) {
  return /\.(png|jpg|jpeg|webp|gif|svg)(\?.*)?$/i.test(String(pathValue || "").trim());
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(new Error("No se pudo leer el archivo seleccionado"));
    reader.readAsDataURL(file);
  });
}

function dataUrlSizeInBytes(dataUrl) {
  const base64 = typeof dataUrl === "string" ? dataUrl.split(",")[1] || "" : "";
  return Math.ceil((base64.length * 3) / 4);
}

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("No se pudo procesar la imagen"));
    };

    image.src = objectUrl;
  });
}

async function compressImageAsDataUrl(file) {
  const sourceImage = await loadImageFromFile(file);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { alpha: false });

  if (!context) {
    throw new Error("No se pudo inicializar la compresion de imagen");
  }

  const initialScale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(sourceImage.width, sourceImage.height));
  let width = Math.max(1, Math.round(sourceImage.width * initialScale));
  let height = Math.max(1, Math.round(sourceImage.height * initialScale));
  let quality = 0.86;
  let bestDataUrl = "";

  for (let attempt = 0; attempt < 9; attempt += 1) {
    canvas.width = width;
    canvas.height = height;
    context.clearRect(0, 0, width, height);
    context.drawImage(sourceImage, 0, 0, width, height);

    const dataUrl = canvas.toDataURL("image/jpeg", quality);
    const dataSize = dataUrlSizeInBytes(dataUrl);

    if (!bestDataUrl || dataSize < dataUrlSizeInBytes(bestDataUrl)) {
      bestDataUrl = dataUrl;
    }

    if (dataSize <= TARGET_IMAGE_DATA_URL_BYTES) {
      return dataUrl;
    }

    if (quality > 0.56) {
      quality -= 0.08;
    } else {
      width = Math.max(720, Math.round(width * 0.86));
      height = Math.max(720, Math.round(height * 0.86));
    }
  }

  return bestDataUrl;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function buildDisplayItemMap(items) {
  const sourceItems = Array.isArray(items) ? items : [];
  const groups = new Map();

  sourceItems.forEach((item) => {
    const x = Number.isFinite(Number(item?.x)) ? Number(item.x) : 50;
    const y = Number.isFinite(Number(item?.y)) ? Number(item.y) : 50;
    const key = `${x.toFixed(2)}:${y.toFixed(2)}`;

    if (!groups.has(key)) {
      groups.set(key, []);
    }

    groups.get(key).push({ ...item, x, y });
  });

  const result = {};

  groups.forEach((groupItems) => {
    if (groupItems.length === 1) {
      const single = groupItems[0];
      result[single.id] = single;
      return;
    }

    const anchor = groupItems[0];
    result[anchor.id] = anchor;

    const spreadCount = groupItems.length - 1;
    groupItems.slice(1).forEach((item, index) => {
      const angle = ((index + 1) / spreadCount) * Math.PI * 2;
      const radius = 3.2 + Math.floor(index / 6) * 1.2;

      result[item.id] = {
        ...item,
        x: clamp(anchor.x + Math.cos(angle) * radius, 4, 96),
        y: clamp(anchor.y + Math.sin(angle) * radius, 4, 96),
      };
    });
  });

  return result;
}

function hasOrbitingImage(memory) {
  if (!memory) {
    return false;
  }

  const type = String(memory.type || "").trim().toLowerCase();
  const url = String(memory.url || "").trim();

  if (!url) {
    return false;
  }

  if (type === "image") {
    return true;
  }

  // Compatibility for imported/synced data where type may not be normalized.
  return /^data:image\//i.test(url) || /\.(png|jpe?g|webp|gif|svg)(\?.*)?$/i.test(url);
}

function canRenderImageMemory(memory) {
  if (!memory) {
    return false;
  }

  const type = String(memory.type || "").trim().toLowerCase();
  const url = String(memory.url || "").trim();

  if (!url) {
    return false;
  }

  if (type === "image") {
    return true;
  }

  return /^data:image\//i.test(url) || /\.(png|jpe?g|webp|gif|svg)(\?.*)?$/i.test(url);
}

function normalizeTimelineConstellations(list) {
  const source = Array.isArray(list) ? list : [];
  const monthlyConstellations = source.filter(
    (constellation) => Number.isInteger(constellation.month) && constellation.month >= 1 && constellation.month <= 12,
  );

  if (monthlyConstellations.length >= 12) {
    const monthMap = new Map();
    monthlyConstellations.forEach((constellation) => {
      if (!monthMap.has(constellation.month)) {
        monthMap.set(constellation.month, constellation);
      }
    });

    if (monthMap.size === 12) {
      return Array.from(monthMap.entries())
        .sort((left, right) => left[0] - right[0])
        .map((entry) => entry[1]);
    }
  }

  return source;
}

function getUserScopedKey(baseKey, username) {
  return `${baseKey}:${username}`;
}

function getStoredSessionStartMode(username) {
  if (!username) {
    return "inicio";
  }

  const value = localStorage.getItem(getUserScopedKey(SESSION_START_MODE_KEY, username));
  return value === "ultimo" ? "ultimo" : "inicio";
}

function setStoredSessionStartMode(username, mode) {
  if (!username) {
    return;
  }

  localStorage.setItem(getUserScopedKey(SESSION_START_MODE_KEY, username), mode === "ultimo" ? "ultimo" : "inicio");
}

function getStoredLastViewPosition(username) {
  if (!username) {
    return null;
  }

  const raw = localStorage.getItem(getUserScopedKey(LAST_VIEW_POSITION_KEY, username));
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Number.isFinite(parsed?.timelineYear) || !Number.isFinite(parsed?.currentIndex)) {
      return null;
    }

    return {
      timelineYear: Math.max(START_YEAR, Math.floor(parsed.timelineYear)),
      currentIndex: Math.max(0, Math.floor(parsed.currentIndex)),
    };
  } catch {
    return null;
  }
}

function setStoredLastViewPosition(username, position) {
  if (!username || !position) {
    return;
  }

  localStorage.setItem(
    getUserScopedKey(LAST_VIEW_POSITION_KEY, username),
    JSON.stringify({
      timelineYear: Math.max(START_YEAR, Math.floor(position.timelineYear || START_YEAR)),
      currentIndex: Math.max(0, Math.floor(position.currentIndex || 0)),
    }),
  );
}

function clampModalImageOffset(offset, scale, rect) {
  const maxX = ((scale - 1) * rect.width) / 2;
  const maxY = ((scale - 1) * rect.height) / 2;

  return {
    x: clamp(offset.x, -maxX, maxX),
    y: clamp(offset.y, -maxY, maxY),
  };
}

function isSkippedTimelineMonth(year, month) {
  return (
    (year === SKIP_MONTHS_START_YEAR && month >= SKIP_MONTHS_START_MONTH) ||
    (year === SKIP_MONTHS_END_YEAR && month <= SKIP_MONTHS_END_MONTH)
  );
}

function getAdjacentTimelinePoint(year, month, direction) {
  const step = direction >= 0 ? 1 : -1;
  let nextYear = year;
  let nextMonth = month;

  do {
    nextMonth += step;

    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear += 1;
    } else if (nextMonth < 1) {
      nextMonth = 12;
      nextYear -= 1;
    }
  } while (isSkippedTimelineMonth(nextYear, nextMonth));

  return { year: nextYear, month: nextMonth };
}

function App() {
  const [token, setToken] = useState(localStorage.getItem(TOKEN_KEY) || "");
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [availableRoles, setAvailableRoles] = useState(["viewer", "editor", "admin"]);
  const [constellations, setConstellations] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(START_MONTH - 1);
  const [selectedMemory, setSelectedMemory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [viewOnlyMode, setViewOnlyMode] = useState(false);
  const [memoryFileInputKey, setMemoryFileInputKey] = useState(0);
  const [zoomTarget, setZoomTarget] = useState(null);
  const [shootingStar, setShootingStar] = useState(null);
  const [starFieldSize, setStarFieldSize] = useState({ width: 1000, height: 620 });
  const [timelineYear, setTimelineYear] = useState(START_YEAR);
  const [isSkyFullscreen, setIsSkyFullscreen] = useState(false);
  const [isStarPickerOpen, setIsStarPickerOpen] = useState(false);
  const [hoveredStarId, setHoveredStarId] = useState("");
  const [sessionStartMode, setSessionStartMode] = useState("inicio");
  const [isModalImageZoomed, setIsModalImageZoomed] = useState(false);
  const [modalImageOffset, setModalImageOffset] = useState({ x: 0, y: 0 });
  const [isModalImageDragging, setIsModalImageDragging] = useState(false);
  const [modalImageZoomScale, setModalImageZoomScale] = useState(MODAL_IMAGE_ZOOM_DEFAULT);
  const zoomOpenTimeoutRef = useRef(null);
  const zoomResetTimeoutRef = useRef(null);
  const skyPanelRef = useRef(null);
  const starFieldRef = useRef(null);
  const starPickerRef = useRef(null);
  const modalImageDragRef = useRef({
    dragging: false,
    moved: false,
    pointerId: null,
    lastX: 0,
    lastY: 0,
  });

  const [credentials, setCredentials] = useState({ username: "", password: "" });

  const [newConstellation, setNewConstellation] = useState({ title: "", subtitle: "" });
  const [newMemory, setNewMemory] = useState({
    constellationId: "",
    targetMemoryId: "",
    type: "image",
    title: "",
    description: "",
    url: "",
    x: 50,
    y: 50,
  });

  const displayConstellations = useMemo(() => normalizeTimelineConstellations(constellations), [constellations]);

  const normalizedIndex =
    displayConstellations.length === 0
      ? 0
      : Math.min(currentIndex, displayConstellations.length - 1);
  const currentConstellation = displayConstellations[normalizedIndex] || null;
  const canEdit = !viewOnlyMode && ["admin", "editor"].includes(user?.role);
  const canManageUsers = !viewOnlyMode && user?.role === "admin";
  const startIndex = Math.max(0, Math.min(START_MONTH - 1, Math.max(displayConstellations.length - 1, 0)));
  const canGoPrevious = !(timelineYear === START_YEAR && normalizedIndex <= startIndex);

  const progressText = !displayConstellations.length
    ? "0 / 0"
    : `${
        Number.isInteger(currentConstellation?.month) && currentConstellation.month >= 1
          ? MONTH_NAMES[currentConstellation.month - 1]
          : `${normalizedIndex + 1}`
      } · Año ${timelineYear} (${normalizedIndex + 1}/${displayConstellations.length})`;

  const isFirstFlowersMoment =
    timelineYear === FLOWERS_YEAR && Number(currentConstellation?.month) === FLOWERS_MONTH;
  const isFirstMessageMoment =
    timelineYear === START_YEAR && Number(currentConstellation?.month) === START_MONTH;
  const timelineMonth = Number(currentConstellation?.month);
  const constellationMomentLabel =
    Number.isInteger(timelineMonth) && timelineMonth >= 1 && timelineMonth <= 12
      ? `${MONTH_NAMES[timelineMonth - 1]} de ${timelineYear}`
      : `Año ${timelineYear}`;

  const storySubtitle = useMemo(() => {
    if (timelineYear === START_YEAR && timelineMonth === START_MONTH) {
      return "8 de julio de 2025: nuestro primer mensaje.";
    }

    if (
      (timelineYear === 2025 && timelineMonth >= 8 && timelineMonth <= 12) ||
      (timelineYear === 2026 && timelineMonth === 1)
    ) {
      return "Mensajear y hablar de Dexter nos fue acercando cada mes.";
    }

    if (timelineYear === FLOWERS_YEAR && timelineMonth === FLOWERS_MONTH) {
      return "14 de febrero de 2026: Le envié flores.";
    }

    return currentConstellation?.subtitle || "Crea una constelación para empezar.";
  }, [currentConstellation?.subtitle, timelineMonth, timelineYear]);

  const firstContactLabel = `${START_DAY} de ${MONTH_NAMES[START_MONTH - 1].toLowerCase()} de ${START_YEAR}`;
  const flowersLabel = `${FLOWERS_DAY} de ${MONTH_NAMES[FLOWERS_MONTH - 1].toLowerCase()} de ${FLOWERS_YEAR}`;

  const selectedConstellationIdForForm = currentConstellation?.id || newMemory.constellationId;

  const selectedConstellationForForm = useMemo(
    () => constellations.find((constellation) => constellation.id === selectedConstellationIdForForm) || null,
    [constellations, selectedConstellationIdForForm],
  );

  const availableStarsForAssignment = useMemo(
    () => (selectedConstellationForForm?.items || []),
    [selectedConstellationForForm],
  );

  function getStartIndexForList(list) {
    const timelineList = normalizeTimelineConstellations(list);

    if (timelineList.length === 0) {
      return 0;
    }

    const startMonthIndex = timelineList.findIndex((constellation) => Number(constellation.month) === START_MONTH);
    if (startMonthIndex >= 0) {
      return startMonthIndex;
    }

    return Math.max(0, Math.min(START_MONTH - 1, timelineList.length - 1));
  }

  function applySessionStartPreference(username, list, mode) {
    const timelineList = normalizeTimelineConstellations(list);
    const safeMode = mode === "ultimo" ? "ultimo" : "inicio";

    if (safeMode === "ultimo") {
      const savedPosition = getStoredLastViewPosition(username);
      if (savedPosition) {
        setTimelineYear(savedPosition.timelineYear);
        setCurrentIndex(Math.min(savedPosition.currentIndex, Math.max(timelineList.length - 1, 0)));
        return;
      }

      setTimelineYear(Math.max(START_YEAR, FLOWERS_YEAR));
      setCurrentIndex(Math.max(timelineList.length - 1, 0));
      return;
    }

    setTimelineYear(START_YEAR);
    setCurrentIndex(getStartIndexForList(timelineList));
  }

  const selectedTargetStar = useMemo(
    () => availableStarsForAssignment.find((memory) => memory.id === newMemory.targetMemoryId) || null,
    [availableStarsForAssignment, newMemory.targetMemoryId],
  );

  const highlightedStarId = isStarPickerOpen ? hoveredStarId || newMemory.targetMemoryId : "";
  const distantStars = useMemo(() => {
    const seedText = currentConstellation?.id || "default-sky";
    let seed = 0;

    for (let index = 0; index < seedText.length; index += 1) {
      seed = (seed * 31 + seedText.charCodeAt(index)) % 2147483647;
    }

    function nextRandom() {
      seed = (seed * 48271) % 2147483647;
      return seed / 2147483647;
    }

    return Array.from({ length: 120 }).map((_, index) => ({
      id: `distant-${seedText}-${index}`,
      left: nextRandom() * 100,
      top: nextRandom() * 100,
      size: 0.6 + nextRandom() * 2.1,
      opacity: 0.18 + nextRandom() * 0.62,
      duration: 2.6 + nextRandom() * 4.4,
      delay: nextRandom() * 3,
    }));
  }, [currentConstellation?.id]);

  const yearOptions = useMemo(() => {
    const maxYear = Math.max(START_YEAR + 16, timelineYear + 6);
    return Array.from({ length: maxYear - START_YEAR + 1 }, (_, index) => START_YEAR + index);
  }, [timelineYear]);

  const flowerPetals = useMemo(
    () => [
      { id: "p1", left: 12, delay: 0.1, duration: 12, size: 10, drift: -10 },
      { id: "p2", left: 24, delay: 1.9, duration: 14, size: 12, drift: 8 },
      { id: "p3", left: 36, delay: 0.8, duration: 11, size: 9, drift: -7 },
      { id: "p4", left: 49, delay: 2.6, duration: 13, size: 13, drift: 12 },
      { id: "p5", left: 61, delay: 1.2, duration: 15, size: 11, drift: -9 },
      { id: "p6", left: 73, delay: 0.4, duration: 12, size: 10, drift: 7 },
      { id: "p7", left: 84, delay: 2.2, duration: 14, size: 12, drift: -8 },
    ],
    [],
  );

  useEffect(() => {
    const fieldNode = starFieldRef.current;

    if (!fieldNode || typeof ResizeObserver === "undefined") {
      return;
    }

    function updateSize() {
      const rect = fieldNode.getBoundingClientRect();
      setStarFieldSize({
        width: Math.max(1, rect.width),
        height: Math.max(1, rect.height),
      });
    }

    updateSize();

    const observer = new ResizeObserver(() => {
      updateSize();
    });

    observer.observe(fieldNode);

    return () => {
      observer.disconnect();
    };
  }, [timelineYear, normalizedIndex, isSkyFullscreen]);

  useEffect(() => {
    let spawnTimeoutId;
    let hideTimeoutId;
    let cancelled = false;

    function scheduleShootingStar() {
      const delayMs = 24000 + Math.random() * 28000;

      spawnTimeoutId = window.setTimeout(() => {
        if (cancelled) {
          return;
        }

        const startLeft = 24 + Math.random() * 52;
        const startTop = 14 + Math.random() * 30;
        const direction = Math.random() < 0.5 ? -1 : 1;
        const horizontalTravel = 22 + Math.random() * 18;
        const travelX = direction * horizontalTravel;
        const travelY = horizontalTravel * (0.5 + Math.random() * 0.34);
        const endLeft = Math.min(90, Math.max(10, startLeft + travelX));
        const endTop = Math.min(90, startTop + travelY);
        const dxPx = ((endLeft - startLeft) / 100) * starFieldSize.width;
        const dyPx = ((endTop - startTop) / 100) * starFieldSize.height;
        const distancePx = Math.hypot(dxPx, dyPx);
        const speedPxPerSecond = 420 + Math.random() * 170;
        const duration = Math.max(1200, Math.min(2300, (distancePx / speedPxPerSecond) * 1000));
        const angle = (Math.atan2(dyPx, dxPx) * 180) / Math.PI;
        const tailLength = Math.max(90, Math.min(180, distancePx * 0.92));
        const trailGlow = Math.max(42, Math.min(96, tailLength * 0.55));
        const headSize = Math.max(8.8, Math.min(12.8, 9.6 + speedPxPerSecond / 195));

        setShootingStar({
          key: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          startLeft,
          startTop,
          endLeft,
          endTop,
          duration,
          angle,
          tailLength,
          trailGlow,
          headSize,
        });

        hideTimeoutId = window.setTimeout(() => {
          if (cancelled) {
            return;
          }

          setShootingStar(null);
          scheduleShootingStar();
        }, duration + 420);
      }, delayMs);
    }

    scheduleShootingStar();

    return () => {
      cancelled = true;
      if (spawnTimeoutId) {
        window.clearTimeout(spawnTimeoutId);
      }
      if (hideTimeoutId) {
        window.clearTimeout(hideTimeoutId);
      }
    };
  }, [starFieldSize.height, starFieldSize.width]);

  useEffect(() => {
    function handleFullscreenChange() {
      setIsSkyFullscreen(document.fullscreenElement === skyPanelRef.current);
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  useEffect(
    () => () => {
      if (zoomOpenTimeoutRef.current) {
        window.clearTimeout(zoomOpenTimeoutRef.current);
      }
      if (zoomResetTimeoutRef.current) {
        window.clearTimeout(zoomResetTimeoutRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    function handleClickOutside(event) {
      if (!starPickerRef.current || starPickerRef.current.contains(event.target)) {
        return;
      }

      setIsStarPickerOpen(false);
      setHoveredStarId("");
    }

    document.addEventListener("pointerdown", handleClickOutside);
    return () => {
      document.removeEventListener("pointerdown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (!user?.username || displayConstellations.length === 0) {
      return;
    }

    setStoredLastViewPosition(user.username, {
      timelineYear,
      currentIndex: normalizedIndex,
    });
  }, [displayConstellations.length, normalizedIndex, timelineYear, user?.username]);

  async function refreshMemories() {
    const data = await getMemories();
    const list = Array.isArray(data.constellations) ? data.constellations : [];
    const timelineList = normalizeTimelineConstellations(list);
    setConstellations(list);
    setCurrentIndex((prev) => {
      if (timelineList.length === 0) {
        return 0;
      }
      return Math.min(prev, timelineList.length - 1);
    });

    setNewMemory((prev) => ({
      ...prev,
      targetMemoryId: "",
      constellationId:
        prev.constellationId ||
        list.find(
          (constellation) =>
            Number.isInteger(constellation.month) &&
            constellation.month >= 1 &&
            constellation.month <= 12,
        )?.id ||
        list[0]?.id ||
        "",
    }));

      return list;
  }

  async function refreshUsers(authToken, currentUser) {
    if (currentUser.role !== "admin") {
      setUsers([]);
      return;
    }

    const data = await getUsers(authToken);
    setUsers(Array.isArray(data.users) ? data.users : []);
    if (Array.isArray(data.availableRoles) && data.availableRoles.length > 0) {
      setAvailableRoles(data.availableRoles);
    }
  }

  const bootstrap = useEffectEvent(async (authToken) => {
    const meData = await me(authToken);
    setUser(meData.user);
    const list = await refreshMemories();
    const preferredMode = getStoredSessionStartMode(meData.user.username);
    setSessionStartMode(preferredMode);
    applySessionStartPreference(meData.user.username, list, preferredMode);
    await refreshUsers(authToken, meData.user);
  });

  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        await bootstrap(token);
        if (!cancelled) {
          setError("");
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError.message);
          localStorage.removeItem(TOKEN_KEY);
          setToken("");
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    init();

    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleLogin(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    try {
      const response = await login(credentials.username, credentials.password);
      localStorage.setItem(TOKEN_KEY, response.token);
      setToken(response.token);
      setCredentials({ username: "", password: "" });
    } catch (loginError) {
      setError(loginError.message);
    }
  }

  function handleLogout() {
    localStorage.removeItem(TOKEN_KEY);
    setToken("");
    setUser(null);
    setConstellations([]);
    setUsers([]);
    setCurrentIndex(START_MONTH - 1);
    setTimelineYear(START_YEAR);
    setSessionStartMode("inicio");
    setMessage("");
    setError("");
  }

  function handleSessionStartModeChange(event) {
    const nextMode = event.target.value === "ultimo" ? "ultimo" : "inicio";
    setSessionStartMode(nextMode);

    if (user?.username) {
      setStoredSessionStartMode(user.username, nextMode);
      applySessionStartPreference(user.username, constellations, nextMode);
    }
  }

  function exportCurrentMemories() {
    try {
      const payload = {
        exportedAt: new Date().toISOString(),
        constellations,
      };

      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const dateTag = new Date().toISOString().replace(/[:.]/g, "-");
      const link = document.createElement("a");
      link.href = url;
      link.download = `recuerdos-export-${dateTag}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setMessage("Exportacion lista. Guarda el JSON en Descargas y ejecuta npm run sync:recuerdos");
      setError("");
    } catch {
      setError("No se pudo exportar recuerdos");
    }
  }

  function closeSelectedMemory() {
    setSelectedMemory(null);
    setIsModalImageZoomed(false);
    setModalImageOffset({ x: 0, y: 0 });
    setIsModalImageDragging(false);
    setModalImageZoomScale(MODAL_IMAGE_ZOOM_DEFAULT);
  }

  async function addConstellation(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    try {
      const data = await updateMemories(token, {
        action: "addConstellation",
        constellation: {
          title: newConstellation.title,
          subtitle: newConstellation.subtitle,
        },
      });

      setConstellations(data.constellations || []);
      setNewConstellation({ title: "", subtitle: "" });
      setMessage("Constelación creada.");
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function addMemory(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    try {
      const constellationId = selectedConstellationIdForForm;
      const normalizedImagePath = normalizeProjectImagePath(newMemory.url);

      if (!constellationId) {
        throw new Error("No hay una constelacion seleccionada");
      }

      if (newMemory.type === "image") {
        if (!newMemory.url.trim()) {
          throw new Error("Para imagen, indica una ruta del proyecto dentro de /recuerdos/");
        }

        if (isExternalMediaUrl(newMemory.url)) {
          throw new Error("Las imagenes deben venir del proyecto. Usa /recuerdos/nombre-archivo.jpg");
        }

        if (isDataMediaUrl(newMemory.url)) {
          throw new Error("No se permite data URL para imagenes. Usa archivos en public/recuerdos");
        }

        if (!normalizedImagePath.startsWith(PROJECT_MEMORIES_IMAGE_PREFIX)) {
          throw new Error("La ruta de imagen debe iniciar en /recuerdos/");
        }

        if (!hasSupportedImageExtension(normalizedImagePath)) {
          throw new Error("Formato de imagen no soportado. Usa png, jpg, jpeg, webp, gif o svg");
        }
      }

      const isAssigningToExisting = Boolean(newMemory.targetMemoryId);
      const data = await updateMemories(
        token,
        isAssigningToExisting
          ? {
              action: "updateMemory",
              constellationId,
              memoryId: newMemory.targetMemoryId,
              updates: {
                type: newMemory.type,
                title: newMemory.title,
                description: newMemory.description,
                url: newMemory.type === "image" ? normalizedImagePath : newMemory.url,
              },
            }
          : {
              action: "addMemory",
              constellationId,
              memory: {
                type: newMemory.type,
                title: newMemory.title,
                description: newMemory.description,
                url: newMemory.type === "image" ? normalizedImagePath : newMemory.url,
                x: Number(newMemory.x),
                y: Number(newMemory.y),
              },
            },
      );

      setConstellations(data.constellations || []);
      setMessage(isAssigningToExisting ? "Estrella actualizada." : "Recuerdo agregado.");
      setNewMemory((prev) => ({
        ...prev,
        targetMemoryId: "",
        title: "",
        description: "",
        url: "",
      }));
      setMemoryFileInputKey((prev) => prev + 1);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function handleMemoryFileChange(event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");

    if (!isImage && !isVideo) {
      setError("Solo puedes subir imagenes o videos");
      setMemoryFileInputKey((prev) => prev + 1);
      return;
    }

    if (isImage) {
      setError("Para imagenes usa archivos del proyecto en public/recuerdos y escribe la ruta /recuerdos/archivo.jpg");
      setMemoryFileInputKey((prev) => prev + 1);
      return;
    }

    if (isImage && file.size > MAX_UPLOAD_IMAGE_INPUT_BYTES) {
      setError("La imagen supera 20 MB. Usa una imagen mas ligera.");
      setMemoryFileInputKey((prev) => prev + 1);
      return;
    }

    if (isVideo && file.size > MAX_UPLOAD_VIDEO_BYTES) {
      setError("El archivo supera 8 MB. Usa uno mas ligero para Netlify.");
      setMemoryFileInputKey((prev) => prev + 1);
      return;
    }

    try {
      const fileUrl = isImage ? await compressImageAsDataUrl(file) : await readFileAsDataUrl(file);
      const estimatedKb = Math.max(1, Math.round(dataUrlSizeInBytes(fileUrl) / 1024));

      setNewMemory((prev) => ({
        ...prev,
        type: isImage ? "image" : "video",
        url: fileUrl,
      }));
      setError("");
      setMessage(
        isImage
          ? `Imagen optimizada lista: ${file.name} (~${estimatedKb} KB)`
          : `Archivo listo: ${file.name}`,
      );
    } catch (fileError) {
      setError(fileError.message);
      setMemoryFileInputKey((prev) => prev + 1);
    }
  }

  async function clearMemoryContent(constellationId, memoryId) {
    setError("");
    setMessage("");

    try {
      const data = await updateMemories(token, {
        action: "updateMemory",
        constellationId,
        memoryId,
        updates: {
          type: "text",
          description: "",
          url: "",
        },
      });

      setConstellations(data.constellations || []);
      setSelectedMemory((prev) => {
        if (!prev || prev.id !== memoryId || prev.constellationId !== constellationId) {
          return prev;
        }

        return {
          ...prev,
          type: "text",
          description: "",
          url: "",
        };
      });
      setIsModalImageZoomed(false);
      setModalImageOffset({ x: 0, y: 0 });
      setIsModalImageDragging(false);
      setModalImageZoomScale(MODAL_IMAGE_ZOOM_DEFAULT);
      setMessage("Contenido borrado. La estrella se conserva.");
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function changeRole(targetUsername, role) {
    setError("");
    setMessage("");

    try {
      const data = await updateUserRole(token, targetUsername, role);
      setUsers(data.users || []);

      if (targetUsername === user.username) {
        const updatedCurrent = (data.users || []).find((item) => item.username === user.username);
        if (updatedCurrent) {
          setUser(updatedCurrent);
        }
      }

      setMessage(`Rol actualizado para ${targetUsername}.`);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  function openMemoryWithZoom(memory, constellationId) {
    if (zoomTarget) {
      return;
    }

    setZoomTarget({ x: memory.x, y: memory.y });
    setIsModalImageZoomed(false);
    setModalImageOffset({ x: 0, y: 0 });
    setIsModalImageDragging(false);
    setModalImageZoomScale(MODAL_IMAGE_ZOOM_DEFAULT);
    modalImageDragRef.current = {
      dragging: false,
      moved: false,
      pointerId: null,
      lastX: 0,
      lastY: 0,
    };

    zoomOpenTimeoutRef.current = window.setTimeout(() => {
      setSelectedMemory({ ...memory, constellationId });
    }, 330);

    zoomResetTimeoutRef.current = window.setTimeout(() => {
      setZoomTarget(null);
    }, 600);
  }

  function handleModalImageClick() {
    if (modalImageDragRef.current.moved) {
      modalImageDragRef.current.moved = false;
      return;
    }

    setIsModalImageZoomed((prev) => {
      if (prev) {
        setModalImageOffset({ x: 0, y: 0 });
        setModalImageZoomScale(MODAL_IMAGE_ZOOM_DEFAULT);
        return false;
      }

      setModalImageZoomScale(MODAL_IMAGE_ZOOM_DEFAULT);
      return true;
    });
  }

  function handleModalImagePointerDown(event) {
    if (!isModalImageZoomed) {
      return;
    }

    modalImageDragRef.current = {
      dragging: true,
      moved: false,
      pointerId: event.pointerId,
      lastX: event.clientX,
      lastY: event.clientY,
    };

    setIsModalImageDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleModalImagePointerMove(event) {
    if (!isModalImageZoomed || !modalImageDragRef.current.dragging) {
      return;
    }

    const dx = event.clientX - modalImageDragRef.current.lastX;
    const dy = event.clientY - modalImageDragRef.current.lastY;

    if (dx === 0 && dy === 0) {
      return;
    }

    modalImageDragRef.current.lastX = event.clientX;
    modalImageDragRef.current.lastY = event.clientY;
    modalImageDragRef.current.moved = true;

    const rect = event.currentTarget.getBoundingClientRect();
    setModalImageOffset((prev) =>
      clampModalImageOffset(
        {
          x: prev.x + dx,
          y: prev.y + dy,
        },
        modalImageZoomScale,
        rect,
      ),
    );
  }

  function handleModalImagePointerUp(event) {
    if (modalImageDragRef.current.pointerId !== event.pointerId) {
      return;
    }

    modalImageDragRef.current.dragging = false;
    modalImageDragRef.current.pointerId = null;
    setIsModalImageDragging(false);
    event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function handleModalImagePointerCancel(event) {
    if (modalImageDragRef.current.pointerId !== event.pointerId) {
      return;
    }

    modalImageDragRef.current = {
      dragging: false,
      moved: false,
      pointerId: null,
      lastX: 0,
      lastY: 0,
    };
    setIsModalImageDragging(false);
  }

  function handleModalImageWheel(event) {
    event.preventDefault();
    event.stopPropagation();

    const target = event.currentTarget;
    const targetRect = target.getBoundingClientRect();
    if (!targetRect.width || !targetRect.height) {
      return;
    }

    const direction = event.deltaY < 0 ? 1 : -1;
    const step = direction * 0.18;
    const currentScale = Number.isFinite(modalImageZoomScale) ? modalImageZoomScale : MODAL_IMAGE_ZOOM_DEFAULT;
    const baseScale = isModalImageZoomed ? currentScale : MODAL_IMAGE_ZOOM_DEFAULT;
    const nextScale = clamp(baseScale + step, MODAL_IMAGE_ZOOM_MIN, MODAL_IMAGE_ZOOM_MAX);

    if (nextScale <= 1.02) {
      setIsModalImageZoomed(false);
      setModalImageOffset({ x: 0, y: 0 });
      setModalImageZoomScale(MODAL_IMAGE_ZOOM_DEFAULT);
      return;
    }

    if (!isModalImageZoomed) {
      setIsModalImageZoomed(true);
    }

    setModalImageZoomScale(nextScale);
    setModalImageOffset((prev) => {
      const clampedOffset = clampModalImageOffset(prev, nextScale, targetRect);

      // Near base scale, recenter progressively to avoid losing the image off-canvas.
      if (nextScale < 1.35) {
        return {
          x: clampedOffset.x * 0.45,
          y: clampedOffset.y * 0.45,
        };
      }

      return clampedOffset;
    });
  }

  function adjustModalImageZoom(nextScale, target) {
    const clampedScale = clamp(nextScale, MODAL_IMAGE_ZOOM_MIN, MODAL_IMAGE_ZOOM_MAX);

    if (clampedScale <= 1) {
      setIsModalImageZoomed(false);
      setModalImageOffset({ x: 0, y: 0 });
      setModalImageZoomScale(MODAL_IMAGE_ZOOM_DEFAULT);
      return;
    }

    setIsModalImageZoomed(true);
    setModalImageZoomScale(clampedScale);

    if (target) {
      setModalImageOffset((prev) => clampModalImageOffset(prev, clampedScale, target.getBoundingClientRect()));
    }
  }

  function goPreviousConstellation() {
    if (!displayConstellations.length) {
      return;
    }

    const currentMonth = Number(currentConstellation?.month);
    if (!Number.isFinite(currentMonth)) {
      return;
    }

    const target = getAdjacentTimelinePoint(timelineYear, currentMonth, -1);
    if (target.year < START_YEAR) {
      return;
    }

    const targetIndex = displayConstellations.findIndex(
      (constellation) => Number(constellation.month) === target.month,
    );

    if (targetIndex < 0) {
      return;
    }

    setTimelineYear(target.year);
    setCurrentIndex(targetIndex);
  }

  function goNextConstellation() {
    if (!displayConstellations.length) {
      return;
    }

    const currentMonth = Number(currentConstellation?.month);
    if (!Number.isFinite(currentMonth)) {
      return;
    }

    const target = getAdjacentTimelinePoint(timelineYear, currentMonth, 1);
    const targetIndex = displayConstellations.findIndex(
      (constellation) => Number(constellation.month) === target.month,
    );

    if (targetIndex < 0) {
      return;
    }

    setTimelineYear(target.year);
    setCurrentIndex(targetIndex);
  }

  async function toggleSkyFullscreen() {
    const panel = skyPanelRef.current;

    if (!panel || typeof panel.requestFullscreen !== "function") {
      setError("Tu navegador no soporta pantalla completa en este modo.");
      return;
    }

    try {
      if (document.fullscreenElement === panel) {
        await document.exitFullscreen();
      } else {
        await panel.requestFullscreen();
      }
      setError("");
    } catch {
      setError("No se pudo activar pantalla completa.");
    }
  }

  function handleYearChange(event) {
    const nextValue = Number(event.target.value);

    if (!Number.isFinite(nextValue)) {
      return;
    }

    setTimelineYear(Math.max(START_YEAR, Math.floor(nextValue)));
  }

  function handleMonthChange(event) {
    const monthValue = Number(event.target.value);
    if (timelineYear === START_YEAR && monthValue < START_MONTH) {
      setCurrentIndex(startIndex);
      return;
    }


    if (!Number.isFinite(monthValue)) {
      return;
    }

    if (isSkippedTimelineMonth(timelineYear, monthValue)) {
      if (timelineYear === START_YEAR) {
        const flowersIndex = displayConstellations.findIndex(
          (constellation) => Number(constellation.month) === FLOWERS_MONTH,
        );

        if (flowersIndex >= 0) {
          setTimelineYear(FLOWERS_YEAR);
          setCurrentIndex(flowersIndex);
          return;
        }
      }

      const fallbackMonth = Math.max(FLOWERS_MONTH, monthValue);
      const fallbackIndex = displayConstellations.findIndex(
        (constellation) => Number(constellation.month) === fallbackMonth,
      );

      if (fallbackIndex >= 0) {
        setCurrentIndex(fallbackIndex);
      }
      return;
    }

    const targetIndex = displayConstellations.findIndex(
      (constellation) => Number(constellation.month) === monthValue,
    );

    if (targetIndex >= 0) {
      setCurrentIndex(targetIndex);
      return;
    }

    setCurrentIndex(Math.min(Math.max(monthValue - 1, 0), Math.max(displayConstellations.length - 1, 0)));
  }

  const displayItemById = useMemo(
    () => buildDisplayItemMap(currentConstellation?.items || []),
    [currentConstellation?.items],
  );

  const dropPreviewByItemId = useMemo(() => {
    const map = {};
    const items = currentConstellation?.items || [];

    items.forEach((item) => {
      const hasImage = canRenderImageMemory(item);
      map[item.id] = hasImage ? item.url.trim() : DEMO_DROP_IMAGE;
    });

    return map;
  }, [currentConstellation]);

  const alwaysVisibleDropId = useMemo(() => {
    const items = currentConstellation?.items || [];
    const firstWithImage = items.find((item) => canRenderImageMemory(item));

    return firstWithImage?.id || items[0]?.id || "";
  }, [currentConstellation]);
  const activeHoveredStarId =
    (currentConstellation?.items || []).some((item) => item.id === hoveredStarId) ? hoveredStarId : "";

  const memoryModal = selectedMemory ? (
    <section className="memory-modal" role="dialog" aria-modal="true">
      <div
        className={`memory-card ${
          selectedMemory.type === "image" && selectedMemory.url ? "image-focus" : ""
        } ${isModalImageZoomed ? "image-zoomed" : ""}`}
      >
        <button
          type="button"
          className="close"
          onClick={closeSelectedMemory}
        >
          Cerrar
        </button>
        <h3>{selectedMemory.title}</h3>
        {selectedMemory.description && <p>{selectedMemory.description}</p>}

        {canRenderImageMemory(selectedMemory) && selectedMemory.url && (
          <>
            <div className="memory-image-tools">
              <button
                type="button"
                className="ghost"
                onClick={() => adjustModalImageZoom(modalImageZoomScale - 0.2)}
              >
                -
              </button>
              <button
                type="button"
                className="ghost"
                onClick={() => adjustModalImageZoom(modalImageZoomScale + 0.2)}
              >
                +
              </button>
              <button
                type="button"
                className="ghost"
                onClick={() => {
                  setIsModalImageZoomed(false);
                  setModalImageOffset({ x: 0, y: 0 });
                  setModalImageZoomScale(MODAL_IMAGE_ZOOM_DEFAULT);
                }}
              >
                Reset
              </button>
              <span>{Math.round((isModalImageZoomed ? modalImageZoomScale : 1) * 100)}%</span>
            </div>

            <button
              type="button"
              className={`memory-image-zoom-trigger ${isModalImageZoomed ? "is-zoomed" : ""} ${
                isModalImageDragging ? "is-dragging" : ""
              }`}
              onClick={handleModalImageClick}
              onWheel={handleModalImageWheel}
              onPointerDown={handleModalImagePointerDown}
              onPointerMove={handleModalImagePointerMove}
              onPointerUp={handleModalImagePointerUp}
              onPointerCancel={handleModalImagePointerCancel}
              aria-label={isModalImageZoomed ? "Reducir imagen" : "Acercar imagen"}
              style={{
                "--memory-zoom-x": `${modalImageOffset.x}px`,
                "--memory-zoom-y": `${modalImageOffset.y}px`,
                "--memory-zoom-scale": isModalImageZoomed ? modalImageZoomScale : 1,
              }}
            >
              <img
                src={selectedMemory.url}
                alt={selectedMemory.title}
                className="memory-media memory-media-image"
                draggable={false}
                onDragStart={(event) => event.preventDefault()}
              />
            </button>
          </>
        )}

        {selectedMemory.type === "video" && selectedMemory.url && (
          <>
            {getEmbedUrl(selectedMemory.url) ? (
              <iframe
                title={selectedMemory.title}
                src={getEmbedUrl(selectedMemory.url)}
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <video src={selectedMemory.url} controls className="memory-media memory-media-video" />
            )}
          </>
        )}

        {selectedMemory.type === "text" && (
          <blockquote>
            {selectedMemory.description || "Este recuerdo solo tiene texto. Puedes editarlo."}
          </blockquote>
        )}

        {canEdit && (
          <button
            type="button"
            className="danger"
            onClick={() => clearMemoryContent(selectedMemory.constellationId, selectedMemory.id)}
          >
            Borrar contenido
          </button>
        )}

        {canEdit && <p className="memory-note">La estrella se mantiene, solo se limpia su contenido.</p>}
      </div>
    </section>
  ) : null;

  if (loading) {
    return (
      <main className="app-shell app-loading">
        <p>Cargando cielo de recuerdos...</p>
      </main>
    );
  }

  if (!token || !user) {
    return (
      <main className="app-shell login-screen">
        <section className="login-card">
          <p className="eyebrow">2 meses de historia</p>
          <h1>Bitácora de nuestras constelaciones</h1>
          <p className="subtitle">
            Entren con su usuario y clave para recorrer recuerdos en el cielo del atardecer.
          </p>
          <form onSubmit={handleLogin} className="form-stack">
            <label>
              Usuario
              <input
                value={credentials.username}
                onChange={(event) =>
                  setCredentials((prev) => ({ ...prev, username: event.target.value }))
                }
                required
              />
            </label>
            <label>
              Contraseña
              <input
                type="password"
                value={credentials.password}
                onChange={(event) =>
                  setCredentials((prev) => ({ ...prev, password: event.target.value }))
                }
                required
              />
            </label>
            <button type="submit">Entrar al cielo</button>
          </form>
          {error && <p className="status error">{error}</p>}
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Aniversario de 2 meses</p>
          <h1>Cielo de recuerdos</h1>
        </div>
        <div className="header-actions">
          <p className="chip">{user.displayName}</p>
          <p className="chip role">Rol: {user.role}</p>
          <label className="switch">
            <input
              type="checkbox"
              checked={viewOnlyMode}
              onChange={(event) => setViewOnlyMode(event.target.checked)}
            />
            Modo solo vista
          </label>
          <button type="button" className="ghost" onClick={handleLogout}>
            Salir
          </button>
        </div>
      </header>

      <section className="layout">
        <article ref={skyPanelRef} className={`sky-panel ${isSkyFullscreen ? "is-fullscreen" : ""}`}>
          {isSkyFullscreen && (
            <button
              type="button"
              className="fullscreen-exit-btn"
              onClick={toggleSkyFullscreen}
            >
              Salir de pantalla completa
            </button>
          )}
          {shootingStar && (
            <div className="shooting-layer" aria-hidden="true">
              <span
                key={shootingStar.key}
                className="shooting-star"
                style={{
                  "--shoot-start-left": `${shootingStar.startLeft}%`,
                  "--shoot-start-top": `${shootingStar.startTop}%`,
                  "--shoot-end-left": `${shootingStar.endLeft}%`,
                  "--shoot-end-top": `${shootingStar.endTop}%`,
                  "--shoot-duration": `${shootingStar.duration}ms`,
                  "--shoot-angle": `${shootingStar.angle}deg`,
                  "--shoot-tail-length": `${shootingStar.tailLength}px`,
                  "--shoot-trail-glow": `${shootingStar.trailGlow}px`,
                  "--shoot-head-size": `${shootingStar.headSize}px`,
                }}
              />
            </div>
          )}
          <div className="sky-meta">
            <p>{progressText}</p>
            <h2>{currentConstellation?.title || "Sin constelaciones"}</h2>
            <p>{storySubtitle}</p>
            <p className="first-memory">Momento: {constellationMomentLabel}</p>
            {isFirstMessageMoment && <p className="first-memory">Primer mensaje: {firstContactLabel}</p>}
            {isFirstFlowersMoment && <p className="first-memory">Flores: {flowersLabel}</p>}
            <p className="romantic-line">Bajo este cielo, cada estrella guarda un recuerdo nuestro.</p>
          </div>

          <div
            key={`sky-${timelineYear}-${normalizedIndex}`}
            ref={starFieldRef}
            className={`star-field ${zoomTarget ? "zooming" : ""} ${isFirstFlowersMoment ? "first-moment" : ""}`}
            style={
              zoomTarget
                ? {
                    "--zoom-x": `${zoomTarget.x}%`,
                    "--zoom-y": `${zoomTarget.y}%`,
                  }
                : undefined
            }
          >
            <div className="horizon" aria-hidden="true" />
            <div className="glow" aria-hidden="true" />
            <div className="night-grain" aria-hidden="true" />
            {isFirstFlowersMoment && (
              <div className="petal-layer" aria-hidden="true">
                {flowerPetals.map((petal) => (
                  <span
                    key={petal.id}
                    className="petal"
                    style={{
                      left: `${petal.left}%`,
                      "--petal-delay": `${petal.delay}s`,
                      "--petal-duration": `${petal.duration}s`,
                      "--petal-size": `${petal.size}px`,
                      "--petal-drift": `${petal.drift}px`,
                    }}
                  />
                ))}
              </div>
            )}
            <div className="distant-stars" aria-hidden="true">
              {distantStars.map((star) => (
                <span
                  key={star.id}
                  style={{
                    left: `${star.left}%`,
                    top: `${star.top}%`,
                    width: `${star.size}px`,
                    height: `${star.size}px`,
                    opacity: star.opacity,
                    "--star-drift-duration": `${star.duration}s`,
                    "--star-drift-delay": `${star.delay}s`,
                  }}
                />
              ))}
            </div>
            <svg className="constellation-lines" viewBox="0 0 100 100" preserveAspectRatio="none">
              {(currentConstellation?.connections || []).map((pair, index) => {
                const [fromId, toId] = Array.isArray(pair) ? pair : [];
                const from = displayItemById[fromId];
                const to = displayItemById[toId];

                if (!from || !to) {
                  return null;
                }

                return (
                  <line
                    key={`${fromId}-${toId}-${index}`}
                    x1={from.x}
                    y1={from.y}
                    x2={to.x}
                    y2={to.y}
                  />
                );
              })}
            </svg>
            {(currentConstellation?.items || []).map((memory, index) => (
              <Fragment key={memory.id}>
                {(memory.id === alwaysVisibleDropId || activeHoveredStarId === memory.id) && dropPreviewByItemId[memory.id] && (
                  <button
                    type="button"
                    className="memory-drop-preview"
                    style={{
                      left: `${displayItemById[memory.id]?.x ?? memory.x}%`,
                      top: `${displayItemById[memory.id]?.y ?? memory.y}%`,
                    }}
                    onMouseEnter={() => setHoveredStarId(memory.id)}
                    onMouseLeave={() => setHoveredStarId("")}
                    onFocus={() => setHoveredStarId(memory.id)}
                    onBlur={() => setHoveredStarId("")}
                    onClick={() =>
                      openMemoryWithZoom(
                        {
                          ...memory,
                          x: displayItemById[memory.id]?.x ?? memory.x,
                          y: displayItemById[memory.id]?.y ?? memory.y,
                        },
                        currentConstellation.id,
                      )
                    }
                    aria-label={`Abrir recuerdo ${memory.title}`}
                  >
                    <img src={dropPreviewByItemId[memory.id]} alt="" loading="lazy" />
                  </button>
                )}
                <button
                  type="button"
                  className={`star ${
                    highlightedStarId === memory.id || activeHoveredStarId === memory.id ? "is-highlighted" : ""
                  } ${
                    hasOrbitingImage(memory) ? "has-orbiting-memory" : ""
                  }`}
                  style={{
                    left: `${displayItemById[memory.id]?.x ?? memory.x}%`,
                    top: `${displayItemById[memory.id]?.y ?? memory.y}%`,
                    "--star-size": `${10 + (index % 4) * 2}px`,
                    "--twinkle-delay": `${(index % 7) * 0.22}s`,
                  }}
                  onMouseEnter={() => setHoveredStarId(memory.id)}
                  onMouseLeave={() => setHoveredStarId("")}
                  onFocus={() => setHoveredStarId(memory.id)}
                  onBlur={() => setHoveredStarId("")}
                  onClick={() =>
                    openMemoryWithZoom(
                      {
                        ...memory,
                        x: displayItemById[memory.id]?.x ?? memory.x,
                        y: displayItemById[memory.id]?.y ?? memory.y,
                      },
                      currentConstellation.id,
                    )
                  }
                  aria-label={`Abrir recuerdo ${memory.title}`}
                  title={memory.title}
                >
                  <span className="star-core" aria-hidden="true" />
                  {hasOrbitingImage(memory) && <span className="star-orbit" aria-hidden="true" />}
                </button>
              </Fragment>
            ))}
            {(currentConstellation?.items || []).length === 0 && (
              <p className="empty">No hay estrellas en esta constelación todavía.</p>
            )}
          </div>

          <div className="sky-controls">
            <button
              type="button"
              onClick={goPreviousConstellation}
              disabled={!canGoPrevious}
            >
              Constelación anterior
            </button>
            <button
              type="button"
              onClick={goNextConstellation}
              disabled={!displayConstellations.length}
            >
              Siguiente constelación
            </button>
            <button type="button" className="ghost" onClick={toggleSkyFullscreen}>
              {isSkyFullscreen ? "Salir pantalla completa" : "Pantalla completa"}
            </button>
          </div>

          <div className="timeline-controls">
            <label>
              Año
              <div className="select-shell">
                <select value={timelineYear} onChange={handleYearChange}>
                  {yearOptions.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
                <span className="select-arrow" aria-hidden="true" />
              </div>
            </label>
            <label>
              Mes
              <div className="select-shell">
                <select
                  value={
                    Number.isInteger(currentConstellation?.month) ? currentConstellation.month : normalizedIndex + 1
                  }
                  onChange={handleMonthChange}
                >
                  {MONTH_NAMES.map((monthName, index) => ({ monthName, monthValue: index + 1 }))
                    .filter(({ monthValue }) => {
                      if (timelineYear === START_YEAR && monthValue < START_MONTH) {
                        return false;
                      }

                      return !isSkippedTimelineMonth(timelineYear, monthValue);
                    })
                    .map(({ monthName, monthValue }) => (
                      <option key={monthName} value={monthValue}>
                        {monthName}
                      </option>
                    ))}
                </select>
                <span className="select-arrow" aria-hidden="true" />
              </div>
            </label>
          </div>

          {isSkyFullscreen && memoryModal}
        </article>

        <aside className="side-panel">
          {message && <p className="status success">{message}</p>}
          {error && <p className="status error">{error}</p>}

          <section className="panel-block">
            <h3>Inicio de sesión</h3>
            <label>
              Al iniciar sesión
              <select value={sessionStartMode} onChange={handleSessionStartModeChange}>
                <option value="inicio">Ver inicio ({firstContactLabel})</option>
                <option value="ultimo">Ver último recuerdo</option>
              </select>
            </label>
          </section>

          <section className="panel-block">
            <h3>Como usar</h3>
            <p>
              Presiona cada estrella para abrir un recuerdo. Puedes pasar de una constelación a
              otra con los botones inferiores. Al cerrar diciembre, el recorrido pasa al siguiente
              año.
            </p>
          </section>

          {canEdit && (
            <section className="panel-block">
              <h3>Sincronizar por GitHub</h3>
              <p>
                Exporta tus recuerdos actuales a JSON y luego sincronizalos al proyecto con
                <strong> npm run sync:recuerdos</strong> antes de hacer commit.
              </p>
              <button type="button" className="ghost" onClick={exportCurrentMemories}>
                Exportar recuerdos (JSON)
              </button>
            </section>
          )}

          {canEdit ? (
            <>
              <section className="panel-block">
                <h3>Nueva constelación</h3>
                <form onSubmit={addConstellation} className="form-stack">
                  <label>
                    Titulo
                    <input
                      value={newConstellation.title}
                      onChange={(event) =>
                        setNewConstellation((prev) => ({ ...prev, title: event.target.value }))
                      }
                      required
                    />
                  </label>
                  <label>
                    Subtitulo
                    <input
                      value={newConstellation.subtitle}
                      onChange={(event) =>
                        setNewConstellation((prev) => ({ ...prev, subtitle: event.target.value }))
                      }
                    />
                  </label>
                  <button type="submit">Crear constelación</button>
                </form>
              </section>

              <section className="panel-block">
                <h3>Agregar recuerdo</h3>
                <form onSubmit={addMemory} className="form-stack">
                  <label>
                    Constelación
                    <select
                      value={selectedConstellationIdForForm}
                      disabled
                      required
                    >
                      <option value="" disabled>
                        Selecciona...
                      </option>
                      {constellations
                        .filter(
                          (constellation) =>
                            Number.isInteger(constellation.month) &&
                            constellation.month >= 1 &&
                            constellation.month <= 12,
                        )
                        .map((constellation) => (
                        <option key={constellation.id} value={constellation.id}>
                          {`${constellation.title}${
                            Number.isInteger(constellation.month) &&
                            constellation.month >= 1 &&
                            constellation.month <= 12
                              ? ` (${MONTH_NAMES[constellation.month - 1]})`
                              : ""
                          }`}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Estrella de la constelación (opcional)
                    <div className="star-picker" ref={starPickerRef}>
                      <button
                        type="button"
                        className="star-picker-trigger"
                        onClick={() => setIsStarPickerOpen((prev) => !prev)}
                        onBlur={() => {
                          setHoveredStarId("");
                        }}
                        aria-haspopup="listbox"
                        aria-expanded={isStarPickerOpen}
                      >
                        {selectedTargetStar?.title || "Crear nueva estrella"}
                      </button>

                      {isStarPickerOpen && (
                        <div className="star-picker-menu" role="listbox">
                          <button
                            type="button"
                            className={`star-picker-option ${newMemory.targetMemoryId ? "" : "is-selected"}`}
                            onClick={() => {
                              setNewMemory((prev) => ({ ...prev, targetMemoryId: "" }));
                              setHoveredStarId("");
                              setIsStarPickerOpen(false);
                            }}
                          >
                            Crear nueva estrella
                          </button>

                          {availableStarsForAssignment.map((memory) => (
                            <button
                              key={memory.id}
                              type="button"
                              className={`star-picker-option ${
                                newMemory.targetMemoryId === memory.id ? "is-selected" : ""
                              }`}
                              onMouseEnter={() => setHoveredStarId(memory.id)}
                              onMouseLeave={() => setHoveredStarId("")}
                              onFocus={() => setHoveredStarId(memory.id)}
                              onBlur={() => setHoveredStarId("")}
                              onClick={() => {
                                setNewMemory((prev) => ({ ...prev, targetMemoryId: memory.id }));
                                setHoveredStarId(memory.id);
                                setIsStarPickerOpen(false);
                              }}
                            >
                              {memory.title}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </label>
                  <label>
                    Tipo
                    <select
                      value={newMemory.type}
                      onChange={(event) =>
                        setNewMemory((prev) => ({ ...prev, type: event.target.value }))
                      }
                    >
                      <option value="image">Imagen</option>
                      <option value="video">Video</option>
                      <option value="text">Texto</option>
                    </select>
                  </label>
                  <label>
                    Titulo
                    <input
                      value={newMemory.title}
                      onChange={(event) =>
                        setNewMemory((prev) => ({ ...prev, title: event.target.value }))
                      }
                      required
                    />
                  </label>
                  <label>
                    Descripcion
                    <textarea
                      value={newMemory.description}
                      onChange={(event) =>
                        setNewMemory((prev) => ({ ...prev, description: event.target.value }))
                      }
                    />
                  </label>
                  <label>
                    Subir archivo
                    <input
                      key={memoryFileInputKey}
                      type="file"
                      accept="video/*"
                      onChange={handleMemoryFileChange}
                    />
                  </label>
                  <label>
                    Ruta o URL
                    <input
                      placeholder={
                        newMemory.type === "image" ? "/recuerdos/mi-foto.jpg" : "https://..."
                      }
                      value={newMemory.url}
                      onChange={(event) =>
                        setNewMemory((prev) => ({ ...prev, url: event.target.value }))
                      }
                    />
                  </label>
                  {newMemory.type === "image" && (
                    <p className="memory-note">
                      Guarda tus imagenes en <strong>public/recuerdos/</strong> y usa la ruta
                      publica, por ejemplo <strong>/recuerdos/nuestro-viaje.jpg</strong>.
                    </p>
                  )}
                  {!newMemory.targetMemoryId && (
                    <div className="grid-2">
                      <label>
                        X (%)
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={newMemory.x}
                          onChange={(event) =>
                            setNewMemory((prev) => ({ ...prev, x: event.target.value }))
                          }
                        />
                      </label>
                      <label>
                        Y (%)
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={newMemory.y}
                          onChange={(event) =>
                            setNewMemory((prev) => ({ ...prev, y: event.target.value }))
                          }
                        />
                      </label>
                    </div>
                  )}
                  <button type="submit">
                    {newMemory.targetMemoryId ? "Asignar a estrella" : "Guardar recuerdo"}
                  </button>
                </form>
              </section>
            </>
          ) : null}

          {canManageUsers && (
            <section className="panel-block">
              <h3>Permisos de usuarios</h3>
              <ul className="user-list">
                {users.map((item) => (
                  <li key={item.username}>
                    <div>
                      <strong>{item.displayName}</strong>
                      <p>@{item.username}</p>
                    </div>
                    <select
                      value={item.role}
                      onChange={(event) => changeRole(item.username, event.target.value)}
                    >
                      {availableRoles.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </section>

      {!isSkyFullscreen && memoryModal}
    </main>
  );
}

export default App;
