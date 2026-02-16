/* =========================================================
   THE VAULT — Modular puzzle engine (HTML/CSS/JS separated)
   - Layer 1: 3 hidden sigils (hover / drag / scroll reveal)
   - Layer 2: 6 nodes, 3 correct in order; elegant feedback
   - Layer 3: memory gate with normalized input + hashed compare
   - Final: vault hash built from sigils + sequence + memory; cinematic unlock
   ========================================================= */

/** ---------------------------
 *  State + Config
 *  ---------------------------
 *  To personalize the Memory Gate:
 *  1) Change VAULT_CONFIG.memory.question
 *  2) Change VAULT_CONFIG.memory.answerHash to SHA-256 of the normalized answer
 *     (normalize = trim, lowercase, collapse spaces)
 */
const VAULT_CONFIG = {
  sigils: {
    total: 3,
    // tokens are what we store when found (not visible to the user)
    tokensById: {
      sigilHover: "aurelia",
      sigilLens: "noctis",
      sigilScroll: "rose",
    }
  },

  sequence: {
    // ONLY 3 are correct, must be clicked in this exact order
    correctOrder: ["2", "5", "1"], // outputs "2-5-1"
  },

  memory: {
    question: "What single word do we always come back to?",
    // SHA-256("starlight") after normalization (trim/lower/collapse spaces)
    // Normalized example: "Starlight  " -> "starlight"
    answerHash: "1da0672bd372f181d79fd5391aaeda10d256ebfd95ddb09ab9b51e52affbdbfc",
  },

  final: {
    // Expected final vault hash (computed from:
    // sigils:aurelia,noctis,rose | seq:2-5-1 | mem:1 | ans:<answerHash>)
    expectedVaultHash: "fa2b2113f0eada5ac9a7ffd1e6b079a56371a6ccae0d5a2b60068972884dd882"
  }
};

const state = {
  sigilsFound: new Set(),     // stores token strings
  foundSigilIds: new Set(),   // stores DOM ids so you can’t double-collect
  sequenceProgress: [],       // clicked node ids in order
  sequenceKey: null,          // "2-5-1"
  memoryPass: false,
  unlocked: false
};

/** ---------------------------
 *  Utilities
 *  --------------------------- */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function normalizeAnswer(raw) {
  return raw.trim().toLowerCase().replace(/\s+/g, " ");
}

async function sha256Hex(text) {
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest("SHA-256", enc.encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function setPill(el, text, live = false) {
  el.innerHTML = "";
  const pill = document.createElement("span");
  pill.className = "pill" + (live ? " is-live" : " is-muted");
  pill.textContent = text;
  el.appendChild(pill);
}

/** Soft chime (no files) */
function makeChime() {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  return (type = "good") => {
    const t0 = ctx.currentTime;
    const o1 = ctx.createOscillator();
    const o2 = ctx.createOscillator();
    const g = ctx.createGain();

    o1.type = "sine";
    o2.type = "triangle";

    const base = type === "good" ? 520 : 220;
    const top  = type === "good" ? 880 : 260;

    o1.frequency.setValueAtTime(base, t0);
    o2.frequency.setValueAtTime(top,  t0);

    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(type === "good" ? 0.06 : 0.045, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + (type === "good" ? 0.25 : 0.18));

    o1.connect(g);
    o2.connect(g);
    g.connect(ctx.destination);

    o1.start(t0);
    o2.start(t0);
    o1.stop(t0 + 0.3);
    o2.stop(t0 + 0.3);
  };
}
const chime = makeChime();

/** ---------------------------
 *  HUD updates
 *  --------------------------- */
function updateHUD() {
  const hudSigils = $("#hudSigils");
  const hudSeq = $("#hudSequence");
  const hudMem = $("#hudMemory");
  const seqPill = $("#sequenceKeyPill");

  // Sigils
  const count = state.sigilsFound.size;
  if (count === 0) {
    setPill(hudSigils, `0 / ${VAULT_CONFIG.sigils.total}`, false);
  } else {
    hudSigils.innerHTML = "";
    // show subtle “tokens” as pills
    const tally = document.createElement("span");
    tally.className = "pill is-live";
    tally.textContent = `${count} / ${VAULT_CONFIG.sigils.total}`;
    hudSigils.appendChild(tally);

    // (optional) tiny token hints, still subtle
    Array.from(state.sigilsFound).forEach(tok => {
      const p = document.createElement("span");
      p.className = "pill";
      p.textContent = tok;
      hudSigils.appendChild(p);
    });
  }

  // Sequence
  if (!state.sequenceKey) {
    setPill(hudSeq, "—", false);
    seqPill.textContent = "—";
    seqPill.classList.remove("is-live");
    seqPill.classList.add("is-muted");
  } else {
    setPill(hudSeq, state.sequenceKey, true);
    seqPill.textContent = state.sequenceKey;
    seqPill.classList.add("is-live");
    seqPill.classList.remove("is-muted");
  }

  // Memory
  if (!state.memoryPass) {
    setPill(hudMem, "locked", false);
  } else {
    setPill(hudMem, "verified", true);
  }
}

/** ---------------------------
 *  Layer 1 — Sigils (3 collectibles)
 *  - hover-reveal clue
 *  - draggable object clue
 *  - scroll-triggered reveal clue
 *  --------------------------- */
function collectSigilById(sigilBtnId) {
  if (state.unlocked) return;
  if (state.foundSigilIds.has(sigilBtnId)) return;

  const token = VAULT_CONFIG.sigils.tokensById[sigilBtnId];
  if (!token) return;

  state.foundSigilIds.add(sigilBtnId);
  state.sigilsFound.add(token);

  const btn = document.getElementById(sigilBtnId);
  if (btn) btn.classList.add("is-found");

  chime("good");
  updateHUD();
}

function initLayer1_Sigils() {
  // (1) Hover reveal: sigil is present but very low opacity until hover
  $("#sigilHover")?.addEventListener("click", () => collectSigilById("sigilHover"));

  // (2) Draggable “lens” clue: align lens over seam to make sigil subtly available
  const lens = $("#lens");
  const wrap = $(".lens-wrap");
  const sigilLens = $("#sigilLens");

  if (lens && wrap && sigilLens) {
    let dragOffsetX = 0;
    let dragOffsetY = 0;

    lens.addEventListener("dragstart", (e) => {
      const rect = lens.getBoundingClientRect();
      dragOffsetX = e.clientX - rect.left;
      dragOffsetY = e.clientY - rect.top;
      e.dataTransfer.setData("text/plain", "lens");
      // reduce default ghost image
      const img = new Image();
      img.src = "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='1' height='1'></svg>";
      e.dataTransfer.setDragImage(img, 0, 0);
    });

    wrap.addEventListener("dragover", (e) => e.preventDefault());
    wrap.addEventListener("drop", (e) => {
      e.preventDefault();
      const rect = wrap.getBoundingClientRect();
      const x = Math.min(Math.max(0, e.clientX - rect.left - dragOffsetX), rect.width - lens.offsetWidth);
      const y = Math.min(Math.max(0, e.clientY - rect.top - dragOffsetY), rect.height - lens.offsetHeight);
      lens.style.left = `${x}px`;
      lens.style.top = `${y}px`;

      // Alignment check: lens center near seam at ~52% of wrap width
      const lensCenterX = x + lens.offsetWidth / 2;
      const seamX = rect.width * 0.52;
      const aligned = Math.abs(lensCenterX - seamX) < 22;

      wrap.classList.toggle("is-aligned", aligned);
      if (aligned) {
        // make sigil discoverable but still subtle
        sigilLens.style.pointerEvents = "auto";
      } else {
        sigilLens.style.pointerEvents = "none";
      }
    });

    // sigil only clickable after alignment
    sigilLens.style.pointerEvents = "none";
    sigilLens.addEventListener("click", () => {
      if (wrap.classList.contains("is-aligned")) collectSigilById("sigilLens");
    });
  }

  // (3) Scroll-triggered reveal: intersection observer toggles hidden sigil
  const sentinel = $("#scrollSentinel");
  const sigilScroll = $("#sigilScroll");
  if (sentinel && sigilScroll) {
    const io = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (entry?.isIntersecting) {
        sigilScroll.classList.add("is-revealed");
      }
    }, { threshold: 0.6 });

    io.observe(sentinel);

    sigilScroll.addEventListener("click", () => {
      if (sigilScroll.classList.contains("is-revealed")) collectSigilById("sigilScroll");
    });
  }
}

/** ---------------------------
 *  Layer 2 — Pattern Sequence
 *  - 6 nodes; only 3 are correct in order
 *  - correct: glow + soft chime
 *  - incorrect: dim + reset (no alerts)
 *  --------------------------- */
function resetSequence(nodes) {
  state.sequenceProgress = [];
  state.sequenceKey = null;

  nodes.forEach(n => {
    n.classList.remove("is-correct", "is-wrong");
    // subtle dim pulse is handled by class toggles only
  });

  updateHUD();
}

function initLayer2_Sequence() {
  const nodes = $$(".node");
  const correct = VAULT_CONFIG.sequence.correctOrder;

  nodes.forEach(node => {
    node.addEventListener("click", () => {
      if (state.unlocked) return;

      const id = node.dataset.node;
      const expected = correct[state.sequenceProgress.length];

      // Clear wrong styles quickly
      nodes.forEach(n => n.classList.remove("is-wrong"));

      if (id === expected) {
        state.sequenceProgress.push(id);
        node.classList.add("is-correct");
        chime("good");

        if (state.sequenceProgress.length === correct.length) {
          state.sequenceKey = state.sequenceProgress.join("-");
          updateHUD();
        } else {
          updateHUD();
        }
      } else {
        // elegant failure: dim + reset
        chime("bad");
        nodes.forEach(n => n.classList.add("is-wrong"));
        // small delay then reset visuals + progress
        setTimeout(() => resetSequence(nodes), 380);
      }
    });
  });

  resetSequence(nodes);
}

/** ---------------------------
 *  Layer 3 — Memory Gate (hashed compare)
 *  - normalize input
 *  - hash with SHA-256
 *  - compare to stored hash
 *  --------------------------- */
function initLayer3_Memory() {
  $("#memoryQuestion").textContent = VAULT_CONFIG.memory.question;

  const input = $("#memoryInput");
  const btn = $("#memorySubmitBtn");
  const feedback = $("#memoryFeedback");

  async function verify() {
    if (state.unlocked) return;
    const raw = input.value ?? "";
    const normalized = normalizeAnswer(raw);
    if (!normalized) {
      feedback.textContent = "A quiet answer…";
      feedback.className = "memory-feedback nope";
      return;
    }

    const hashed = await sha256Hex(normalized);
    const ok = hashed === VAULT_CONFIG.memory.answerHash;

    if (ok) {
      state.memoryPass = true;
      feedback.textContent = "Verified. The Vault remembers.";
      feedback.className = "memory-feedback ok";
      chime("good");
    } else {
      state.memoryPass = false;
      feedback.textContent = "Not quite. Try again, softly.";
      feedback.className = "memory-feedback nope";
      chime("bad");
    }

    updateHUD();
  }

  btn.addEventListener("click", verify);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") verify();
  });
}

/** ---------------------------
 *  Final Unlock
 *  - internally assemble vault hash using sigils + sequence + memory result
 *  - if matches expected, run cinematic unlock animation
 *  - reveal “Our Universe”
 *  --------------------------- */
async function buildVaultMaterial() {
  // Keep sigils in a stable order so hashes are consistent.
  // If you prefer “found order”, store an array instead of a Set.
  const sigilsSorted = Array.from(state.sigilsFound).sort();

  const seq = state.sequenceKey || "—";
  const mem = state.memoryPass ? "1" : "0";

  // Include the hashed answer (not the plaintext) as part of the final vault material.
  const ansHash = VAULT_CONFIG.memory.answerHash;

  return `sigils:${sigilsSorted.join(",")}|seq:${seq}|mem:${mem}|ans:${ansHash}`;
}

async function attemptUnlock() {
  if (state.unlocked) return;

  // Require all 3 layers completed
  if (state.sigilsFound.size !== VAULT_CONFIG.sigils.total) return softNudge("Find the three sigils.");
  if (!state.sequenceKey) return softNudge("Complete the constellation sequence.");
  if (!state.memoryPass) return softNudge("Verify the memory gate.");

  const material = await buildVaultMaterial();
  const vaultHash = await sha256Hex(material);

  if (vaultHash === VAULT_CONFIG.final.expectedVaultHash) {
    await runCinematicUnlock();
    revealUniverse();
    state.unlocked = true;
  } else {
    // quiet fail (no alerts): subtle dim + reset just the sequence to discourage brute force
    softNudge("The Vault stayed closed.");
    const nodes = $$(".node");
    nodes.forEach(n => n.classList.add("is-wrong"));
    setTimeout(() => nodes.forEach(n => n.classList.remove("is-wrong")), 420);
  }
}

function softNudge(text) {
  // Elegant micro-feedback: re-use memory feedback line so we don’t add clutter.
  const feedback = $("#memoryFeedback");
  if (!feedback) return;
  feedback.textContent = text;
  feedback.className = "memory-feedback nope";
}

function revealUniverse() {
  const universe = $("#universe");
  if (!universe) return;
  universe.hidden = false;
  universe.classList.add("reveal-fade");
  universe.scrollIntoView({ behavior: "smooth", block: "start" });
}

/** ---------------------------
 *  Cinematic Unlock Animation (blur, particles, glow sweep, fade)
 *  --------------------------- */
function particleSystem(canvas) {
  const ctx = canvas.getContext("2d");
  let w = 1, h = 1, dpr = Math.max(1, window.devicePixelRatio || 1);

  const particles = [];
  const N = 110;

  function resize() {
    w = canvas.clientWidth || window.innerWidth;
    h = canvas.clientHeight || window.innerHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function seed() {
    particles.length = 0;
    for (let i = 0; i < N; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: 0.6 + Math.random() * 1.8,
        vx: (-0.15 + Math.random() * 0.3),
        vy: (-0.08 + Math.random() * 0.16),
        a: 0.12 + Math.random() * 0.28
      });
    }
  }

  function step() {
    ctx.clearRect(0, 0, w, h);

    // subtle rose-gold particles
    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < -20) p.x = w + 20;
      if (p.x > w + 20) p.x = -20;
      if (p.y < -20) p.y = h + 20;
      if (p.y > h + 20) p.y = -20;

      ctx.beginPath();
      ctx.globalAlpha = p.a;
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,183,200,1)";
      ctx.fill();
    }

    ctx.globalAlpha = 1;
    raf = requestAnimationFrame(step);
  }

  let raf = 0;
  function start() {
    resize();
    seed();
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(step);
  }
  function stop() {
    cancelAnimationFrame(raf);
    ctx.clearRect(0, 0, w, h);
  }

  window.addEventListener("resize", () => {
    resize();
    seed();
  });

  return { start, stop };
}

async function runCinematicUnlock() {
  const overlay = $("#cinematicOverlay");
  const canvas = $("#particleCanvas");
  if (!overlay || !canvas) return;

  const ps = particleSystem(canvas);

  document.body.classList.add("is-unlocking");
  overlay.classList.add("is-on");

  // begin particles + subtle sound
  ps.start();
  chime("good");

  // staged fade / sweep
  await wait(650);
  chime("good");
  await wait(650);

  // end sequence
  overlay.classList.remove("is-on");
  ps.stop();
  await wait(200);

  document.body.classList.remove("is-unlocking");
}

function wait(ms) {
  return new Promise(res => setTimeout(res, ms));
}

/** ---------------------------
 *  Modular Challenge Registry
 *  - makes it easy to add new puzzles later
 *  --------------------------- */
const challenges = [
  { id: "layer1_sigils", init: initLayer1_Sigils },
  { id: "layer2_sequence", init: initLayer2_Sequence },
  { id: "layer3_memory", init: initLayer3_Memory },
];

function initVault() {
  // Init modules
  challenges.forEach(ch => ch.init());

  // Unlock button
  $("#attemptUnlockBtn")?.addEventListener("click", attemptUnlock);

  // Initial HUD
  updateHUD();
}

document.addEventListener("DOMContentLoaded", initVault);
