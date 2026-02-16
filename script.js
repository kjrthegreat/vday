const correctCode = "4378";
let input = "";

const display = document.getElementById("display");
const buttons = document.querySelectorAll(".keypad button");
const unlocked = document.getElementById("unlocked");
const vaultCard = document.getElementById("vaultCard");

buttons.forEach(btn => {
  btn.addEventListener("click", () => {
    const value = btn.textContent;

    if (value === "⌫") {
      input = input.slice(0, -1);
    } else if (value === "✓") {
      if (input === correctCode) {
        vaultCard.classList.add("fade");
        setTimeout(() => {
          unlocked.classList.add("active");
        }, 600);
      } else {
        input = "";
        vaultCard.style.animation = "shake 0.3s";
        setTimeout(() => {
          vaultCard.style.animation = "";
        }, 300);
      }
    } else {
      if (input.length < 4) {
        input += value;
      }
    }

    display.textContent = input.padEnd(4, "•");
  });
});
