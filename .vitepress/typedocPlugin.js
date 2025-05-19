import { Application, JSX } from "typedoc";
import fs from "fs";
import path from "path";

/** @param {Application} app */
export function load(app) {
    app.renderer.hooks.on("head.end", (ctx) =>
        JSX.createElement("script", { src: 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9034244817339073', crossorigin: "anonymous", async: true }),
    );

  
}