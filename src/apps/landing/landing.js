import { HTML_PAGE_UI_TEXT_AR } from "../../shared/constants/ui-text.ar.js";
import { applyPageCopy } from "../../shared/ui/apply-page-copy.js";
import { createIcon } from "../../shared/ui/visual/icons.js";
import { createHeroScarfSVG } from "../../shared/ui/visual/svg-hero-scarf.js";
import { createHowStepSVG } from "../../shared/ui/visual/svg-how-steps.js";
import { createProblemSVG } from "../../shared/ui/visual/svg-problem-context.js";

applyPageCopy(HTML_PAGE_UI_TEXT_AR.landing);

const heroScarfSlot = document.querySelector(".landing-hero-scarf-slot");
const demoSlot = document.querySelector(".landing-demo-indicator");
const problemVisualSlot = document.querySelector(".landing-problem-visual-slot");
const howVisualSlots = Array.from(document.querySelectorAll(".landing-how-visual-slot"));
const problemCards = Array.from(document.querySelectorAll(".landing-step-card")).slice(0, 3);
const flowCards = Array.from(document.querySelectorAll(".flow-card"));

function renderPlatformStrip() {
  const container = document.querySelector(".platform-strip");

  if (!container) return;

  const platforms = [
    "whatsapp",
    "instagram",
    "messenger",
    "telegram",
    "facebook",
    "tiktok",
  ];

  container.innerHTML = platforms
    .map((name) => createIcon(name, "md"))
    .join("");
}

function setupReveal() {
  const elements = document.querySelectorAll(".reveal");

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 },
  );

  elements.forEach((el) => observer.observe(el));
}

if (heroScarfSlot && !heroScarfSlot.querySelector(".landing-hero-scarf")) {
  heroScarfSlot.innerHTML = createHeroScarfSVG();
}

renderPlatformStrip();
setupReveal();

if (demoSlot) {
  demoSlot.innerHTML = createIcon("arrow", "sm");
}

if (problemVisualSlot && !problemVisualSlot.querySelector(".landing-problem-visual")) {
  problemVisualSlot.innerHTML = createProblemSVG();
}

howVisualSlots.forEach((slot) => {
  const visualName = slot.getAttribute("data-how-visual");

  if (visualName && !slot.querySelector(".landing-how-card-visual")) {
    slot.innerHTML = createHowStepSVG(visualName);
  }
});

[
  ["alert", "lg", problemCards[0], "landing-step-card--iconic"],
  ["help", "lg", problemCards[1], "landing-step-card--iconic"],
  ["clock", "lg", problemCards[2], "landing-step-card--iconic"],
  ["box", "md", flowCards[0]],
  ["send", "md", flowCards[1]],
].forEach(([iconName, size, slot, className]) => {
  if (slot && !slot.querySelector(".ui-icon")) {
    if (className) {
      slot.classList.add(className);
    }

    slot.insertAdjacentHTML("afterbegin", createIcon(iconName, size));
  }
});
