import { useEffect } from "react";

/**
 * Adds fun winter quirks to the app:
 * 1. Christmas tree that appears when scrolling
 * 2. Snowflake cursor on Fridays
 * 3. Secret snow storm on typing "snow"
 */
export function useWinterQuirks() {
  useEffect(() => {
    // Scroll handler for Christmas tree
    const handleScroll = () => {
      if (window.scrollY > 100) {
        document.body.classList.add("scrolled");
      } else {
        document.body.classList.remove("scrolled");
      }
    };

    // Check if it's Friday and add snowflake cursor
    const checkFriday = () => {
      const now = new Date();
      const isFriday = now.getDay() === 5;
      if (isFriday) {
        document.body.classList.add("winter-friday");
      } else {
        document.body.classList.remove("winter-friday");
      }
    };

    // Secret code: Type "snow" anywhere to trigger snow storm
    let typedKeys: string[] = [];
    const secretCode = "snow";

    const handleKeyPress = (e: KeyboardEvent) => {
      // Ignore if typing in input/textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      typedKeys.push(e.key.toLowerCase());
      if (typedKeys.length > secretCode.length) {
        typedKeys.shift();
      }

      if (typedKeys.join("") === secretCode) {
        triggerSnowStorm();
        typedKeys = [];
      }
    };

    const triggerSnowStorm = () => {
      const snowflakes = ["❄️", "❅", "❆"];
      const count = 50;

      for (let i = 0; i < count; i++) {
        setTimeout(() => {
          const flake = document.createElement("div");
          flake.textContent = snowflakes[Math.floor(Math.random() * snowflakes.length)];
          flake.style.position = "fixed";
          flake.style.top = "-20px";
          flake.style.left = `${Math.random() * 100}%`;
          flake.style.fontSize = `${Math.random() * 1.5 + 0.8}rem`;
          flake.style.opacity = `${Math.random() * 0.6 + 0.4}`;
          flake.style.pointerEvents = "none";
          flake.style.zIndex = "9999";
          flake.style.animation = `snowfall ${Math.random() * 3 + 2}s linear forwards`;

          document.body.appendChild(flake);
          setTimeout(() => flake.remove(), 5000);
        }, i * 50);
      }
    };

    window.addEventListener("scroll", handleScroll);
    window.addEventListener("keypress", handleKeyPress);
    handleScroll(); // Check initial scroll position
    checkFriday(); // Check if today is Friday

    // Check Friday status every hour (in case user keeps tab open overnight)
    const fridayInterval = setInterval(checkFriday, 1000 * 60 * 60);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("keypress", handleKeyPress);
      clearInterval(fridayInterval);
      document.body.classList.remove("scrolled", "winter-friday");
    };
  }, []);
}
