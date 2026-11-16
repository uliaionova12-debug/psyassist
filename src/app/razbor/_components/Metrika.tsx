"use client";

import Script from "next/script";
import { useEffect } from "react";

import { initMetrika, reachGoal, YM_ID } from "./metrika";

export function Metrika() {
  useEffect(() => {
    if (!YM_ID) return;
    initMetrika();
    reachGoal("razbor_landing_open");
  }, []);

  if (!YM_ID) return null;
  return (
    <>
      <Script
        id="ym-tag"
        src="https://mc.yandex.ru/metrika/tag.js"
        strategy="lazyOnload"
      />
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`https://mc.yandex.ru/watch/${YM_ID}`}
          style={{ position: "absolute", left: "-9999px" }}
          alt=""
        />
      </noscript>
    </>
  );
}
