export const MARKER_TYPES = [
    { id: "start", label: "Start" },
    { id: "checkpoint", label: "Checkpoint" },
    { id: "bit-chest", label: "Bit Chest" },
    { id: "part-chest", label: "Part Chest" },
    { id: "color-capsule", label: "Color Capsule" },
    { id: "stage-exit", label: "Stage Exit" }
];

const DEFAULT_MARKER_ICON_FILES = {
    start: "marker-start.png",
    checkpoint: "marker- checkpoint.png",
    "bit-chest": "marker-bitchest.png",
    "part-chest": "marker-partchest.png",
    "color-capsule": "marker-colorcapsule.png",
    "stage-exit": "marker-end.png"
};

export function createGameRegistry({ gameId, title, page, maps = [], stageOrder = [], markerIconFiles = DEFAULT_MARKER_ICON_FILES }) {
    const GAME_INFO = { gameId, title, page };
    const MAP_CATALOG = maps;
    const STAGE_ORDER = stageOrder;

    function getMapById(id) {
        return MAP_CATALOG.find((map) => map.id === id) ?? null;
    }

    function getMarkerCounts(map) {
        return map.markers.reduce((counts, marker) => {
            counts[marker.type] = (counts[marker.type] ?? 0) + 1;
            return counts;
        }, {});
    }

    function getMapImageUrl(map) {
        return new URL(`../../assets/${gameId}/maps/${map.image}`, import.meta.url).href;
    }

    function getMarkerIconUrl(type) {
        const filename = markerIconFiles[type];
        return filename ? new URL(`../../assets/${gameId}/markers/${filename}`, import.meta.url).href : "";
    }

    return {
        GAME_INFO,
        MARKER_TYPES,
        MAP_CATALOG,
        STAGE_ORDER,
        getMapById,
        getMarkerCounts,
        getMapImageUrl,
        getMarkerIconUrl
    };
}
