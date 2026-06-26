"use client";

import { useEffect } from "react";

export default function TwcHomeBoot() {
  useEffect(() => {
    const existing = document.querySelector('script[data-twc-home="1"]');
    if (existing) {
      return;
    }

    const script = document.createElement("script");
    script.src = "/twc-home.js?v=12";
    script.defer = true;
    script.dataset.twcHome = "1";
    document.body.appendChild(script);
  }, []);

  return null;
}
