/* Logan’s Little Valentine Journey — rebuilt as an open-world stroll.
   Explore the neighborhood, bump into hotspots, and read each scene inline. */

const app = document.getElementById("app");
const progressBar = document.getElementById("progressBar");
const pawBtn = document.getElementById("pawBtn");
const musicBtn = document.getElementById("musicBtn");
const bgm = document.getElementById("bgm");

const worldLocations = [
  {
    id: "elephant",
    name: "Elephant Atrium",
    emoji: "🐘",
    x: 22,
    y: 48,
    memoryLine: "Elephant hearts remember every kindness.",
    vibe: "Footprints glow between string lights.",
  },
  {
    id: "sushi",
    name: "Hidden Sushi Bar",
    emoji: "🍣",
    x: 48,
    y: 32,
    memoryLine: "We once invented a menu with exactly one item.",
    vibe: "Neon reflections, soy-scented air, zero chill.",
  },
  {
    id: "travel",
    name: "Travel Loft",
    emoji: "✈️",
    x: 66,
    y: 56,
    memoryLine: "Postcards of futures where we’re laughing somewhere new.",
    vibe: "Suitcases, postcards, and a dachshund passport agent.",
  },
  {
    id: "date",
    name: "Date-Night Studio",
    emoji: "🕯",
    x: 36,
    y: 72,
    memoryLine: "Cooking + wine + pottery = chaotic romance.",
    vibe: "Pots spinning, wine poured, playlists looping.",
  },
  {
    id: "starlight",
    name: "Starlight Outlook",
    emoji: "🌌",
    x: 78,
    y: 26,
    memoryLine: "Every timeline ends with me choosing you.",
    vibe: "City skyline, meteor streak, dachshund constellation.",
  },
];

const baseVisited = worldLocations.reduce((acc, loc) => {
  acc[loc.id] = false;
  return acc;
}, {});

const initialChatMessages = [
  {
    id: "assistant-intro",
    role: "assistant",
    text:
      "Logan, it’s me. Wander the map, then ask me anything here. I’ll answer like it’s our own little telepathic date-night thread.",
  },
];

const state = {
  player: { x: 52, y: 76 },
  visited: { ...baseVisited },
  hoveredLocation: null,
  activeLocation: null,
  memoryLog: [],
  worldHint: null,
  elephantSteps: [false, false, false],
  sushiSelected: [],
  travelSeen: { paris: false, tokyo: false, italy: false },
  dateClicks: { cooking: false, wine: false, pottery: false },
  pawClicks: 0,
  musicOn: false,
  chatMessages: [...initialChatMessages],
  chatDraft: "",
  chatLoading: false,
};

const MOVEMENT_STEP = 3.2;
const NEAR_THRESHOLD = 12;

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function distance(point, loc) {
  const dx = point.x - loc.x;
  const dy = point.y - loc.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function safeAsset(path) {
  return path || "";
}

function getLocationById(id) {
  return worldLocations.find((loc) => loc.id === id);
}

function getVisitedCount() {
  return Object.values(state.visited).filter(Boolean).length;
}

function defaultWorldMessage() {
  const visitedCount = getVisitedCount();
  if (!visitedCount) {
    return "Use arrow keys or WASD to wander. When a spot glows, press Enter or tap it.";
  }
  if (visitedCount < worldLocations.length) {
    return "Keep strolling—each glowing nook hides a different kind of us.";
  }
  return "Revisit any stop to hear it react to how many memories you’ve collected.";
}

function getWorldMessage() {
  if (state.worldHint) return state.worldHint;
  if (state.activeLocation) return "Stay awhile, then hit ← Back to keep roaming.";
  if (state.hoveredLocation) {
    const loc = getLocationById(state.hoveredLocation);
    if (loc) return `You’re beside ${loc.name}. Press Enter or tap to slip inside.`;
  }
  return defaultWorldMessage();
}

function avatarBlock() {
  return `
    <div class="avatars" aria-label="Avatars">
      <img class="avatar" src="${safeAsset("assets/david.jpg")}" alt="David" onerror="this.style.display='none'">
      <img class="avatar" src="${safeAsset("assets/logan.jpg")}" alt="Logan" onerror="this.style.display='none'">
    </div>
  `;
}

function renderLocationHeading(title, subtitle, emoji) {
  return `
    <div class="panelHeading">
      <div>
        <h2 class="title">${emoji} ${title}</h2>
        <p class="subtitle">${subtitle}</p>
      </div>
      ${avatarBlock()}
    </div>
  `;
}

const locationPanels = {
  elephant: () => {
    const lines = [
      "Elephant hearts, elephant memory, elephant-level loyalty.",
      "You’re soft and steady and somehow still ridiculous about everything.",
      "I’m not letting go. Ever.",
    ];
    const revealedCount = state.elephantSteps.filter(Boolean).length;

    return `
      ${renderLocationHeading("Elephant Atrium", "Tap each glowing footprint to reveal a secret.", "🐘")}
      <div class="note">${getLocationById("elephant").vibe}</div>
      <div class="footprints">
        ${[0, 1, 2]
          .map(
            (i) => `
              <div class="foot ${state.elephantSteps[i] ? "done" : ""}" data-foot="${i}">
                ${state.elephantSteps[i] ? "✨" : "🐾"}<br/>
                ${state.elephantSteps[i] ? "Revealed" : "Footprint"}
              </div>
            `
          )
          .join("")}
      </div>
      <div class="note" id="elephantNote">
        ${state.elephantSteps
          .map((v, i) => (v ? `• ${lines[i]}` : ""))
          .filter(Boolean)
          .join("<br/>") || "Tap each print to hear me gush."}
      </div>
      ${revealedCount === 3
        ? `<div class="note">A tiny dachshund apparition appears, approves of us, and demands snacks.</div>`
        : ""}
    `;
  },

  sushi: () => {
    const menu = [
      { id: "spicy1", label: "Spicy Tuna Roll", desc: "Classic. Dangerous. Iconic." },
      { id: "spicy2", label: "Spicy Tuna Roll", desc: "Same roll, but emotionally supportive." },
      { id: "spicy3", label: "Spicy Tuna Roll", desc: "Spicy tuna roll… with ✨vibes✨." },
      { id: "spicy4", label: "Spicy Tuna Roll", desc: "The chef said: ‘trust me’ (it’s spicy tuna roll)." },
      { id: "spicy5", label: "Spicy Tuna Roll", desc: "In a different font. Still spicy tuna roll." },
    ];
    const slots = [0, 1, 2]
      .map((i) => (state.sushiSelected[i] ? "🍣 Spicy Tuna Roll" : "Pick one"))
      .map((t, idx) => {
        const filled = state.sushiSelected[idx] ? "filled" : "";
        return `<div class="slot ${filled}">${t}</div>`;
      })
      .join("");
    const done = state.sushiSelected.length >= 3;

    return `
      ${renderLocationHeading("Hidden Sushi Bar", "Assemble three rolls. Spoiler: they’re the same roll.", "🍣")}
      <div class="note">${getLocationById("sushi").vibe}</div>
      <div class="sushiSlots">${slots}</div>
      <div class="grid3" style="margin-top: 10px;">
        ${menu
          .map(
            (item) => `
              <div class="tile" data-sushi="${item.id}">
                <div class="tile__title">${item.label}</div>
                <p class="tile__desc">${item.desc}</p>
              </div>
            `
          )
          .join("")}
      </div>
      <div class="row">
        <button class="btn warn" data-sushi-reset>Reset order</button>
        <button class="btn ${done ? "good" : ""}" ${done ? "" : "disabled"} data-sushi-finish>
          ${done ? "Place Order" : "Place Order (pick 3)"}
        </button>
      </div>
      ${done
        ? `<div class="note">
            “Logan, I’d eat a million spicy tuna rolls if it meant hearing you laugh across the table.”<br/><br/>
            <button class="btn" data-soy-joke>Press for soy joke</button>
            <span id="soyOut"></span>
          </div>`
        : ""}
    `;
  },

  travel: () => {
    const seenCount = Object.values(state.travelSeen).filter(Boolean).length;
    return `
      ${renderLocationHeading("Travel Loft", "Flip any postcard and pocket the future.", "✈️")}
      <div class="note">${getLocationById("travel").vibe}</div>
      <div class="row" style="flex-wrap: wrap;">
        <button class="btn primary" data-postcard="paris">🗼 Paris</button>
        <button class="btn primary" data-postcard="tokyo">🗾 Tokyo</button>
        <button class="btn primary" data-postcard="italy">🍷 Italy</button>
      </div>
      <div class="note" id="postcardOut">${seenCount ? "Tap another postcard." : "Pick a postcard."}</div>
    `;
  },

  date: () => {
    const mk = (k, emoji, label) => `
      <button class="btn ${state.dateClicks[k] ? "good" : "primary"}" data-date="${k}">
        ${emoji} ${label} ${state.dateClicks[k] ? "✓" : ""}
      </button>
    `;
    const all = Object.values(state.dateClicks).every(Boolean);
    return `
      ${renderLocationHeading("Date-Night Studio", "Toggle every station to craft tonight’s vibe.", "🕯")}
      <div class="note">${getLocationById("date").vibe}</div>
      <div class="row" style="flex-wrap: wrap;">
        ${mk("cooking", "🍝", "Cooking")}
        ${mk("wine", "🍷", "Wine")}
        ${mk("pottery", "🏺", "Pottery")}
      </div>
      <div class="note" id="dateOut">
        ${all
          ? "Unlocked: cozy night secured. Wander to Starlight Outlook whenever you’re ready for the finale."
          : "It’s giving ‘cozy, romantic, and you laughing at me for taking recipes too seriously.’"}
      </div>
    `;
  },

  starlight: () => {
    const visitedCount = getVisitedCount();
    return `
      ${renderLocationHeading("Starlight Outlook", "The skyline listens while I gush about you.", "🌌")}
      <div class="note">${getLocationById("starlight").vibe}</div>
      <div class="note">
        You’ve touched ${visitedCount}/${worldLocations.length} neon memories tonight.
        <br/>No quests. No checklists. Just us orbiting the same feeling.
      </div>
      <div class="note">
        You’re my favorite place to be.
        <br/>My favorite laugh.
        <br/>My favorite future.
      </div>
      <div class="note">
        Love,
        <br/><strong>David</strong>
      </div>
      <div class="row">
        <button class="btn warn" data-find-willow>Summon the dachshund 🐾</button>
      </div>
    `;
  },
};

function setProgress() {
  const count = getVisitedCount();
  const percent = (count / worldLocations.length) * 100;
  progressBar.style.width = `${clamp(percent, 0, 100)}%`;
}

function renderWorld() {
  return `
    <section class="world">
      <div class="world__map" aria-label="Virginia-Highland dream map">
        <div class="world__glow"></div>
        ${worldLocations
          .map((loc) => {
            const visited = state.visited[loc.id];
            const near = state.hoveredLocation === loc.id;
            return `
              <button class="world__spot ${visited ? "world__spot--visited" : ""} ${
              near ? "world__spot--near" : ""
            }" style="left:${loc.x}%; top:${loc.y}%" data-location="${loc.id}">
                <span class="world__spotIcon">${loc.emoji}</span>
                <span class="world__spotLabel">${loc.name}</span>
              </button>
            `;
          })
          .join("")}
        <div class="world__player" style="left:${state.player.x}%; top:${state.player.y}%" aria-label="David exploring">
          <span>💛</span>
        </div>
      </div>
      <aside class="world__panel">
        ${renderWorldPanel()}
      </aside>
    </section>
  `;
}

function renderWorldPanel() {
  if (!state.activeLocation) {
    return `
      <div class="panelIntro">
        <div class="panelIntro__top">
          <div>
            <h2 class="title">Virginia-Highland Nights</h2>
            <p class="subtitle" id="worldMessage">${getWorldMessage()}</p>
          </div>
          ${avatarBlock()}
        </div>
        <div class="panelStats">
          <div>
            <div class="panelStats__value">${getVisitedCount()}</div>
            <div class="panelStats__label">Spots explored</div>
          </div>
          <div>
            <div class="panelStats__value">${Math.round(clamp((getVisitedCount() / worldLocations.length) * 100, 0, 100))}%</div>
            <div class="panelStats__label">Map glow</div>
          </div>
        </div>
        <div class="memoryList">
          <div class="memoryList__title">Collected Moments</div>
          ${renderMemoryLog()}
        </div>
        ${renderChatPanel()}
      </div>
    `;
  }

  const renderer = locationPanels[state.activeLocation];
  return `
    <div class="panelActive">
      <div class="panelActive__header">
        <button class="iconbtn panelClose" data-close-panel>← Back to the neighborhood</button>
      </div>
      ${renderer ? renderer() : `<p class="subtitle">Lost in thought…</p>`}
    </div>
  `;
}

function renderMemoryLog() {
  if (!state.memoryLog.length) {
    return `<div class="memoryList__empty">Memories you uncover will stack here.</div>`;
  }
  return state.memoryLog
    .map(
      (entry) => `
        <div class="memoryList__item">
          <div class="memoryList__emoji">${entry.emoji}</div>
          <div>
            <div class="memoryList__name">${entry.title}</div>
            <div class="memoryList__line">${entry.line}</div>
          </div>
        </div>
      `
    )
    .join("");
}

function renderChatPanel() {
  const messageList = state.chatMessages
    .map((msg) => renderChatBubble(msg))
    .join("") || `<div class="chat__empty">No messages yet.</div>`;

  return `
    <div class="chat" aria-live="polite">
      <div class="chat__header">
        Logan ↔ David
        <span class="chat__status">${state.chatLoading ? "typing…" : ""}</span>
      </div>
      <div class="chat__messages" id="chatMessages">${messageList}</div>
      <form class="chat__composer" data-chat-form>
        <textarea
          name="loganMessage"
          placeholder="Type as Logan…"
          rows="2"
          ${state.chatLoading ? "disabled" : ""}
        >${state.chatDraft}</textarea>
        <button class="btn primary" type="submit" ${state.chatLoading ? "disabled" : ""}>
          ${state.chatLoading ? "Sending" : "Send"}
        </button>
      </form>
      <div class="chat__hint">
        I’ll keep the tone romantic + playful, just like us.
      </div>
    </div>
  `;
}

function renderChatBubble(msg) {
  const isAssistant = msg.role === "assistant";
  const speaker = isAssistant ? "David" : "Logan";
  return `
    <div class="chat__bubble ${isAssistant ? "chat__bubble--assistant" : "chat__bubble--logan"}">
      <div class="chat__bubbleLabel">${speaker}</div>
      <div>${msg.text}</div>
    </div>
  `;
}

function bindChat() {
  const form = document.querySelector("[data-chat-form]");
  if (!form) return;
  const textarea = form.querySelector("textarea");
  if (textarea) {
    textarea.value = state.chatDraft;
    textarea.addEventListener("input", (event) => {
      state.chatDraft = event.target.value;
    });
  }
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (state.chatLoading) return;
    const value = (textarea?.value || "").trim();
    if (!value) return;
    sendChatMessage(value);
  });
  scrollChatToBottom();
}

function scrollChatToBottom() {
  requestAnimationFrame(() => {
    const box = document.getElementById("chatMessages");
    if (box) box.scrollTop = box.scrollHeight;
  });
}

async function sendChatMessage(message) {
  const clientMsg = createChatMessage("user", message);
  state.chatMessages.push(clientMsg);
  state.chatDraft = "";
  state.chatLoading = true;
  trimChatMessages();
  render();

  try {
    const payload = {
      prompt: message,
      history: getChatHistoryPayload(),
    };
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error("Failed to reach AI service");
    const data = await response.json();
    const reply = data.reply?.trim() || "I’m lost in thought—try that again?";
    state.chatMessages.push(createChatMessage("assistant", reply));
  } catch (error) {
    state.chatMessages.push(
      createChatMessage(
        "assistant",
        "I want to answer, but the AI connection hiccuped. Give me a second and try again?"
      )
    );
  } finally {
    state.chatLoading = false;
    trimChatMessages();
    render();
  }
}

function getChatHistoryPayload() {
  return state.chatMessages.slice(-8).map((msg) => ({ role: msg.role, text: msg.text }));
}

function createChatMessage(role, text) {
  return { id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, role, text };
}

function trimChatMessages() {
  const max = 12;
  if (state.chatMessages.length > max) {
    state.chatMessages = state.chatMessages.slice(-max);
  }
}

function render() {
  updateNearbyLocation();
  setProgress();
  app.innerHTML = renderWorld();
  bindSceneHandlers();
}

function updateNearbyLocation() {
  let selected = null;
  let bestDistance = Infinity;
  worldLocations.forEach((loc) => {
    const d = distance(state.player, loc);
    if (d < NEAR_THRESHOLD && d < bestDistance) {
      bestDistance = d;
      selected = loc.id;
    }
  });
  state.hoveredLocation = selected;
  if (!selected && !state.activeLocation) {
    state.worldHint = null;
  }
}

function addMemory(id) {
  const loc = getLocationById(id);
  if (!loc) return;
  if (state.memoryLog.some((entry) => entry.id === id)) return;
  state.memoryLog.unshift({ id, title: loc.name, line: loc.memoryLine, emoji: loc.emoji });
  state.memoryLog = state.memoryLog.slice(0, 6);
}

function attemptEnterLocation(id) {
  if (!id) return;
  if (state.hoveredLocation !== id) {
    const loc = getLocationById(id);
    state.worldHint = loc ? `Walk a little closer to ${loc.name}.` : "Walk closer.";
    render();
    return;
  }
  enterLocation(id);
}

function enterLocation(id) {
  state.activeLocation = id;
  state.worldHint = null;
  if (!state.visited[id]) {
    state.visited[id] = true;
    addMemory(id);
  }
  render();
}

function exitLocation() {
  state.activeLocation = null;
  state.worldHint = null;
  render();
}

function movePlayer(dx, dy) {
  state.player.x = clamp(state.player.x + dx, 6, 94);
  state.player.y = clamp(state.player.y + dy, 8, 92);
  if (!state.activeLocation) {
    state.worldHint = null;
  }
  render();
}

function bindSceneHandlers() {
  document.querySelectorAll("[data-location]").forEach((el) => {
    el.addEventListener("click", () => attemptEnterLocation(el.getAttribute("data-location")));
  });

  const closeBtn = document.querySelector("[data-close-panel]");
  if (closeBtn) {
    closeBtn.addEventListener("click", () => exitLocation());
  }

  bindLocationInteractions();

  document.querySelectorAll("[data-find-willow]").forEach((btn) => {
    btn.addEventListener("click", () => openDogModal());
  });

  bindChat();
}

function bindLocationInteractions() {
  if (state.activeLocation === "elephant") bindElephant();
  if (state.activeLocation === "sushi") bindSushi();
  if (state.activeLocation === "travel") bindTravel();
  if (state.activeLocation === "date") bindDate();
}

function bindElephant() {
  document.querySelectorAll("[data-foot]").forEach((el) => {
    el.addEventListener("click", () => {
      const idx = Number(el.getAttribute("data-foot"));
      state.elephantSteps[idx] = true;
      render();
    });
  });
}

function bindSushi() {
  document.querySelectorAll("[data-sushi]").forEach((el) => {
    el.addEventListener("click", () => {
      if (state.sushiSelected.length >= 3) return;
      state.sushiSelected.push(el.getAttribute("data-sushi"));
      render();
    });
  });

  const resetBtn = document.querySelector("[data-sushi-reset]");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      state.sushiSelected = [];
      render();
    });
  }

  const finishBtn = document.querySelector("[data-sushi-finish]");
  if (finishBtn) {
    finishBtn.addEventListener("click", () => {
      // no-op; just keep shimmering.
    });
  }

  const soyBtn = document.querySelector("[data-soy-joke]");
  if (soyBtn) {
    soyBtn.addEventListener("click", () => {
      const out = document.getElementById("soyOut");
      if (out) out.innerHTML = `<br/><br/><strong>David:</strong> I’m soy into you.`;
      soyBtn.disabled = true;
      soyBtn.textContent = "Soy joke delivered ✅";
    });
  }
}

function bindTravel() {
  document.querySelectorAll("[data-postcard]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.getAttribute("data-postcard");
      state.travelSeen[key] = true;
      const out = document.getElementById("postcardOut");
      if (!out) return;
      const copy = {
        paris: "Paris: you pretending you aren’t cold; me pretending I’m not lost. We still end up kissing at sunset.",
        tokyo: "Tokyo: skincare aisle. You go full dermatologist mode and I’m just your proud little assistant.",
        italy: "Italy: wine + pasta + your laugh. Our future dachshund somehow becomes a local celebrity.",
      }[key];
      out.innerHTML = `✨ <strong>${copy}</strong>`;
    });
  });
}

function bindDate() {
  document.querySelectorAll("[data-date]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.getAttribute("data-date");
      state.dateClicks[key] = true;
      render();
    });
  });
}

document.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if (key === "escape" && state.activeLocation) {
    event.preventDefault();
    exitLocation();
    return;
  }

  const movementMap = {
    arrowup: { dx: 0, dy: -MOVEMENT_STEP },
    w: { dx: 0, dy: -MOVEMENT_STEP },
    arrowdown: { dx: 0, dy: MOVEMENT_STEP },
    s: { dx: 0, dy: MOVEMENT_STEP },
    arrowleft: { dx: -MOVEMENT_STEP, dy: 0 },
    a: { dx: -MOVEMENT_STEP, dy: 0 },
    arrowright: { dx: MOVEMENT_STEP, dy: 0 },
    d: { dx: MOVEMENT_STEP, dy: 0 },
  };

  if (movementMap[key]) {
    event.preventDefault();
    if (state.activeLocation) return;
    movePlayer(movementMap[key].dx, movementMap[key].dy);
    return;
  }

  if (key === "enter" && !state.activeLocation && state.hoveredLocation) {
    event.preventDefault();
    attemptEnterLocation(state.hoveredLocation);
  }
});

pawBtn.addEventListener("click", () => {
  state.pawClicks += 1;
  if (state.pawClicks >= 5) {
    state.pawClicks = 0;
    openDogModal();
  }
});

musicBtn.addEventListener("click", async () => {
  state.musicOn = !state.musicOn;
  if (state.musicOn) {
    try {
      bgm.volume = 0.22;
      await bgm.play();
      musicBtn.textContent = "🔊";
    } catch {
      state.musicOn = false;
      musicBtn.textContent = "🎵";
      alert("Add assets/bg-music.(mp3/m4a/wav) if you want music 🎵");
    }
  } else {
    bgm.pause();
    musicBtn.textContent = "🎵";
  }
});

function openDogModal() {
  const overlay = document.createElement("div");
  overlay.className = "modalOverlay";
  overlay.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-label="Future dachshund message">
      <div class="modal__top">
        <div><strong>Future Dachshund Preview</strong></div>
        <button class="iconbtn" data-close>✕</button>
      </div>
      <div class="modal__body">
        <div class="willowRow">
          <img class="willowImg" src="assets/willow.png" alt="Future dachshund" onerror="this.style.display='none'">
          <div>
            <div class="badge">🐶 A dog that doesn’t exist yet</div>
            <div style="margin-top:10px; line-height:1.5; color: rgba(255,255,255,0.85);">
              “Hi Logan. I’m your future wiener dog.”
              <br/>“I run this household.”
              <br/>“I accept payment in spicy tuna rolls.”
            </div>
          </div>
        </div>
        <div class="row">
          <button class="btn good" data-close>Ok ✅</button>
        </div>
      </div>
    </div>
  `;
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.remove();
  });
  overlay.querySelectorAll("[data-close]").forEach((btn) =>
    btn.addEventListener("click", () => overlay.remove())
  );
  document.body.appendChild(overlay);
}

render();
