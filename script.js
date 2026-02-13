const yesBtn = document.getElementById("yesBtn");
const noBtn = document.getElementById("noBtn");
const reveal = document.getElementById("reveal");
const questionBlock = document.getElementById("questionBlock");
const intro = document.getElementById("intro");
const heartsLayer = document.getElementById("heartsLayer");
const flower = document.querySelector(".flower");

noBtn.addEventListener("mouseenter", () => {
  const x = Math.random()*150 - 75;
  const y = Math.random()*80 - 40;
  noBtn.style.transform = `translate(${x}px,${y}px)`;
});

yesBtn.addEventListener("click", () => {

  questionBlock.style.display="none";
  intro.style.display="none";
  reveal.hidden=false;

  document.querySelectorAll(".stroke").forEach(path=>{
    path.style.strokeDashoffset="0";
  });

  heartsBurst();
});

flower.addEventListener("click",()=>{
  reveal.classList.toggle("secret-revealed");
  heartsBurst();
});

function heartsBurst(){
  for(let i=0;i<15;i++){
    const heart=document.createElement("div");
    heart.className="heart";
    heart.textContent="💖";
    heart.style.left=Math.random()*window.innerWidth+"px";
    heart.style.top=Math.random()*window.innerHeight+"px";
    heartsLayer.appendChild(heart);
    setTimeout(()=>heart.remove(),1200);
  }
}
