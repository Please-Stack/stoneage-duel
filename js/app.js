const PASSWORD_ENABLED = true;
const SITE_PASSWORD_HASH = "d4410a4a8b036eebd3fe99d7eefc5fc64a22c1b440999fadbdc60a8ac6de8fd2"; // 기본 비밀번호: stoneage
const ACCESS_STORAGE_KEY = "stoneage_duel_access_ok";

let petData = [];
let opponentData = [];

window.addEventListener("DOMContentLoaded", () => {
    initPasswordGate();
    setupEnterKeySearch();
    loadPets();
    loadOpponents();
});

function initPasswordGate() {
    const app = document.getElementById("app");
    const lockScreen = document.getElementById("lockScreen");
    const form = document.getElementById("passwordForm");

    if (!PASSWORD_ENABLED) {
        lockScreen.classList.add("hidden");
        app.classList.remove("hidden");
        return;
    }

    if (localStorage.getItem(ACCESS_STORAGE_KEY) === "1") {
        lockScreen.classList.add("hidden");
        app.classList.remove("hidden");
    }

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const input = document.getElementById("passwordInput");
        const remember = document.getElementById("rememberAccess");
        const error = document.getElementById("passwordError");
        const hash = await sha256(input.value);

        if (hash === SITE_PASSWORD_HASH) {
            if (remember.checked) {
                localStorage.setItem(ACCESS_STORAGE_KEY, "1");
            }

            input.value = "";
            error.textContent = "";
            lockScreen.classList.add("hidden");
            app.classList.remove("hidden");
            document.getElementById("pName")?.focus();
        } else {
            error.textContent = "비밀번호가 맞지 않습니다.";
            input.select();
        }
    });
}

async function sha256(text) {
    const data = new TextEncoder().encode(text);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);

    return Array.from(new Uint8Array(hashBuffer))
        .map(byte => byte.toString(16).padStart(2, "0"))
        .join("");
}

function lockSite() {
    localStorage.removeItem(ACCESS_STORAGE_KEY);
    document.getElementById("app").classList.add("hidden");
    document.getElementById("lockScreen").classList.remove("hidden");
    document.getElementById("passwordInput").focus();
}

function setupEnterKeySearch() {
    document.querySelectorAll("#petTab input, #petTab select").forEach(element => {
        element.addEventListener("keydown", event => {
            if (event.key === "Enter") {
                event.preventDefault();
                searchPets();
            }
        });
    });

    document.querySelectorAll("#opponentTab input, #opponentTab select").forEach(element => {
        element.addEventListener("keydown", event => {
            if (event.key === "Enter") {
                event.preventDefault();
                searchOpponents();
            }
        });
    });
}

function switchTab(tabName) {
    document.querySelectorAll(".tab-button").forEach(button => {
        button.classList.toggle("active", button.dataset.tab === tabName);
    });

    document.querySelectorAll(".tab-panel").forEach(panel => {
        panel.classList.remove("active");
    });

    if (tabName === "pet") {
        document.getElementById("petTab").classList.add("active");
        document.getElementById("pName")?.focus();
        return;
    }

    if (tabName === "opponent") {
        document.getElementById("opponentTab").classList.add("active");
        document.getElementById("opponentTribe")?.focus();

        const resultArea = document.getElementById("opponentResultArea");
        if (opponentData.length && !resultArea.innerHTML.trim()) {
            searchOpponents();
        }
    }
}

async function loadPets() {
    const summaryArea = document.getElementById("summaryArea");
    const resultArea = document.getElementById("resultArea");

    summaryArea.innerHTML = `<div class="summary-box">페트 데이터를 불러오는 중입니다...</div>`;

    try {
        const response = await fetch("./data/pets.json");
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        petData = await response.json();

        summaryArea.innerHTML = `
            <div class="summary-box">
                페트 데이터 <strong>${petData.length}</strong>개를 불러왔습니다. 조건을 입력하고 검색하세요.
            </div>
        `;
        resultArea.innerHTML = "";
    } catch (error) {
        console.error("페트 데이터 로딩 실패:", error);
        summaryArea.innerHTML = "";
        resultArea.innerHTML = `
            <div class="message-box">
                data/pets.json 파일을 불러오지 못했습니다.<br>
                로컬에서 직접 열었다면 VS Code Live Server 또는 GitHub Pages로 확인해주세요.
            </div>
        `;
    }
}

async function loadOpponents() {
    const summaryArea = document.getElementById("opponentSummaryArea");
    const resultArea = document.getElementById("opponentResultArea");

    if (!summaryArea || !resultArea) {
        return;
    }

    summaryArea.innerHTML = `<div class="summary-box">상대팀 정보를 불러오는 중입니다...</div>`;

    try {
        const response = await fetch("./data/opponents.json");
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        opponentData = await response.json();

        summaryArea.innerHTML = `
            <div class="summary-box">
                상대팀 정보 <strong>${opponentData.length}</strong>개를 불러왔습니다.
            </div>
        `;
        resultArea.innerHTML = "";
    } catch (error) {
        console.error("상대팀 정보 로딩 실패:", error);
        summaryArea.innerHTML = "";
        resultArea.innerHTML = `
            <div class="message-box">
                data/opponents.json 파일을 불러오지 못했습니다.
            </div>
        `;
    }
}

function searchPets() {
    const summaryArea = document.getElementById("summaryArea");
    const resultArea = document.getElementById("resultArea");

    if (!petData.length) {
        resultArea.innerHTML = `<div class="message-box">아직 페트 데이터가 로딩되지 않았습니다.</div>`;
        return;
    }

    const filters = {
        name: getInputValue("pName").toLowerCase(),
        지: getRangeFilter("minJi", "maxJi"),
        수: getRangeFilter("minSu", "maxSu"),
        화: getRangeFilter("minHwa", "maxHwa"),
        풍: getRangeFilter("minPung", "maxPung"),
        atk: getRangeFilter("minAtk", "maxAtk"),
        def: getRangeFilter("minDef", "maxDef"),
        agi: getRangeFilter("minAgi", "maxAgi"),
        hp: getRangeFilter("minHp", "maxHp"),
        total: getRangeFilter("minTotal", "maxTotal"),
        ride: getInputValue("rideFilter")
    };

    const sortMetric = getSelectedSortMetric();
    const sortOrder = getInputValue("sortOrder") || "desc";
    const sortLabel = getPetSortLabel(sortMetric);
    const sortOrderLabel = sortOrder === "asc" ? "낮은순" : "높은순";

    const filtered = petData
        .filter(pet => {
            const matchName = safeText(pet.name).includes(filters.name);
            const matchRide = filters.ride === "" || safeText(pet.ride).includes(filters.ride.toLowerCase());

            return matchName &&
                matchRide &&
                isInRange(pet.elem?.지, filters.지) &&
                isInRange(pet.elem?.수, filters.수) &&
                isInRange(pet.elem?.화, filters.화) &&
                isInRange(pet.elem?.풍, filters.풍) &&
                isInRange(pet.stats?.atk, filters.atk) &&
                isInRange(pet.stats?.def, filters.def) &&
                isInRange(pet.stats?.agi, filters.agi) &&
                isInRange(pet.stats?.hp, filters.hp) &&
                isInRange(pet.total, filters.total);
        })
        .sort((a, b) => {
            const aValue = Number(getPetValueByPath(a, sortMetric) || 0);
            const bValue = Number(getPetValueByPath(b, sortMetric) || 0);

            return sortOrder === "asc" ? aValue - bValue : bValue - aValue;
        });

    if (filtered.length === 0) {
        summaryArea.innerHTML = "";
        resultArea.innerHTML = `<div class="message-box">검색 결과가 없습니다.</div>`;
        return;
    }

    summaryArea.innerHTML = `
        <div class="summary-box">
            검색 결과: <strong>${filtered.length}</strong>개 ·
            정렬: <strong>${escapeHtml(sortLabel)} ${escapeHtml(sortOrderLabel)}</strong>
        </div>
    `;

    resultArea.innerHTML = filtered.map(renderPetCard).join("");
}

function searchOpponents() {
    const summaryArea = document.getElementById("opponentSummaryArea");
    const resultArea = document.getElementById("opponentResultArea");

    if (!opponentData.length) {
        summaryArea.innerHTML = "";
        resultArea.innerHTML = `<div class="message-box">아직 상대팀 정보가 없습니다.</div>`;
        return;
    }

    const tribe = getInputValue("opponentTribe").toLowerCase();
    const nicknameQueries = getOpponentNicknameQueries();
    const element = getInputValue("opponentElement");
    const speedRange = getRangeFilter("opponentSpeedMin", "opponentSpeedMax");

    const filtered = opponentData
        .filter(opponent => {
            const opponentNickname = safeText(opponent.nickname);
            const matchTribe = safeText(opponent.tribe).includes(tribe);
            const matchNickname = nicknameQueries.length === 0 ||
                nicknameQueries.some(query => opponentNickname.includes(query));
            const matchElement = element === "" || Number(opponent.elements?.[element] || 0) > 0;
            const matchSpeed = isInRange(opponent.expectedSpeed, speedRange);

            return matchTribe && matchNickname && matchElement && matchSpeed;
        })
        .sort((a, b) => {
            if (nicknameQueries.length > 0) {
                const aOrder = getOpponentNicknameOrder(a.nickname, nicknameQueries);
                const bOrder = getOpponentNicknameOrder(b.nickname, nicknameQueries);

                if (aOrder !== bOrder) {
                    return aOrder - bOrder;
                }
            }

            return Number(b.expectedSpeed || 0) - Number(a.expectedSpeed || 0);
        });

    if (filtered.length === 0) {
        summaryArea.innerHTML = "";
        resultArea.innerHTML = `<div class="message-box">검색 결과가 없습니다.</div>`;
        return;
    }

    const missingNicknames = getMissingOpponentNicknames(nicknameQueries, filtered);

    summaryArea.innerHTML = `
        <div class="summary-box">
            상대팀 검색 결과: <strong>${filtered.length}</strong>개
            ${missingNicknames.length ? `<br>미확인 닉네임: <strong>${escapeHtml(missingNicknames.join(", "))}</strong>` : ""}
        </div>
    `;

    resultArea.innerHTML = filtered.map(renderOpponentCard).join("");
}

function resetSearch() {
    document.querySelectorAll("#petTab .search-panel input").forEach(input => input.value = "");
    document.querySelectorAll("#petTab .search-panel select").forEach(select => select.selectedIndex = 0);

    document.getElementById("summaryArea").innerHTML = `
        <div class="summary-box">
            페트 데이터 <strong>${petData.length}</strong>개를 불러왔습니다. 조건을 입력하고 검색하세요.
        </div>
    `;
    document.getElementById("resultArea").innerHTML = "";
    document.getElementById("pName").focus();
}

function resetOpponentSearch() {
    document.querySelectorAll("#opponentTab .search-panel input").forEach(input => input.value = "");
    document.querySelectorAll("#opponentTab .search-panel select").forEach(select => select.selectedIndex = 0);

    document.getElementById("opponentSummaryArea").innerHTML = `
        <div class="summary-box">
            상대팀 정보 <strong>${opponentData.length}</strong>개를 불러왔습니다.
        </div>
    `;
    document.getElementById("opponentResultArea").innerHTML = "";
    document.getElementById("opponentTribe").focus();
}

function renderPetCard(pet) {
    const elemHtml = Object.entries(pet.elem || {})
        .filter(([, value]) => Number(value) > 0)
        .map(([key, value]) => `<span class="elem-badge bg-${escapeHtml(key)}">${escapeHtml(key)} ${escapeHtml(value)}</span>`)
        .join("");

    const meta = [
        pet.ride ? `탑승: ${pet.ride}` : "",
        pet.grade ? `등급: ${pet.grade}` : ""
    ].filter(Boolean).join(" · ");

    return `
        <article class="card">
            <div class="total-badge">${escapeHtml(formatNumber(pet.total))}</div>

            <div class="card-head">
                ${renderThumb(pet)}
                <div>
                    <div class="pet-name">${escapeHtml(pet.name || "")}</div>
                    <div class="pet-sub">${escapeHtml(pet.sub || "")}</div>
                    ${meta ? `<div class="pet-meta">${escapeHtml(meta)}</div>` : ""}
                </div>
            </div>

            <div class="elem-list">${elemHtml}</div>

            <div class="stat-section">
                <div>
                    <div class="stat-row-label">📈 성장률</div>
                    <div class="stat-grid">
                        ${renderStat("공", pet.stats?.atk)}
                        ${renderStat("방", pet.stats?.def)}
                        ${renderStat("순", pet.stats?.agi)}
                        ${renderStat("체", pet.stats?.hp)}
                    </div>
                </div>

                <div>
                    <div class="stat-row-label">👶 초기치</div>
                    <div class="stat-grid">
                        ${renderStat("공", pet.init?.atk)}
                        ${renderStat("방", pet.init?.def)}
                        ${renderStat("순", pet.init?.agi)}
                        ${renderStat("체", pet.init?.hp)}
                    </div>
                </div>
            </div>

            ${pet.source ? `<a class="source-link" href="${escapeHtml(pet.source)}" target="_blank" rel="noopener">원본 보기</a>` : ""}
        </article>
    `;
}

function renderOpponentCard(opponent) {
    const elements = opponent.elements || {};
    const dominant = getDominantElement(elements);

    return `
        <article class="card opponent-card">
            <div class="opponent-head">
                <div>
                    <div class="opponent-title">${escapeHtml(opponent.nickname || "-")}</div>
                    <div class="opponent-sub">부족: ${escapeHtml(opponent.tribe || "-")}</div>
                    <div class="opponent-sub">주속성: ${escapeHtml(dominant)}</div>
                </div>

                <div class="opponent-speed">
                    예상 순
                    <strong>${escapeHtml(formatNumber(opponent.expectedSpeed))}</strong>
                </div>
            </div>

            <div class="elem-list">
                ${renderOpponentElement("지", elements["지"])}
                ${renderOpponentElement("수", elements["수"])}
                ${renderOpponentElement("화", elements["화"])}
                ${renderOpponentElement("풍", elements["풍"])}
            </div>
        </article>
    `;
}

function renderStat(label, value) {
    return `
        <div class="stat-val">
            <span class="stat-label">${escapeHtml(label)}</span>
            <span class="stat-num">${escapeHtml(formatNumber(value))}</span>
        </div>
    `;
}

function renderOpponentElement(label, value) {
    return `<span class="elem-badge bg-${escapeHtml(label)}">${escapeHtml(label)} ${escapeHtml(value || 0)}</span>`;
}

function renderThumb(pet) {
    const imageUrl = pet?.imageUrl || pet?.img || pet?.image || pet?.thumb || pet?.thumbnail || "";
    const emoji = pet?.emoji || "🐾";
    const name = pet?.name || "페트";

    if (!imageUrl) {
        return `
            <div class="thumb-wrap">
                <span class="fallback-emoji">${escapeHtml(emoji)}</span>
            </div>
        `;
    }

    return `
        <div class="thumb-wrap">
            <img
                class="thumb-img"
                src="${escapeHtml(imageUrl)}"
                alt="${escapeHtml(name)}"
                loading="lazy"
                onerror="this.style.display='none'; this.nextElementSibling.style.display='block';"
            >
            <span class="fallback-emoji" style="display:none;">${escapeHtml(emoji)}</span>
        </div>
    `;
}

function getSelectedSortMetric() {
    const selected = getInputValue("sortMetric");
    if (selected && selected !== "auto") {
        return selected;
    }

    const candidates = [
        ["minTotal", "maxTotal", "total"],
        ["minAtk", "maxAtk", "stats.atk"],
        ["minDef", "maxDef", "stats.def"],
        ["minAgi", "maxAgi", "stats.agi"],
        ["minHp", "maxHp", "stats.hp"],
        ["minJi", "maxJi", "elem.지"],
        ["minSu", "maxSu", "elem.수"],
        ["minHwa", "maxHwa", "elem.화"],
        ["minPung", "maxPung", "elem.풍"]
    ];

    const matched = candidates.find(([minId, maxId]) => {
        return getInputValue(minId) !== "" || getInputValue(maxId) !== "";
    });

    return matched ? matched[2] : "total";
}

function getPetValueByPath(pet, path) {
    return path.split(".").reduce((current, key) => {
        return current && current[key] !== undefined ? current[key] : 0;
    }, pet);
}

function getPetSortLabel(metric) {
    const labels = {
        total: "전체 성장",
        "stats.atk": "공 성장",
        "stats.def": "방 성장",
        "stats.agi": "순 성장",
        "stats.hp": "체 성장",
        "elem.지": "지속성",
        "elem.수": "수속성",
        "elem.화": "화속성",
        "elem.풍": "풍속성"
    };

    return labels[metric] || metric;
}

function getDominantElement(elements) {
    const entries = Object.entries(elements || {})
        .map(([key, value]) => [key, Number(value || 0)])
        .filter(([, value]) => value > 0)
        .sort((a, b) => b[1] - a[1]);

    if (!entries.length) {
        return "-";
    }

    return `${entries[0][0]} ${entries[0][1]}`;
}

function getRangeFilter(minId, maxId) {
    return {
        min: getNullableNumberValue(minId),
        max: getNullableNumberValue(maxId)
    };
}

function getNullableNumberValue(id) {
    const raw = getInputValue(id);
    if (raw === "") {
        return null;
    }

    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
}

function isInRange(value, range) {
    const number = Number(value || 0);

    if (range.min !== null && number < range.min) {
        return false;
    }

    if (range.max !== null && number > range.max) {
        return false;
    }

    return true;
}

function getInputValue(id) {
    return String(document.getElementById(id)?.value ?? "").trim();
}

function safeText(value) {
    return String(value ?? "").toLowerCase();
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function formatNumber(value) {
    if (value === null || value === undefined || value === "") {
        return "-";
    }

    const number = Number(value);
    if (!Number.isFinite(number)) {
        return value;
    }

    return Number.isInteger(number) ? String(number) : String(Math.round(number * 1000) / 1000);
}

function getOpponentNicknameQueries() {
    return [1, 2, 3, 4, 5]
        .map(index => getInputValue(`opponentNickname${index}`).toLowerCase())
        .filter(Boolean);
}

function getOpponentNicknameOrder(nickname, queries) {
    const safeNickname = safeText(nickname);
    const index = queries.findIndex(query => safeNickname.includes(query));

    return index === -1 ? 999 : index;
}

function getMissingOpponentNicknames(queries, filteredOpponents) {
    if (!queries.length) {
        return [];
    }

    return queries.filter(query => {
        return !filteredOpponents.some(opponent => safeText(opponent.nickname).includes(query));
    });
}
