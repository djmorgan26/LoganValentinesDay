/* Logan's Cinematic Love Letter — app.js
   Auto-playing chapters with typewriter text, 3 interactive moments, and AI chat. */

(function () {
  "use strict";

  // ============ DOM REFS ============
  const curtain = document.getElementById("curtain");
  const curtainBtn = document.getElementById("curtainBtn");
  const particlesEl = document.getElementById("particles");
  const dotNav = document.getElementById("dotNav");
  const chapters = document.getElementById("chapters");
  const bgm = document.getElementById("bgm");

  // Chat
  const chatMessages = document.getElementById("chatMessages");
  const chatForm = document.getElementById("chatForm");
  const chatInput = document.getElementById("chatInput");
  const chatSendBtn = document.getElementById("chatSendBtn");
  const chatStatus = document.getElementById("chatStatus");
  const chatSection = document.getElementById("chatSection");

  // Interactions
  const fortuneCookie = document.getElementById("fortuneCookie");
  const counterBtn = document.getElementById("counterBtn");
  const counterNumber = document.getElementById("counterNumber");
  const counterReason = document.getElementById("counterReason");
  const hospitalBtn = document.getElementById("hospitalBtn");
  const hospitalBtnWrap = document.getElementById("hospitalBtnWrap");
  const willowReveal = document.getElementById("willowReveal");
  const letterText = document.getElementById("letterText");
  const candleGlow = document.getElementById("candleGlow");

  // ============ STATE ============
  const state = {
    currentChapter: 0,
    musicStarted: false,
    showRunning: false,
    soyFlipped: false,
    postcardsFlipped: { paris: false, tokyo: false, italy: false },
    counterCount: 0,
    chatMessages: [
      { role: "assistant", text: "Logan, ask me anything. I'll answer like it's our own little telepathic date-night thread." },
    ],
    chatLoading: false,
  };

  const TOTAL_CHAPTERS = 6; // indices 0-5

  // ============ CHAPTER CONFIG ============
  const chapterConfig = [
    {
      // Ch 0: Elephant Hearts
      lines: [
        "Elephant hearts remember every kindness.",
        "You're soft and steady",
        "and somehow still ridiculous about everything.",
        "I'm not letting go. Ever.",
      ],
      autoAdvanceDelay: 3000,
    },
    {
      // Ch 1: Sushi Bar (interactive)
      lines: [
        "We once invented a sushi menu with exactly one item.",
        "Spoiler: it was spicy tuna roll. Every time.",
      ],
      interactive: true,
    },
    {
      // Ch 2: Postcards (interactive)
      lines: [
        "Postcards from the future — where we're laughing somewhere new.",
        "Flip a card. Pocket the daydream.",
      ],
      interactive: true,
    },
    {
      // Ch 3: Date Night
      lines: [
        "Cooking + wine + pottery = chaotic romance.",
        "It's giving cozy, romantic,",
        "and you laughing at me for taking recipes too seriously.",
      ],
      autoAdvanceDelay: 3000,
      candleGlow: true,
    },
    {
      // Ch 4: Reasons I Love You (interactive)
      lines: [
        "I started counting reasons I love you.",
        "I stopped because I ran out of numbers, not reasons.",
      ],
      interactive: true,
    },
    {
      // Ch 5: The Love Letter (final)
      letterMode: true,
    },
  ];

  const loveReasons = [
    "The way you laugh at your own jokes before you finish telling them.",
    "Your ridiculous dedication to skincare — and making me do it too.",
    "How you make every room warmer just by walking in.",
    "The look you give me when you think I'm not watching.",
    "You turned 'spicy tuna roll' into a love language.",
    "Your patience with my overthinking.",
    "The way you say my name.",
    "You chose me. Every day, you keep choosing me.",
  ];

  // ============ TYPEWRITER ENGINE ============
  function typewriteLine(el, text, speed = 40) {
    return new Promise((resolve) => {
      let i = 0;
      const cursor = document.createElement("span");
      cursor.className = "cursor";
      el.appendChild(cursor);

      function tick() {
        if (i < text.length) {
          cursor.before(document.createTextNode(text[i]));
          i++;
          setTimeout(tick, speed);
        } else {
          setTimeout(() => {
            cursor.remove();
            resolve();
          }, 400);
        }
      }
      tick();
    });
  }

  async function typewriteLines(el, lines, speed = 40, pauseBetween = 600) {
    for (let i = 0; i < lines.length; i++) {
      if (i > 0) {
        el.appendChild(document.createElement("br"));
        await pause(pauseBetween);
      }
      await typewriteLine(el, lines[i], speed);
    }
  }

  function pause(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  // ============ PARTICLES ============
  let particleInterval = null;
  function startParticles() {
    if (particleInterval) return;
    spawnParticle();
    particleInterval = setInterval(spawnParticle, 800);
  }
  function stopParticles() {
    if (particleInterval) {
      clearInterval(particleInterval);
      particleInterval = null;
    }
  }
  function spawnParticle() {
    const hearts = ["\u2764\uFE0F", "\uD83D\uDC9B", "\uD83D\uDC96", "\uD83E\uDE77", "\u2728"];
    const p = document.createElement("div");
    p.className = "particle";
    p.textContent = hearts[Math.floor(Math.random() * hearts.length)];
    p.style.left = Math.random() * 100 + "vw";
    p.style.bottom = "-30px";
    p.style.fontSize = (14 + Math.random() * 14) + "px";
    p.style.animationDuration = (4 + Math.random() * 4) + "s";
    particlesEl.appendChild(p);
    p.addEventListener("animationend", () => p.remove());
  }

  // ============ DOT NAV ============
  function updateDotNav(idx) {
    const dots = dotNav.querySelectorAll(".dot-nav__dot");
    dots.forEach((dot, i) => {
      dot.classList.toggle("active", i === idx);
      if (i < idx) dot.classList.add("visited");
    });
  }

  // Dot click → scroll to chapter
  dotNav.addEventListener("click", (e) => {
    const dot = e.target.closest(".dot-nav__dot");
    if (!dot) return;
    const idx = Number(dot.dataset.chapter);
    if (isNaN(idx)) return;
    const section = document.getElementById("ch" + idx);
    if (section) section.scrollIntoView({ behavior: "smooth" });
  });

  // ============ INTERSECTION OBSERVER ============
  function setupObserver() {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = Number(entry.target.dataset.chapter);
            entry.target.classList.add("active");
            if (!isNaN(idx)) updateDotNav(idx);
          }
        });
      },
      { threshold: 0.4 }
    );
    document.querySelectorAll(".chapter").forEach((ch) => observer.observe(ch));
  }

  // ============ CHAPTER SEQUENCER ============
  async function runShow() {
    state.showRunning = true;
    chapters.classList.add("visible");
    dotNav.classList.add("visible");
    startParticles();

    for (let i = 0; i < TOTAL_CHAPTERS; i++) {
      state.currentChapter = i;
      const section = document.getElementById("ch" + i);
      const config = chapterConfig[i];

      // Scroll into view
      section.scrollIntoView({ behavior: "smooth" });
      await pause(600);
      section.classList.add("active");
      updateDotNav(i);

      if (config.letterMode) {
        await runLetterChapter();
        break; // final chapter, no more advancing
      }

      // Candle glow effect
      if (config.candleGlow) candleGlow.classList.add("active");
      else candleGlow.classList.remove("active");

      // Typewriter
      const tw = document.getElementById("tw" + i);
      if (tw && config.lines) {
        await typewriteLines(tw, config.lines);
      }

      if (config.interactive) {
        // Show interaction, wait for user
        await showInteraction(i);
      } else {
        // Auto-advance
        await pause(config.autoAdvanceDelay || 2000);
      }
    }
  }

  function showInteraction(chapterIdx) {
    return new Promise((resolve) => {
      if (chapterIdx === 1) {
        // Soy joke
        const el = document.getElementById("soyInteraction");
        el.classList.remove("hidden");
        const handler = () => {
          if (state.soyFlipped) return;
          state.soyFlipped = true;
          fortuneCookie.classList.add("flipped");
          setTimeout(resolve, 2500);
        };
        fortuneCookie.addEventListener("click", handler, { once: true });
      } else if (chapterIdx === 2) {
        // Postcards
        const el = document.getElementById("postcardInteraction");
        el.classList.remove("hidden");
        let flipped = 0;
        document.querySelectorAll(".postcard").forEach((card) => {
          card.addEventListener("click", () => {
            const key = card.dataset.postcard;
            if (state.postcardsFlipped[key]) return;
            state.postcardsFlipped[key] = true;
            card.classList.add("flipped");
            flipped++;
            if (flipped >= 3) setTimeout(resolve, 2000);
          });
        });
      } else if (chapterIdx === 4) {
        // Counter
        const el = document.getElementById("counterInteraction");
        el.classList.remove("hidden");
        const handler = () => {
          if (state.counterCount >= loveReasons.length) {
            setTimeout(resolve, 2000);
            return;
          }
          state.counterCount++;
          counterNumber.textContent = state.counterCount;
          counterReason.textContent = loveReasons[state.counterCount - 1];
          counterBtn.classList.remove("bounce");
          void counterBtn.offsetWidth; // trigger reflow
          counterBtn.classList.add("bounce");
          if (state.counterCount >= loveReasons.length) {
            counterBtn.querySelector(".counter-btn__label").textContent = "All found";
            setTimeout(resolve, 2500);
          }
        };
        counterBtn.addEventListener("click", handler);
      }
    });
  }

  async function runLetterChapter() {
    candleGlow.classList.remove("active");

    const lines = [
      "You're my favorite place to be.",
      "My favorite laugh.",
      "My favorite future.",
      "",
      "Love,",
      "<strong>David</strong>",
    ];

    for (let i = 0; i < lines.length; i++) {
      await pause(800);
      const line = lines[i];
      if (line === "") {
        letterText.appendChild(document.createElement("br"));
      } else {
        const p = document.createElement("div");
        p.innerHTML = line;
        p.style.opacity = "0";
        p.style.transform = "translateY(10px)";
        p.style.transition = "opacity 0.6s ease, transform 0.6s ease";
        letterText.appendChild(p);
        await pause(50);
        p.style.opacity = "1";
        p.style.transform = "translateY(0)";
      }
    }

    // Willow reveal
    await pause(1500);
    willowReveal.classList.remove("hidden");

    // Chat
    await pause(1500);
    chatSection.classList.remove("hidden");
    renderChat();

    // Hospital button
    await pause(1000);
    hospitalBtnWrap.classList.remove("hidden");
  }

  // ============ CHAT ============
  function renderChat() {
    chatMessages.innerHTML = state.chatMessages
      .map((msg) => {
        const isAI = msg.role === "assistant";
        return `<div class="chat__bubble ${isAI ? "chat__bubble--assistant" : "chat__bubble--logan"}">
          <div class="chat__bubbleLabel">${isAI ? "David" : "Logan"}</div>
          <div>${msg.text}</div>
        </div>`;
      })
      .join("");
    requestAnimationFrame(() => {
      chatMessages.scrollTop = chatMessages.scrollHeight;
    });
  }

  chatForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (state.chatLoading) return;
    const text = chatInput.value.trim();
    if (!text) return;
    sendChat(text);
  });

  async function sendChat(message) {
    state.chatMessages.push({ role: "user", text: message });
    chatInput.value = "";
    state.chatLoading = true;
    chatSendBtn.disabled = true;
    chatInput.disabled = true;
    chatStatus.textContent = "typing\u2026";
    if (state.chatMessages.length > 12) state.chatMessages = state.chatMessages.slice(-12);
    renderChat();

    try {
      const payload = {
        prompt: message,
        history: state.chatMessages.slice(-8).map((m) => ({ role: m.role, text: m.text })),
      };
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      state.chatMessages.push({ role: "assistant", text: data.reply || "I'm lost in thought." });
    } catch {
      state.chatMessages.push({ role: "assistant", text: "The AI hiccuped. Try again in a sec?" });
    } finally {
      state.chatLoading = false;
      chatSendBtn.disabled = false;
      chatInput.disabled = false;
      chatStatus.textContent = "";
      if (state.chatMessages.length > 12) state.chatMessages = state.chatMessages.slice(-12);
      renderChat();
    }
  }

  // ============ HOSPITAL LAUNCH ============
  hospitalBtn.addEventListener("click", () => {
    if (typeof window.launchHospital === "function") {
      window.launchHospital();
    }
  });

  // Called from hospital.js when exiting
  window.returnFromHospital = function () {
    const overlay = document.getElementById("hospitalOverlay");
    overlay.classList.add("hidden");
    const ch5 = document.getElementById("ch5");
    if (ch5) ch5.scrollIntoView({ behavior: "smooth" });
  };

  // ============ CURTAIN ============
  curtainBtn.addEventListener("click", async () => {
    // Unlock audio
    try {
      bgm.volume = 0.22;
      await bgm.play();
      state.musicStarted = true;
    } catch {
      // no audio file — that's fine
    }

    curtain.classList.add("fade-out");
    await pause(1000);
    curtain.style.display = "none";

    // Start the show
    runShow();
  });

  // ============ INIT ============
  setupObserver();
})();
