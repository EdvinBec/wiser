import { useState } from "react";

export function Brand() {
  const [clickCount, setClickCount] = useState(0);
  const [lastClickTime, setLastClickTime] = useState(0);

  const handleClick = (e: React.MouseEvent) => {
    const now = Date.now();

    // Reset if more than 1 second since last click
    if (now - lastClickTime > 1000) {
      setClickCount(1);
    } else {
      setClickCount(prev => prev + 1);
    }

    setLastClickTime(now);

    // Easter egg: Triple click spawns marching snowmen
    if (clickCount >= 2) {
      e.preventDefault();
      spawnSnowmanArmy();
      setClickCount(0);
    }
  };

  const spawnSnowmanArmy = () => {
    const snowmen = ["⛄", "☃️", "⛄", "☃️", "⛄"];
    snowmen.forEach((snowman, i) => {
      setTimeout(() => {
        const el = document.createElement("div");
        el.className = "snowman-party";
        el.textContent = snowman;
        el.style.bottom = `${Math.random() * 60 + 20}%`;
        el.style.animationDelay = `${i * 0.3}s`;
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 8500);
      }, i * 200);
    });
  };

  return (
    <a
      href="/"
      className=""
      aria-label="wiseR home"
      onClick={handleClick}
    >
      <span className="text-xl font-semibold tracking-tight">Urnik</span>
    </a>
  );
}
