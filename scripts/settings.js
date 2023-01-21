import CombatHud from "./combat-hud.js";
import * as HelperFunctions from "./helper-functions.js";
import { phases, outpostFactory } from "./outpost-sheet.js";
export default function registerSettings() {
    game.settings.register("hud-and-trackers", "downtimeData", {
        scope: "world",
        config: false,
        type: Object,
        default: {
            downtimeActive: false,
            actions: {
                gil: {

                },
                calyx: {

                },
                cynah: {

                },
                suoja: {

                },


            }
        },
    });
    game.settings.register("hud-and-trackers", "outpostData", {
        scope: "world",
        config: false,
        type: Object,
        default: {
            currentPhase: 0,
            outposts: {
                one: outpostFactory("one"),
                two: outpostFactory("two"),
                three: outpostFactory("three"),
            }
        },
    });
    game.settings.register("hud-and-trackers", "outpostUIState", {
        scope: "client",
        config: false,
        type: Object,
        default: {
            collapsibles: {

            }
        },
    });
    game.settings.register("hud-and-trackers", "currentURLs", {
        scope: "client",
        config: false,
        type: Object,
        default: {
            currentCharacterUrl: "",
            currentLocationUrl: "",
        },
    });
    game.settings.register("hud-and-trackers", "characterImagePath", {
        scope: "world",
        config: true,
        type: String,
        default: "/Idyllwild/Art/Characters",
    });

    game.settings.register("hud-and-trackers", "hudButtons", {
        scope: "world",
        config: false,
        type: Array,
        default: [],
    });
    game.settings.register("hud-and-trackers", "displayTags", {
        scope: "world",
        config: false,
        type: Array,
        default: [],
    });
    game.settings.register("hud-and-trackers", "globalDisplayCharacters", {
        scope: "world",
        config: false,
        type: Object,
        default: {},
    });

    game.settings.register(HelperFunctions.moduleName, "combatHudPosition", {
        scope: "client",
        config: false,
        type: Object,
        default: {},
    });
    game.settings.register(HelperFunctions.moduleName, "tokenHudPosition", {
        scope: "client",
        config: false,
        type: Object,
        default: {},
    });
    game.settings.register(HelperFunctions.moduleName, "helperHudPosition", {
        scope: "client",
        config: false,
        type: Object,
        default: {},
    });
    game.settings.register(HelperFunctions.moduleName, "savedCombat", {
        scope: "world",
        config: false,
        type: Object,
        default: {},
    });
    game.settings.register(HelperFunctions.moduleName, "savedClocks", {
        scope: "world",
        config: false,
        type: Object,
        default: {},
    });
    game.settings.register(CombatHud.ID, "currentPhase", {
        scope: "world",
        config: false,
        type: String,
        default: "fastPlayerTurn",
        onChange: (currentPhase) => {
            if (!game.user.isGM) Hooks.call("combatHudPhaseChanged", currentPhase);
        },
    });
    game.settings.register(CombatHud.ID, "currentRound", {
        scope: "world",
        config: false,
        type: Number,
        default: 0,
        onChange: (currentRound) => {
            if (!game.user.isGM) Hooks.call("combatHudRoundChanged", currentRound);
        },
    });
    game.settings.register(CombatHud.ID, "activationObject", {
        scope: "world",
        config: false,
        type: Object,
        default: {},
    });
    game.settings.register(CombatHud.ID, "activeCategories", {
        scope: "world",
        config: false,
        type: Object,
        default: {},
        // onChange: activeCategories => {
        // 	if(!game.user.isGM) Hooks.call("combatHudRoundChanged", currentRound);
        // }
    });
    game.settings.register(CombatHud.ID, "activationMaps", {
        scope: "world",
        config: false,
        type: Object,
        default: {},
        onChange: (activationMaps) => {
            if (!game.user.isGM) Hooks.call("combatHudActivationChanged", activationMaps);
        },
    });
    game.settings.register(CombatHud.ID, "combatActive", {
        scope: "world",
        config: false,
        type: Boolean,
        default: false,
        onChange: (combatActive) => {
            if (!game.user.isGM) Hooks.call("combatActiveChanged", combatActive);
        },
    });
}
