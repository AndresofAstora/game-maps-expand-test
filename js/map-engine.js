const body = document.body;
const registryId = body.dataset.registry ?? "megabyte-punch";
const mapId = body.dataset.mapId ?? "";

const backLink = document.querySelector(".back-link");
const mapTitle = document.getElementById("mapTitle");
const mapNote = document.getElementById("mapNote");
const mapViewport = document.getElementById("mapViewport");
const mapCanvas = document.getElementById("mapCanvas");
const mapImage = document.getElementById("mapImage");
const markerLayer = document.getElementById("markerLayer");
const legendContent = document.getElementById("legendContent");
const coordsReadout = document.getElementById("coordsReadout");
const zoomInButton = document.getElementById("zoomInButton");
const zoomOutButton = document.getElementById("zoomOutButton");
const fitButton = document.getElementById("fitButton");
const markerTooltip = document.createElement("div");

const viewState = {
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    pointerId: null,
    startX: 0,
    startY: 0,
    dragOriginX: 0,
    dragOriginY: 0,
    moved: false
};

let GAME_INFO;
let MARKER_TYPES;
let getMapById;
let getMarkerCounts;
let getMapImageUrl;
let getMarkerIconUrl;
let map;

markerTooltip.className = "marker-tooltip";
markerTooltip.hidden = true;
mapViewport?.appendChild(markerTooltip);

init();

async function init() {
    const registry = await import(`./registries/${registryId}-registry.js`);
    GAME_INFO = registry.GAME_INFO;
    MARKER_TYPES = registry.MARKER_TYPES;
    getMapById = registry.getMapById;
    getMarkerCounts = registry.getMarkerCounts;
    getMapImageUrl = registry.getMapImageUrl;
    getMarkerIconUrl = registry.getMarkerIconUrl;
    map = getMapById(mapId);

    if (backLink && GAME_INFO?.page) {
        backLink.href = `../${GAME_INFO.page}`;
    }

    if (!map) {
        document.title = `Map Not Found | ${GAME_INFO?.title ?? "Videogame Cartography"}`;
        if (mapTitle) {
            mapTitle.textContent = "Map not found";
        }
        if (mapNote) {
            mapNote.textContent = "Check the map id in the page markup.";
        }
        return;
    }

    bootstrap();
}

function bootstrap() {
    const markerCounts = getMarkerCounts(map);
    const totalMarkers = map.markers.length;

    document.title = `${map.title} | ${GAME_INFO.title} | Videogame Cartography`;
    mapTitle.textContent = map.title;
    mapImage.src = getMapImageUrl(map);
    mapImage.alt = `${map.title} map image`;

    if (totalMarkers > 0) {
        mapNote.textContent = `${totalMarkers} markers loaded. Click the map to copy coordinates.`;
    } else {
        mapNote.textContent = "This map page is ready. Marker coordinates have not been added yet.";
    }

    renderLegend(markerCounts);
    renderMarkers();
    wireControls();

    mapImage.addEventListener("load", fitMapToViewport, { once: true });
    mapImage.addEventListener("error", () => {
        mapNote.textContent = "The map image could not be loaded. Check the asset path for this stage.";
    }, { once: true });
}

function renderLegend(markerCounts) {
    if (!map.markers.length) {
        legendContent.innerHTML = `
            <div class="legend-empty">
                No marker overlay is available for this stage yet.
            </div>
        `;
        return;
    }

    const rows = MARKER_TYPES.filter((type) => markerCounts[type.id]).map((type) => `
        <label class="legend-row">
            <span class="legend-label">
                <img src="${getMarkerIconUrl(type.id)}" alt="">
                <span>${type.label}</span>
            </span>
            <span class="legend-count">${markerCounts[type.id]}</span>
            <input class="legend-checkbox" type="checkbox" data-marker-type="${type.id}" checked>
        </label>
    `).join("");

    legendContent.innerHTML = `
        <div class="legend-list">${rows}</div>
        <div class="legend-actions">
            <button type="button" class="toggle-button" id="toggleAllButton">Toggle All</button>
        </div>
    `;

    legendContent.querySelectorAll("[data-marker-type]").forEach((input) => {
        input.addEventListener("change", () => {
            const type = input.dataset.markerType;
            markerLayer.querySelectorAll(`[data-marker-type="${type}"]`).forEach((markerElement) => {
                markerElement.hidden = !input.checked;
            });
        });
    });

    document.getElementById("toggleAllButton")?.addEventListener("click", toggleAllMarkers);
}

function renderMarkers() {
    markerLayer.innerHTML = "";
    markerLayer.style.width = `${mapImage.naturalWidth || 0}px`;
    markerLayer.style.height = `${mapImage.naturalHeight || 0}px`;

    map.markers.forEach((marker) => {
        const markerElement = document.createElement("div");
        markerElement.className = "marker";
        markerElement.dataset.markerType = marker.type;
        markerElement.style.left = `${marker.x}px`;
        markerElement.style.top = `${marker.y}px`;
        markerElement.style.backgroundImage = `url('${getMarkerIconUrl(marker.type)}')`;

        if (marker.tooltip) {
            markerElement.classList.add("marker--interactive");
            markerElement.addEventListener("pointerenter", (event) => showMarkerTooltip(marker.tooltip, event));
            markerElement.addEventListener("pointermove", (event) => moveMarkerTooltip(event));
            markerElement.addEventListener("pointerleave", hideMarkerTooltip);
            markerElement.addEventListener("pointerdown", (event) => {
                event.stopPropagation();
            });
            markerElement.addEventListener("pointerup", (event) => {
                event.stopPropagation();
            });
        }

        markerLayer.appendChild(markerElement);
    });
}

function setAllMarkers(checked) {
    legendContent.querySelectorAll("[data-marker-type]").forEach((input) => {
        input.checked = checked;
        input.dispatchEvent(new Event("change"));
    });
}

function toggleAllMarkers() {
    const inputs = [...legendContent.querySelectorAll("[data-marker-type]")];
    const allChecked = inputs.every((input) => input.checked);
    setAllMarkers(!allChecked);
}

function wireControls() {
    const uiControls = [zoomInButton, zoomOutButton, fitButton].filter(Boolean);

    uiControls.forEach((control) => {
        control.addEventListener("pointerdown", (event) => {
            event.stopPropagation();
        });
        control.addEventListener("click", (event) => {
            event.stopPropagation();
        });
    });

    zoomInButton?.addEventListener("click", () => zoomAtViewportCenter(1.2));
    zoomOutButton?.addEventListener("click", () => zoomAtViewportCenter(0.82));
    fitButton?.addEventListener("click", fitMapToViewport);

    mapViewport.addEventListener("wheel", (event) => {
        event.preventDefault();
        const factor = event.deltaY < 0 ? 1.12 : 0.9;
        zoomAtClientPoint(factor, event.clientX, event.clientY);
    }, { passive: false });

    mapViewport.addEventListener("pointerdown", (event) => {
        if (event.button !== 0) {
            return;
        }

        if (isUiTarget(event.target)) {
            return;
        }

        viewState.pointerId = event.pointerId;
        viewState.startX = event.clientX;
        viewState.startY = event.clientY;
        viewState.dragOriginX = viewState.offsetX;
        viewState.dragOriginY = viewState.offsetY;
        viewState.moved = false;
        mapViewport.classList.add("is-dragging");
        mapViewport.setPointerCapture(event.pointerId);
    });

    mapViewport.addEventListener("pointermove", (event) => {
        updateCoords(event.clientX, event.clientY);

        if (viewState.pointerId !== event.pointerId) {
            return;
        }

        const deltaX = event.clientX - viewState.startX;
        const deltaY = event.clientY - viewState.startY;
        if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
            viewState.moved = true;
        }

        viewState.offsetX = viewState.dragOriginX + deltaX;
        viewState.offsetY = viewState.dragOriginY + deltaY;
        applyTransform();
    });

    mapViewport.addEventListener("pointerup", (event) => {
        if (viewState.pointerId !== event.pointerId) {
            return;
        }

        mapViewport.classList.remove("is-dragging");
        mapViewport.releasePointerCapture(event.pointerId);
        viewState.pointerId = null;

        if (!viewState.moved) {
            copyCoords(event.clientX, event.clientY);
        }
    });

    mapViewport.addEventListener("pointerleave", () => {
        coordsReadout.textContent = "X: 0 Y: 0";
    });
}

function fitMapToViewport() {
    if (!mapImage.naturalWidth || !mapImage.naturalHeight) {
        return;
    }

    markerLayer.style.width = `${mapImage.naturalWidth}px`;
    markerLayer.style.height = `${mapImage.naturalHeight}px`;

    const bounds = mapViewport.getBoundingClientRect();
    const padding = 40;
    const availableWidth = Math.max(bounds.width - padding, 100);
    const availableHeight = Math.max(bounds.height - padding, 100);
    const nextScale = Math.min(availableWidth / mapImage.naturalWidth, availableHeight / mapImage.naturalHeight, 1.6);

    viewState.scale = clamp(nextScale, 0.14, 5);
    viewState.offsetX = (bounds.width - mapImage.naturalWidth * viewState.scale) / 2;
    viewState.offsetY = (bounds.height - mapImage.naturalHeight * viewState.scale) / 2;
    applyTransform();
}

function zoomAtViewportCenter(factor) {
    const bounds = mapViewport.getBoundingClientRect();
    zoomAtClientPoint(factor, bounds.left + bounds.width / 2, bounds.top + bounds.height / 2);
}

function zoomAtClientPoint(factor, clientX, clientY) {
    const bounds = mapViewport.getBoundingClientRect();
    const viewportX = clientX - bounds.left;
    const viewportY = clientY - bounds.top;
    const mapX = (viewportX - viewState.offsetX) / viewState.scale;
    const mapY = (viewportY - viewState.offsetY) / viewState.scale;
    const nextScale = clamp(viewState.scale * factor, 0.14, 5);

    viewState.scale = nextScale;
    viewState.offsetX = viewportX - mapX * viewState.scale;
    viewState.offsetY = viewportY - mapY * viewState.scale;
    applyTransform();
}

function applyTransform() {
    mapCanvas.style.transform = `translate(${viewState.offsetX}px, ${viewState.offsetY}px) scale(${viewState.scale})`;
}

function updateCoords(clientX, clientY) {
    const bounds = mapViewport.getBoundingClientRect();
    const x = Math.round((clientX - bounds.left - viewState.offsetX) / viewState.scale);
    const y = Math.round((clientY - bounds.top - viewState.offsetY) / viewState.scale);
    coordsReadout.textContent = `X: ${x} Y: ${y}`;
}

function copyCoords(clientX, clientY) {
    const bounds = mapViewport.getBoundingClientRect();
    const x = Math.round((clientX - bounds.left - viewState.offsetX) / viewState.scale);
    const y = Math.round((clientY - bounds.top - viewState.offsetY) / viewState.scale);
    const text = `x:${x}, y:${y}`;

    if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(text).then(() => {
            mapNote.textContent = `Copied ${text} to the clipboard.`;
        }).catch(() => {
            mapNote.textContent = `Coordinate copy failed. Manual value: ${text}`;
        });
    } else {
        mapNote.textContent = `Clipboard access is unavailable. Manual value: ${text}`;
    }
}

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

function isUiTarget(target) {
    return target instanceof Element && Boolean(target.closest(".zoom-stack, .legend-panel, .back-link, .marker--interactive, .marker-tooltip"));
}

function showMarkerTooltip(text, event) {
    markerTooltip.textContent = text;
    markerTooltip.hidden = false;
    moveMarkerTooltip(event);
}

function moveMarkerTooltip(event) {
    const bounds = mapViewport.getBoundingClientRect();
    const left = Math.min(Math.max(event.clientX - bounds.left, 28), bounds.width - 28);
    const top = Math.min(Math.max(event.clientY - bounds.top - 12, 24), bounds.height - 24);

    markerTooltip.style.left = `${left}px`;
    markerTooltip.style.top = `${top}px`;
}

function hideMarkerTooltip() {
    markerTooltip.hidden = true;
}
