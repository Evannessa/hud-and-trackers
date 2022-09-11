export const MODULE_ID = "hud-and-trackers";
import { CharacterPopout } from "./classes/CharacterPopout.js";
import { SlideshowConfig } from "./SlideshowConfig.js";

Hooks.once("devModeReady", ({ registerPackageDebugFlag }) => {
    registerPackageDebugFlag(MODULE_ID);
});

Hooks.on("canvasReady", ({}) => {
    let isDebugging = game.modules.get("_dev-mode")?.api?.getPackageDebugValue(MODULE_ID);
    //re-render the tile config
    const appNames = {
        characterPopout: new CharacterPopout(),
    };
    const appName = "characterPopout";
    isDebugging = true; //TODO: remove this
    if (game.user.isGM && isDebugging) {
        if (!game[appName]) game[appName] = appNames[appName]; //.render(true)
        game[appName].render(true);
    }
});

export function autoRender(force, ...args) {
    try {
        const isDebugging = game.modules.get("_dev-mode")?.api?.getPackageDebugValue(MODULE_ID);

        if (force || isDebugging) {
            if (type === "journal") {
                game.journal.getName(name).sheet.render(true);
            }
        }
    } catch (e) {}
}

export function log(force, ...args) {
    try {
        const isDebugging = game.modules.get("_dev-mode")?.api?.getPackageDebugValue(MODULE_ID);

        if (force || isDebugging) {
            console.log(MODULE_ID, "|", ...args);
        }
    } catch (e) {}
}

// ...
