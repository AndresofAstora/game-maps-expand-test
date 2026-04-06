const body = document.body;
const stageGrid = document.getElementById("stageGrid");
const gameTitle = document.getElementById("gameTitle");
const registryId = body.dataset.registry;

if (stageGrid && registryId) {
    loadGameRegistry(registryId);
}

async function loadGameRegistry(id) {
    const registry = await import(`./registries/${id}-registry.js`);
    const { GAME_INFO, MAP_CATALOG, STAGE_ORDER, getMapImageUrl } = registry;

    if (gameTitle) {
        gameTitle.textContent = GAME_INFO.title;
        document.title = `${GAME_INFO.title} | Videogame Cartography`;
    }

    if (!MAP_CATALOG.length) {
        stageGrid.innerHTML = `
            <div class="empty-state shell-panel">
                No maps have been added for this game yet. Add map images under <code>assets/${GAME_INFO.gameId}/maps</code>
                and marker data in <code>js/registries/${GAME_INFO.gameId}-registry.js</code>.
            </div>
        `;
        return;
    }

    const orderedMaps = (STAGE_ORDER.length ? STAGE_ORDER.map((mapId) => MAP_CATALOG.find((map) => map.id === mapId)) : MAP_CATALOG)
        .filter(Boolean);

    stageGrid.innerHTML = orderedMaps.map((map) => `
        <article class="stage-card stage-card--minimal">
            <a class="stage-card__link" href="${map.page}" aria-label="${map.title}">
                <div class="stage-card__art" style="background-image: url('${getMapImageUrl(map)}');"></div>
                <div class="stage-card__body stage-card__body--minimal">
                    <h2 class="stage-card__title">${map.title}</h2>
                </div>
            </a>
        </article>
    `).join("");
}
