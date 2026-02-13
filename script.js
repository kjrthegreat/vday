// Valentine site interactions for Paige 💗

const yesBtn = document.getElementById("yesBtn");
const noBtn = document.getElementById("noBtn");
const questionBlock = document.getElementById("questionBlock");
const intro = document.getElementById("intro");
const reveal = document.getElementById("reveal");
const heartsLayer = document.getElementById("heartsLayer");

let noDodgeEnabled = true;

/**
 * Make the "No" button playfully dodge to a nearby spot on hover/focus.
 * It moves within a bounded range so it doesn't fly off-screen.
 */
function dodgeNoButton() {
  if (!noDodgeEnabled) return;

  const rangeX = 120; // px
  const rangeY = 60;  // px

  // Random direction each time
  const dx = (Math.random() * rangeX * 2) - rangeX;
  const dy = (Math.random() * rangeY * 2) - rangeY;

  // Apply transform to move it
  noBtn.style.transform = `translate(${dx}px, ${dy}px)`;
}

// Accessibility: also dodge on keyboard focus (optional playful)
noBtn.addEventListener("mouseenter", dodgeNoButton);
noBtn.addEventListener("focus", dodgeNoButton);

// If she manages to click "No", we still keep it cute
noBtn.addEventListener("click", () => {
  noBtn.textContent = "Nice try 🙃";
  dodgeNoButton();
});

/**
 * Hearts burst effect on Yes click
 */
function heartsBurst(originEl) {
  const rect = originEl.getBoundingClientRect();
  const originX = rect.left + rect.width / 2;
  const originY = rect.top + rect.height / 2;

  const hearts = ["💗", "💖", "💕", "💘", "💝"];
  const count = 18;

  for (let i = 0; i < count; i++) {
    const heart = document.createElement("div");
    heart.className = "heart";
    heart.textContent = hearts[Math.floor(Math.random() * hearts.length)];

    // Random scatter
    const spreadX = (Math.random() * 180) - 90;
    const spreadY = (Math.random() * 60) - 30;

    heart.style.left = `${originX + spreadX}px`;
    heart.style.top = `${originY + spreadY}px`;

    // Random size
    const size = 14 + Math.random() * 14;
    heart.style.fontSize = `${size}px`;

    // Random delay (stagger)
    heart.style.animationDelay = `${Math.random() * 0.15}s`;

    heartsLayer.appendChild(heart);

    // Cleanup
    setTimeout(() => heart.remove(), 1500);
  }
}

/**
 * Prepare SVG stroke drawing:
 * - Set stroke-dasharray & dashoffset to path length
 * - Animate dashoffset to 0
 */
function animateFlowerDraw() {
  const paths = reveal.querySelectorAll("path.stroke");
  let totalDuration = 0;

  paths.forEach((p, idx) => {
    const len = Math.ceil(p.getTotalLength());
    p.style.strokeDasharray = `${len}`;
    p.style.strokeDashoffset = `${len}`;
    p.style.opacity = "1";

    // Slightly different durations per stroke so it feels hand-drawn
    const duration = 0.7 + (len / 900); // seconds-ish scaled
    const delay = idx * 0.18;

    p.style.transition = "none";
    // Force reflow so transitions apply properly
    p.getBoundingClientRect();

    p.style.transition = `stroke-dashoffset ${duration}s ease ${delay}s`;

    // Trigger draw
    requestAnimationFrame(() => {
      p.style.strokeDashoffset = "0";
    });

    totalDuration = Math.max(totalDuration, (duration + delay));
  });

  return totalDuration; // seconds
}

yesBtn.addEventListener("click", () => {
  // Stop the No button dodging after she says yes (optional)
  noDodgeEnabled = false;
  noBtn.style.transform = "translate(0,0)";

  heartsBurst(yesBtn);

  // Fade out question area + intro (keep it smooth)
  questionBlock.classList.add("fade-out");
  intro.classList.add("fade-out");

  // After fade, reveal flower
  setTimeout(() => {
    questionBlock.hidden = true;
    intro.hidden = true;

    reveal.hidden = false;
    reveal.classList.add("fade-in");

    const total = animateFlowerDraw();

    // Optionally add a tiny glow pulse after the drawing finishes
    setTimeout(() => {
      const flower = document.querySelector(".flower");
      if (flower) {
        flower.style.transition = "transform 0.8s ease, filter 0.8s ease";
        flower.style.transform = "scale(1.01)";
      }
    }, (total * 1000) + 150);
  }, 480);
});

/**
 * Optional: allow tapping anywhere to spawn a small heart on mobile.
 * Keeps it fun but subtle.
 */
document.addEventListener("click", (e) => {
  // Avoid interfering with normal button UX (still fine if it triggers)
  if (e.target.closest("button")) return;

  const heart = document.createElement("div");
  heart.className = "heart";
  heart.textContent = "💗";
  heart.style.left = `${e.clientX}px`;
  heart.style.top = `${e.clientY}px`;
  heart.style.fontSize = `${14 + Math.random() * 10}px`;
  heartsLayer.appendChild(heart);
  setTimeout(() => heart.remove(), 1400);
});
