/* Logan’s Little Valentine Journey — app.js
   Single-page interactive Valentine site (vanilla HTML/CSS/JS).

   Personalization:
   - Put your photos in /assets/david.jpg and /assets/logan.jpg
   - Optional: add /assets/bg-music.mp3
   - Optional: add /assets/willow.png (a dachshund image to represent the future dog she wants)
*/

const app = document.getElementById("app");
const progressBar = document.getElementById("progressBar");
const pawBtn = document.getElementById("pawBtn");
const musicBtn = document.getElementById("musicBtn");
const bgm = document.getElementById("bgm");

const state = {
  scene: "intro",
  visited: { elephant: false, sushi: false, travel: false },
  elephantSteps: [false, false, false],
  sushiSelected: [], // 3 “menu items” (all spicy tuna roll… obviously)
  travelSeen: { paris: false, tokyo: false, italy: false },
  dateClicks: { cooking: false, wine: false, pottery: false },
  pawClicks: 0,
  musicOn: false,
};

function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

function setProgress() {
  const baseMap = {
    intro: 6,
    choose: 12,
    elephant: 25,
    sushi: 25,
    travel: 25,
    future: 70,
    date: 85,
    finale: 100,
  };

  let p = baseMap[state.scene] ?? 10;
  const completedPaths = Object.values(state.visited).filter(Boolean).length;

  if (state.scene === "choose") p += completedPaths * 10;
  if (["elephant", "sushi", "travel"].includes(state.scene)) p += (completedPaths - 1) * 10;

  progressBar.style.width = `${clamp(p, 0, 100)}%`;
}

function canContinueToFuture() {
  const completedPaths = Object.values(state.visited).filter(Boolean).length;
  return completedPaths >= 2;
}

function safeAsset(path) { return path || ""; }

function avatarBlock() {
  return `
    <div class="avatars" aria-label="Avatars">
      <img class="avatar" src="${safeAsset("assets/david.jpg")}" alt="David" onerror="this.style.display='none'">
      <img class="avatar" src="${safeAsset("assets/logan.jpg")}" alt="Logan" onerror="this.style.display='none'">
    </div>
  `;
}

const scenes = {
  intro: () => `
    <section class="card">
      <div class="hero">
        <div>
          <h1 class="title">Hi Logan 💛</h1>
          <p class="subtitle">
            It’s David.<br/>
            I made you a tiny journey—part romantic, part playful, part <em>us</em>.<br/>
            Starting in <strong>Virginia-Highland, Atlanta</strong>.
          </p>
        </div>
        ${avatarBlock()}
      </div>
      <div class="section">
        <div class="note">
          <strong>Instructions:</strong> tap things, explore, and try to find the hidden dachshund 🐾.<br/>
          (She doesn’t exist yet… but she’s already iconic.)
          <br/><br/>
          Also: every sushi item is a <strong>spicy tuna roll</strong>. This is not negotiable.
        </div>
        <div class="row">
          <button class="btn primary" data-go="choose">Begin →</button>
        </div>
      </div>
    </section>
  `,

  choose: () => {
    const completedPaths = Object.values(state.visited).filter(Boolean).length;
    return `
      <section class="card">
        <div class="hero">
          <div>
            <h2 class="title">Virginia-Highland Stroll ✨</h2>
            <p class="subtitle">
              The neighborhood’s glowing, it’s date-night energy, and you get to choose what to follow first.
            </p>
          </div>
          ${avatarBlock()}
        </div>

        <div class="section">
          <div class="badge">Completed stops: ${completedPaths}/3 • Need 2 to unlock the “future”</div>

          <div class="grid3" role="list">
            <div class="tile" role="listitem" data-go="elephant">
              <div class="tile__title">🐘 Elephant Wonder Corner</div>
              <p class="tile__desc">Footprints, little surprises, and a big-heart moment.</p>
            </div>

            <div class="tile" role="listitem" data-go="sushi">
              <div class="tile__title">🍣 Sushi Spot</div>
              <p class="tile__desc">A menu so unhinged it only contains one thing.</p>
            </div>

            <div class="tile" role="listitem" data-go="travel">
              <div class="tile__title">✈️ Travel Portal Lane</div>
              <p class="tile__desc">Three postcards. Three mini-memories.</p>
            </div>
          </div>

          <div class="hr"></div>

          <div class="row">
            <button class="btn ${canContinueToFuture() ? "good" : ""}" ${canContinueToFuture() ? `data-go="future"` : "disabled"}
              title="${canContinueToFuture() ? "Unlocked!" : "Visit any two stops first"}">
              ${canContinueToFuture() ? "Continue to the Future →" : "Continue to the Future (locked)"}
            </button>
            <button class="btn" data-go="intro">Restart</button>
          </div>
        </div>
      </section>
    `;
  },

  elephant: () => {
    const lines = [
      "You love elephants because you have an elephant heart: big, gentle, and loyal.",
      "You’re smart, steady, and somehow still ridiculously cute about everything you do.",
      "I’m not letting go. You’re my favorite person in every zip code, timeline, and universe.",
    ];
    const revealedCount = state.elephantSteps.filter(Boolean).length;

    return `
      <section class="card">
        <div class="hero">
          <div>
            <h2 class="title">🐘 Elephant Wonder Corner</h2>
            <p class="subtitle">
              There are three glowing footprints on the path. Tap them.
              <br/>(${revealedCount}/3)
            </p>
          </div>
          ${avatarBlock()}
        </div>

        <div class="section">
          <div class="footprints">
            ${[0,1,2].map(i => `
              <div class="foot ${state.elephantSteps[i] ? "done" : ""}" data-foot="${i}">
                ${state.elephantSteps[i] ? "✨" : "🐾"}<br/>
                ${state.elephantSteps[i] ? "Revealed" : "Footprint"}
              </div>
            `).join("")}
          </div>

          <div class="note" id="elephantNote">
            ${state.elephantSteps.map((v, i) => v ? `• ${lines[i]}` : "").filter(Boolean).join("<br/>") || "Tap a footprint to reveal a little message."}
          </div>

          ${revealedCount === 3 ? `
            <div class="note">
              <strong>Future-dog cameo:</strong> a tiny dachshund appears in your imagination, looks at you, then judges David lovingly.
              <br/>“I approve… but only if there are snacks.”
            </div>
          ` : ""}

          <div class="row">
            <button class="btn primary" data-go="choose">Back to Virginia-Highland →</button>
          </div>
        </div>
      </section>
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

    const slots = [0,1,2].map(i => state.sushiSelected[i] ? "🍣 Spicy Tuna Roll" : "Pick one").map((t, idx) => {
      const filled = state.sushiSelected[idx] ? "filled" : "";
      return `<div class="slot ${filled}">${t}</div>`;
    }).join("");

    const done = state.sushiSelected.length >= 3;

    return `
      <section class="card">
        <div class="hero">
          <div>
            <h2 class="title">🍣 Sushi Spot</h2>
            <p class="subtitle">
              Welcome. The menu is… extremely focused.
              <br/>Select <strong>three</strong> items to build your order.
            </p>
          </div>
          ${avatarBlock()}
        </div>

        <div class="section">
          <div class="badge">House rule: everything is a spicy tuna roll.</div>

          <div class="sushiSlots" aria-label="Order slots">
            ${slots}
          </div>

          <div class="grid3" style="margin-top: 10px;">
            ${menu.map(item => `
              <div class="tile" data-sushi="${item.id}">
                <div class="tile__title">${item.label}</div>
                <p class="tile__desc">${item.desc}</p>
              </div>
            `).join("")}
          </div>

          <div class="row">
            <button class="btn warn" data-sushi-reset>Reset order</button>
            <button class="btn ${done ? "good" : ""}" ${done ? "" : "disabled"} data-sushi-finish>
              ${done ? "Place Order →" : "Place Order (pick 3)"}
            </button>
          </div>

          ${done ? `
            <div class="note">
              “Logan, I’d eat a million spicy tuna rolls if it meant I get to hear you laugh across the table.”
              <br/><br/>
              <button class="btn" data-soy-joke>Press for soy joke</button>
              <span id="soyOut"></span>
            </div>
          ` : ""}

          <div class="row">
            <button class="btn primary" data-go="choose">Back to Virginia-Highland →</button>
          </div>
        </div>
      </section>
    `;
  },

  travel: () => {
    const seenCount = Object.values(state.travelSeen).filter(Boolean).length;

    return `
      <section class="card">
        <div class="hero">
          <div>
            <h2 class="title">✈️ Travel Portal Lane</h2>
            <p class="subtitle">Three postcards are glowing. Tap to peek into a tiny future-memory. (${seenCount}/3)</p>
          </div>
          ${avatarBlock()}
        </div>

        <div class="section">
          <div class="row">
            <button class="btn primary" data-postcard="paris">🗼 Paris</button>
            <button class="btn primary" data-postcard="tokyo">🗾 Tokyo</button>
            <button class="btn primary" data-postcard="italy">🍷 Italy</button>
          </div>

          <div class="note" id="postcardOut">
            Tap a postcard.
          </div>

          <div class="row">
            <button class="btn primary" data-go="choose">Back to Virginia-Highland →</button>
          </div>
        </div>
      </section>
    `;
  },

  future: () => `
    <section class="card">
      <div class="hero">
        <div>
          <h2 class="title">The Future Path 🌙</h2>
          <p class="subtitle">
            Two stops down… now the part where I get a little serious (but not too serious).
          </p>
        </div>
        ${avatarBlock()}
      </div>

      <div class="section">
        <div class="note">
          <strong>Dr. Logan.</strong> Emory. Dermatology.
          <br/>Saving skin, saving days, looking unfairly good doing it.
        </div>

        <div class="note">
          And me—building tech, chasing big ideas…
          <br/>But my favorite future is the one where I come home to <strong>you</strong>.
        </div>

        <div class="note">
          And one day? We get that little dachshund you want.
          <br/>She will be tiny. She will be spoiled. She will 100% think she’s in charge.
        </div>

        <div class="row">
          <button class="btn primary" data-go="date">Continue → Tonight’s Date</button>
          <button class="btn" data-go="choose">Back</button>
        </div>
      </div>
    </section>
  `,

  date: () => {
    const all = Object.values(state.dateClicks).every(Boolean);
    const mk = (k, emoji, label) => `
      <button class="btn ${state.dateClicks[k] ? "good" : "primary"}" data-date="${k}">
        ${emoji} ${label} ${state.dateClicks[k] ? "✓" : ""}
      </button>
    `;

    return `
      <section class="card">
        <div class="hero">
          <div>
            <h2 class="title">Tonight ✨</h2>
            <p class="subtitle">
              Click all three to “lock in” our Valentine plan.
            </p>
          </div>
          ${avatarBlock()}
        </div>

        <div class="section">
          <div class="row">
            ${mk("cooking", "🍝", "Cooking")}
            ${mk("wine", "🍷", "Wine")}
            ${mk("pottery", "🏺", "Pottery")}
          </div>

          <div class="note" id="dateOut">
            ${all
              ? `Unlocked: <strong>the final message</strong> 💛`
              : `It’s giving “cozy, romantic, and you laughing at me for taking recipes too seriously.”`}
          </div>

          <div class="row">
            <button class="btn ${all ? "good" : ""}" ${all ? `data-go="finale"` : "disabled"}>
              ${all ? "Finale →" : "Finale (click all three)"}
            </button>
            <button class="btn" data-go="choose">Back</button>
          </div>
        </div>
      </section>
    `;
  },

  finale: () => `
    <section class="card">
      <div class="hero">
        <div>
          <h2 class="title">Happy Valentine’s Day, Logan 💛</h2>
          <p class="subtitle">
            I choose you. In every timeline.
          </p>
        </div>
        ${avatarBlock()}
      </div>

      <div class="section">
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
          <button class="btn primary" data-replay>Replay</button>
          <button class="btn warn" data-find-willow>Find the dachshund 🐾</button>
        </div>
      </div>
    </section>
  `,
};

function render() {
  setProgress();
  app.innerHTML = scenes[state.scene]();
  bindSceneHandlers();
}

function go(scene) {
  state.scene = scene;
  render();
}

function bindSceneHandlers() {
  // navigation
  document.querySelectorAll("[data-go]").forEach(el => {
    el.addEventListener("click", () => go(el.getAttribute("data-go")));
  });
  document.querySelectorAll(".tile[data-go]").forEach(el => {
    el.addEventListener("click", () => go(el.getAttribute("data-go")));
  });

  // Elephant footprints
  document.querySelectorAll("[data-foot]").forEach(el => {
    el.addEventListener("click", () => {
      const idx = Number(el.getAttribute("data-foot"));
      state.elephantSteps[idx] = true;
      state.visited.elephant = true;
      render();
    });
  });

  // Sushi selection
  document.querySelectorAll("[data-sushi]").forEach(el => {
    el.addEventListener("click", () => {
      if (state.sushiSelected.length >= 3) return;
      state.sushiSelected.push(el.getAttribute("data-sushi"));
      state.visited.sushi = true;
      render();
    });
  });

  const resetBtn = document.querySelector("[data-sushi-reset]");
  if (resetBtn) resetBtn.addEventListener("click", () => { state.sushiSelected = []; render(); });

  const soyBtn = document.querySelector("[data-soy-joke]");
  if (soyBtn) {
    soyBtn.addEventListener("click", () => {
      const out = document.getElementById("soyOut");
      if (out) out.innerHTML = `<br/><br/><strong>David:</strong> I’m soy into you.`;
      soyBtn.disabled = true;
      soyBtn.textContent = "Soy joke delivered ✅";
    });
  }

  // Travel postcards
  document.querySelectorAll("[data-postcard]").forEach(el => {
    el.addEventListener("click", () => {
      const key = el.getAttribute("data-postcard");
      state.travelSeen[key] = true;
      state.visited.travel = true;

      const out = document.getElementById("postcardOut");
      if (!out) return;

      const copy = {
        paris: "Paris: you pretending you aren’t cold; me pretending I’m not lost. We still end up kissing at sunset.",
        tokyo: "Tokyo: skincare aisle. You go full dermatologist mode and I’m just your proud little assistant.",
        italy: "Italy: wine + pasta + your laugh. Our future dachshund somehow becomes a local celebrity.",
      }[key];

      out.innerHTML = `✨ <strong>${copy}</strong>`;
      setProgress();
    });
  });

  // Date clicks
  document.querySelectorAll("[data-date]").forEach(el => {
    el.addEventListener("click", () => {
      const k = el.getAttribute("data-date");
      state.dateClicks[k] = true;
      render();
    });
  });

  // Finale actions
  const replay = document.querySelector("[data-replay]");
  if (replay) {
    replay.addEventListener("click", () => {
      const musicOn = state.musicOn;
      Object.assign(state, {
        scene: "intro",
        visited: { elephant: false, sushi: false, travel: false },
        elephantSteps: [false, false, false],
        sushiSelected: [],
        travelSeen: { paris: false, tokyo: false, italy: false },
        dateClicks: { cooking: false, wine: false, pottery: false },
        pawClicks: 0,
        musicOn,
      });
      go("intro");
    });
  }

  const findDog = document.querySelector("[data-find-willow]");
  if (findDog) findDog.addEventListener("click", () => openDogModal());
}

// Paw easter egg
pawBtn.addEventListener("click", () => {
  state.pawClicks += 1;
  if (state.pawClicks >= 5) {
    state.pawClicks = 0;
    openDogModal();
  }
});

// Music toggle
musicBtn.addEventListener("click", async () => {
  state.musicOn = !state.musicOn;
  if (state.musicOn) {
    try {
      bgm.volume = 0.22;
      await bgm.play();
      musicBtn.textContent = "🔊";
    } catch {
      // no music file or blocked autoplay
      state.musicOn = false;
      musicBtn.textContent = "🎵";
      alert("Add assets/bg-music.mp3 if you want music 🎵");
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
  overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.remove(); });
  overlay.querySelectorAll("[data-close]").forEach(btn => btn.addEventListener("click", () => overlay.remove()));
  document.body.appendChild(overlay);
}

render();
