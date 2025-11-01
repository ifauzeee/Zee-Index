"use client";

import React from "react";

const ThemeInitializer = () => {
  const script = `
    (function() {
      try {
        const storedState = localStorage.getItem("zee-index-storage");
        let theme = "dark"; 

        if (storedState) {
          const state = JSON.parse(storedState);
          theme = state.state.theme || "dark";
        }
        
        const root = document.documentElement;
        root.className = theme;
        root.style.colorScheme = theme;
      } catch (e) {
        console.error("Failed to apply persisted theme", e);
      }
    })();
  `;

  return <script dangerouslySetInnerHTML={{ __html: script }} />;
};

export default React.memo(ThemeInitializer);
