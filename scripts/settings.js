import CombatHud from "./combat-hud.js";
import * as HelperFunctions from "./helper-functions.js";

export default function registerSettings() {
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
