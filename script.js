const yesBtn = document.getElementById("yesBtn");
const noBtn = document.getElementById("noBtn");
const questionBlock = document.getElementById("questionBlock");
const intro = document.getElementById("intro");
const reveal = document.getElementById("reveal");
const heartsLayer = document.getElementById("heartsLayer");
const flowerEl = document.querySelector(".flower");

let noDodgeEnabled = true;

/**
 * "No" button playfully dodges on hover/focus.
 */
function dodgeNoButton() {
  if (!noDodgeEnabled) return;

  const rangeX = 140;
  const rangeY = 70;

  const dx = (Math.random() * rangeX * 2) - rangeX;
  const dy = (Math.random() * rangeY * 2) - rangeY;

  noBtn.style.transform = `translate(${dx}px, ${dy}px)`;
}

noBtn.addEventListener("mouseenter", dodgeNoButton);
noBtn.addEventListener("focus", dodgeNoButton);

noBtn.addEventListener("click", () => {
  noBtn.textContent = "Nice try 🙃";
  dodgeNoButton();
});

/**
 * Hearts burst effect
 */
function heartsBurst(originEl) {
  if (!originEl) return;

  const rect = originEl.getBoundingClientRect();
  const originX = rect.left + rect.width / 2;
  const originY = rect.top + rect.height / 2;

  const hearts = ["💗", "💖", "💕", "💘", "💝"];
  const count = 18;

  for (let i = 0; i < count; i++) {
    const heart = document.createElement("div");
    heart.className = "heart";
    heart.textContent = hearts[Math.floor(Math.random() * hearts.length)];

    const spreadX = (Math.random() * 180) - 90;
    const spreadY = (Math.random() * 60) - 30;

    heart.style.left = `${originX + spreadX}px`;
    heart.style.top = `${originY + spreadY}px`;

    const size = 14 + Math.random() * 14;
    heart.style.fontSize = `${size}px`;

    heart.style.animationDelay = `${Math.random() * 0.15}s`;

    heartsLayer.appendChild(heart);
    setTimeout(() => heart.remove(), 1500);
  }
}

/**
 * Animate SVG drawing (stroke dash)
 */
function animateFlowerDraw() {
  const paths = reveal.querySelectorAll("path.stroke");
  let totalDuration = 0;

  paths.forEach((p, idx) => {
    const len = Math.ceil(p.getTotalLength());
    p.style.strokeDasharray = `${len}`;
    p.style.strokeDashoffset = `${len}`;
    p.style.opacity = "1";

    const duration = 0.7 + (len / 900);
    const delay = idx * 0.18;

    p.style.transition = "none";
    p.getBoundingClientRect(); // reflow

    p.style.transition = `stroke-dashoffset ${duration}s ease ${delay}s`;

    requestAnimationFrame(() => {
      p.style.strokeDashoffset = "0";
    });

    totalDuration = Math.max(totalDuration, (duration + delay));
  });

  return totalDuration;
}

yesBtn.addEventListener("click", () => {
  noDodgeEnabled = false;
  noBtn.style.transform = "translate(0,0)";

  heartsBurst(yesBtn);

  questionBlock.classList.add("fade-out");
  intro.classList.add("fade-out");

  setTimeout(() => {
    questionBlock.hidden = true;
    intro.hidden = true;

    reveal.hidden = false;
    reveal.classList.add("fade-in");

    const total = animateFlowerDraw();

    // small glow pulse after draw finishes
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
 * ✅ Hidden message reveal (ONLY on flower click, animates via CSS)
 */
if (flowerEl) {
  flowerEl.addEventListener("click", () => {
    if (reveal.hidden) return; // only after Yes flow
    reveal.classList.toggle("secret-revealed");
    heartsBurst(flowerEl);
  });
}

/**
 * Optional: tap anywhere (not buttons) for tiny heart on mobile
 */
document.addEventListener("click", (e) => {
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
