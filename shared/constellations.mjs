import { USER_CONSTELLATIONS } from "./user-constellations.mjs";

const BASE_CONSTELLATIONS = {
  constellations: [
    {
      id: "month-01-capricornus",
      month: 1,
      title: "Capricornio",
      subtitle: "Enero · Constelacion invernal del zodiaco",
      items: [
        { id: "capri-deneb", type: "text", title: "Deneb Algedi", description: "Cola de Capricornio.", x: 27, y: 42 },
        { id: "capri-nashira", type: "text", title: "Nashira", description: "Zona central del asterismo.", x: 41, y: 35 },
        { id: "capri-dabih", type: "text", title: "Dabih", description: "Par brillante de Capricornio.", x: 55, y: 46 },
        { id: "capri-algedi", type: "text", title: "Algedi", description: "Extremo oriental del patron.", x: 69, y: 58 },
      ],
      connections: [
        ["capri-deneb", "capri-nashira"],
        ["capri-nashira", "capri-dabih"],
        ["capri-dabih", "capri-algedi"],
      ],
    },
    {
      id: "month-02-aquarius",
      month: 2,
      title: "Acuario",
      subtitle: "Febrero · El portador de agua",
      items: [
        { id: "aqua-sadalmelik", type: "text", title: "Sadalmelik", description: "Estrella principal de Acuario.", x: 31, y: 30 },
        { id: "aqua-sadalsuud", type: "text", title: "Sadalsuud", description: "Una de las mas brillantes del patron.", x: 46, y: 42 },
        { id: "aqua-skats", type: "text", title: "Skat", description: "Zona baja del flujo de agua.", x: 62, y: 55 },
        { id: "aqua-albali", type: "text", title: "Albali", description: "Punto lateral del dibujo.", x: 71, y: 39 },
      ],
      connections: [
        ["aqua-sadalmelik", "aqua-sadalsuud"],
        ["aqua-sadalsuud", "aqua-skats"],
        ["aqua-sadalsuud", "aqua-albali"],
      ],
    },
    {
      id: "month-03-pisces",
      month: 3,
      title: "Piscis",
      subtitle: "Marzo · Dos peces unidos por un lazo",
      items: [
        { id: "pisces-eta", type: "text", title: "Eta Piscium", description: "Nodo central de Piscis.", x: 44, y: 44 },
        { id: "pisces-alrescha", type: "text", title: "Alrescha", description: "Punto de union de las cuerdas.", x: 56, y: 49 },
        { id: "pisces-fumalsamakah", type: "text", title: "Fumalsamakah", description: "Cabeza del pez occidental.", x: 34, y: 32 },
        { id: "pisces-kullat", type: "text", title: "Kullat Nunu", description: "Zona del pez oriental.", x: 71, y: 61 },
      ],
      connections: [
        ["pisces-fumalsamakah", "pisces-eta"],
        ["pisces-eta", "pisces-alrescha"],
        ["pisces-alrescha", "pisces-kullat"],
      ],
    },
    {
      id: "month-04-aries",
      month: 4,
      title: "Aries",
      subtitle: "Abril · El carnero del zodiaco",
      items: [
        { id: "aries-hamal", type: "text", title: "Hamal", description: "Estrella mas brillante de Aries.", x: 33, y: 39 },
        { id: "aries-sheratan", type: "text", title: "Sheratan", description: "Segunda estrella principal.", x: 48, y: 44 },
        { id: "aries-mesarthim", type: "text", title: "Mesarthim", description: "Extremo del dibujo tradicional.", x: 62, y: 52 },
      ],
      connections: [
        ["aries-hamal", "aries-sheratan"],
        ["aries-sheratan", "aries-mesarthim"],
      ],
    },
    {
      id: "month-05-taurus",
      month: 5,
      title: "Tauro",
      subtitle: "Mayo · Los cuernos del toro",
      items: [
        { id: "taurus-aldebaran", type: "text", title: "Aldebaran", description: "Ojo rojizo del toro.", x: 38, y: 44 },
        { id: "taurus-elnath", type: "text", title: "Elnath", description: "Uno de los cuernos.", x: 54, y: 28 },
        { id: "taurus-zeta", type: "text", title: "Zeta Tauri", description: "Otro extremo del cuerno.", x: 63, y: 55 },
        { id: "taurus-hyadum", type: "text", title: "Hyadum", description: "Parte del rostro de Tauro.", x: 27, y: 53 },
      ],
      connections: [
        ["taurus-hyadum", "taurus-aldebaran"],
        ["taurus-aldebaran", "taurus-elnath"],
        ["taurus-aldebaran", "taurus-zeta"],
      ],
    },
    {
      id: "month-06-gemini",
      month: 6,
      title: "Geminis",
      subtitle: "Junio · Castor y Pollux en pareja",
      items: [
        { id: "gemini-castor", type: "text", title: "Castor", description: "Uno de los gemelos mitologicos.", x: 39, y: 27 },
        { id: "gemini-pollux", type: "text", title: "Pollux", description: "El gemelo mas brillante.", x: 51, y: 34 },
        { id: "gemini-alhena", type: "text", title: "Alhena", description: "Punto de la pierna de Pollux.", x: 58, y: 58 },
        { id: "gemini-tejat", type: "text", title: "Tejat", description: "Zona inferior de Castor.", x: 31, y: 61 },
      ],
      connections: [
        ["gemini-castor", "gemini-tejat"],
        ["gemini-pollux", "gemini-alhena"],
        ["gemini-castor", "gemini-pollux"],
      ],
    },
    {
      id: "month-07-cancer",
      month: 7,
      title: "Cancer",
      subtitle: "Julio · Constelacion tenue entre Geminis y Leo",
      items: [
        { id: "cancer-altarf", type: "text", title: "Altarf", description: "Estrella principal de Cancer.", x: 58, y: 52 },
        { id: "cancer-asellus-borealis", type: "text", title: "Asellus Borealis", description: "Zona norte del cangrejo.", x: 44, y: 37 },
        { id: "cancer-asellus-australis", type: "text", title: "Asellus Australis", description: "Zona sur del patron.", x: 48, y: 55 },
        { id: "cancer-acubens", type: "text", title: "Acubens", description: "Pinza de Cancer.", x: 33, y: 44 },
      ],
      connections: [
        ["cancer-acubens", "cancer-asellus-borealis"],
        ["cancer-acubens", "cancer-asellus-australis"],
        ["cancer-asellus-australis", "cancer-altarf"],
      ],
    },
    {
      id: "month-08-leo",
      month: 8,
      title: "Leo",
      subtitle: "Agosto · El leon celeste del zodiaco",
      items: [
        { id: "leo-regulus", type: "text", title: "Regulus", description: "Corazon de Leo.", x: 29, y: 54 },
        { id: "leo-algieba", type: "text", title: "Algieba", description: "Melena del leon.", x: 36, y: 43 },
        { id: "leo-zosma", type: "text", title: "Zosma", description: "Lomo de Leo.", x: 52, y: 39 },
        { id: "leo-denebola", type: "text", title: "Denebola", description: "Cola de Leo.", x: 67, y: 47 },
        { id: "leo-chertan", type: "text", title: "Chertan", description: "Tramo trasero del cuerpo.", x: 58, y: 56 },
      ],
      connections: [
        ["leo-regulus", "leo-algieba"],
        ["leo-algieba", "leo-zosma"],
        ["leo-zosma", "leo-denebola"],
        ["leo-denebola", "leo-chertan"],
      ],
    },
    {
      id: "month-09-virgo",
      month: 9,
      title: "Virgo",
      subtitle: "Septiembre · Gran figura dominada por Spica",
      items: [
        { id: "virgo-spica", type: "text", title: "Spica", description: "Estrella principal de Virgo.", x: 62, y: 62 },
        { id: "virgo-zavijava", type: "text", title: "Zavijava", description: "Zona occidental de Virgo.", x: 33, y: 42 },
        { id: "virgo-vindemiatrix", type: "text", title: "Vindemiatrix", description: "Seccion superior del patron.", x: 49, y: 33 },
        { id: "virgo-porrima", type: "text", title: "Porrima", description: "Parte central de la constelacion.", x: 52, y: 49 },
      ],
      connections: [
        ["virgo-zavijava", "virgo-vindemiatrix"],
        ["virgo-vindemiatrix", "virgo-porrima"],
        ["virgo-porrima", "virgo-spica"],
      ],
    },
    {
      id: "month-10-libra",
      month: 10,
      title: "Libra",
      subtitle: "Octubre · La balanza del zodiaco",
      items: [
        { id: "libra-zubenelgenubi", type: "text", title: "Zubenelgenubi", description: "Brazo sur de la balanza.", x: 34, y: 52 },
        { id: "libra-zubeneschamali", type: "text", title: "Zubeneschamali", description: "Brazo norte de Libra.", x: 39, y: 36 },
        { id: "libra-brachium", type: "text", title: "Brachium", description: "Punto oriental del asterismo.", x: 58, y: 39 },
        { id: "libra-uplibrae", type: "text", title: "Upsilon Librae", description: "Extremo inferior oriental.", x: 63, y: 56 },
      ],
      connections: [
        ["libra-zubeneschamali", "libra-zubenelgenubi"],
        ["libra-zubeneschamali", "libra-brachium"],
        ["libra-zubenelgenubi", "libra-uplibrae"],
      ],
    },
    {
      id: "month-11-scorpius",
      month: 11,
      title: "Escorpio",
      subtitle: "Noviembre · Una curva intensa alrededor de Antares",
      items: [
        { id: "scorpius-antares", type: "text", title: "Antares", description: "Corazon rojizo del escorpion.", x: 41, y: 46 },
        { id: "scorpius-shaula", type: "text", title: "Shaula", description: "Punta de la cola.", x: 74, y: 72 },
        { id: "scorpius-lesath", type: "text", title: "Lesath", description: "Vecina del aguijon.", x: 79, y: 66 },
        { id: "scorpius-sargas", type: "text", title: "Sargas", description: "Parte media de la cola.", x: 63, y: 62 },
        { id: "scorpius-dschubba", type: "text", title: "Dschubba", description: "Zona frontal del escorpion.", x: 32, y: 37 },
      ],
      connections: [
        ["scorpius-dschubba", "scorpius-antares"],
        ["scorpius-antares", "scorpius-sargas"],
        ["scorpius-sargas", "scorpius-shaula"],
        ["scorpius-shaula", "scorpius-lesath"],
      ],
    },
    {
      id: "month-12-sagittarius",
      month: 12,
      title: "Sagitario",
      subtitle: "Diciembre · El arquero apuntando al centro galactico",
      items: [
        { id: "sag-kaus-australis", type: "text", title: "Kaus Australis", description: "Base del famoso asterismo de la tetera.", x: 56, y: 62 },
        { id: "sag-kaus-media", type: "text", title: "Kaus Media", description: "Cuerpo central del arquero.", x: 45, y: 49 },
        { id: "sag-nunki", type: "text", title: "Nunki", description: "Zona superior del asterismo.", x: 53, y: 34 },
        { id: "sag-ascella", type: "text", title: "Ascella", description: "Parte interna de la figura.", x: 37, y: 54 },
        { id: "sag-alnasl", type: "text", title: "Alnasl", description: "Punta de la flecha del arquero.", x: 66, y: 46 },
      ],
      connections: [
        ["sag-ascella", "sag-kaus-media"],
        ["sag-kaus-media", "sag-nunki"],
        ["sag-kaus-media", "sag-kaus-australis"],
        ["sag-kaus-media", "sag-alnasl"],
      ],
    },
  ],
};

function cloneData(data) {
  return JSON.parse(JSON.stringify(data));
}

function normalizeConstellation(input, index) {
  const fallbackId = `custom-${index + 1}`;
  const rawItems = Array.isArray(input?.items) ? input.items : [];
  const items = rawItems
    .filter((item) => item && item.id)
    .map((item) => ({
      id: String(item.id),
      type: ["image", "video", "text"].includes(String(item.type)) ? String(item.type) : "text",
      title: String(item.title || "Sin titulo"),
      description: String(item.description || ""),
      url: item.url ? String(item.url) : "",
      x: Number.isFinite(Number(item.x)) ? Number(item.x) : 50,
      y: Number.isFinite(Number(item.y)) ? Number(item.y) : 50,
    }));

  const validIds = new Set(items.map((item) => item.id));
  const connections = Array.isArray(input?.connections)
    ? input.connections
        .filter((pair) => Array.isArray(pair) && pair.length === 2)
        .map((pair) => [String(pair[0]), String(pair[1])])
        .filter(([fromId, toId]) => validIds.has(fromId) && validIds.has(toId) && fromId !== toId)
    : [];

  return {
    id: input?.id ? String(input.id) : fallbackId,
    month: Number.isInteger(input?.month) ? input.month : undefined,
    title: String(input?.title || `Constelacion ${index + 1}`),
    subtitle: String(input?.subtitle || ""),
    items,
    connections,
  };
}

function mergeConstellationItems(baseItems, userItems) {
  const mergedById = new Map((baseItems || []).map((item) => [item.id, cloneData(item)]));

  (userItems || []).forEach((item) => {
    mergedById.set(item.id, cloneData(item));
  });

  return Array.from(mergedById.values());
}

function mergeProjectConstellations(baseData, userData) {
  const baseList = Array.isArray(baseData?.constellations) ? baseData.constellations : [];
  const userList = Array.isArray(userData?.constellations)
    ? userData.constellations.map((constellation, index) => normalizeConstellation(constellation, index))
    : [];

  const mergedById = new Map(baseList.map((constellation) => [constellation.id, cloneData(constellation)]));

  userList.forEach((userConstellation) => {
    const existing = mergedById.get(userConstellation.id);

    if (!existing) {
      mergedById.set(userConstellation.id, cloneData(userConstellation));
      return;
    }

    const mergedItems = mergeConstellationItems(existing.items, userConstellation.items);
    const mergedItemIds = new Set(mergedItems.map((item) => item.id));
    const effectiveConnections =
      Array.isArray(userConstellation.connections) && userConstellation.connections.length > 0
        ? userConstellation.connections
        : existing.connections || [];

    mergedById.set(userConstellation.id, {
      ...existing,
      ...userConstellation,
      items: mergedItems,
      connections: effectiveConnections.filter(
        (pair) => Array.isArray(pair) && pair.length === 2 && mergedItemIds.has(pair[0]) && mergedItemIds.has(pair[1]),
      ),
    });
  });

  return {
    constellations: Array.from(mergedById.values()),
  };
}

export const DEFAULT_CONSTELLATIONS = mergeProjectConstellations(BASE_CONSTELLATIONS, USER_CONSTELLATIONS);

export function mergeMissingDefaultConstellations(data) {
  const currentConstellations = Array.isArray(data?.constellations) ? data.constellations : [];
  const currentIds = new Set(currentConstellations.map((constellation) => constellation.id));
  const missingConstellations = DEFAULT_CONSTELLATIONS.constellations.filter(
    (constellation) => !currentIds.has(constellation.id),
  );

  if (missingConstellations.length === 0) {
    return { merged: data, hasChanges: false };
  }

  return {
    merged: {
      constellations: [...currentConstellations, ...JSON.parse(JSON.stringify(missingConstellations))],
    },
    hasChanges: true,
  };
}

const DEFAULT_CONSTELLATION_BY_ID = new Map(
  DEFAULT_CONSTELLATIONS.constellations.map((constellation) => [constellation.id, constellation]),
);

const DEFAULT_MEMORY_IDS_BY_CONSTELLATION = new Map(
  DEFAULT_CONSTELLATIONS.constellations.map((constellation) => [
    constellation.id,
    new Set((constellation.items || []).map((item) => item.id)),
  ]),
);

export function isDefaultConstellationMemory(constellationId, memoryId) {
  const memoryIds = DEFAULT_MEMORY_IDS_BY_CONSTELLATION.get(constellationId);
  if (!memoryIds) {
    return false;
  }

  return memoryIds.has(memoryId);
}

function createConnectionKey(fromId, toId) {
  return `${fromId}::${toId}`;
}

export function mergeMissingDefaultConstellationItems(data) {
  const currentConstellations = Array.isArray(data?.constellations) ? data.constellations : [];
  let hasChanges = false;

  const mergedConstellations = currentConstellations.map((constellation) => {
    const defaultConstellation = DEFAULT_CONSTELLATION_BY_ID.get(constellation.id);

    if (!defaultConstellation) {
      return constellation;
    }

    const currentItems = Array.isArray(constellation.items) ? constellation.items : [];
    const currentItemIds = new Set(currentItems.map((item) => item.id));
    const missingItems = (defaultConstellation.items || []).filter(
      (item) => !currentItemIds.has(item.id),
    );

    const mergedItems =
      missingItems.length > 0
        ? [...currentItems, ...JSON.parse(JSON.stringify(missingItems))]
        : currentItems;

    const currentConnections = Array.isArray(constellation.connections)
      ? constellation.connections
          .filter((pair) => Array.isArray(pair) && pair.length === 2)
          .map((pair) => [String(pair[0]), String(pair[1])])
      : [];

    const connectionKeys = new Set(
      currentConnections.map((pair) => createConnectionKey(pair[0], pair[1])),
    );

    const missingConnections = (defaultConstellation.connections || []).filter((pair) => {
      if (!Array.isArray(pair) || pair.length !== 2) {
        return false;
      }

      return !connectionKeys.has(createConnectionKey(pair[0], pair[1]));
    });

    if (missingItems.length === 0 && missingConnections.length === 0) {
      return constellation;
    }

    hasChanges = true;

    return {
      ...constellation,
      items: mergedItems,
      connections:
        missingConnections.length > 0
          ? [...currentConnections, ...JSON.parse(JSON.stringify(missingConnections))]
          : currentConnections,
    };
  });

  if (!hasChanges) {
    return { merged: data, hasChanges: false };
  }

  return {
    merged: {
      constellations: mergedConstellations,
    },
    hasChanges: true,
  };
}
