game.settings.registerMenu("hud-and-trackers", "hudSettingsMenu", {
    name: "Hud Settings Menu",
    label: "Settings Menu", // The text label used in the button
    hint: "A description of what will occur in the submenu dialog.",
    icon: "fas fa-bars", // A Font Awesome icon used in the submenu button
    type: HATSettingsMenu, // A FormApplication subclass
    restricted: true, // Restrict this submenu to gamemaster only?
});

await game.settings.register("hud-and-trackers", "characterImagePath", {
    scope: "world",
    config: true,
    type: String,
    default: "/Idyllwild/Art/Characters",
});

//this should be a client setting instead
await game.settings.register("hud-and-trackers", "hudButtons", {
    scope: "world",
    config: false,
    type: Array,
    default: [],
});
await game.settings.register("hud-and-trackers", "displayTags", {
    scope: "world",
    config: false,
    type: Array,
    default: [],
});
await game.settings.register("hud-and-trackers", "globalDisplayCharacters", {
    scope: "world",
    config: false,
    type: Object,
    default: {},
});

await game.settings.register(HelperFunctions.moduleName, "combatHudPosition", {
    scope: "client",
    config: false,
    type: Object,
    default: {},
});
await game.settings.register(HelperFunctions.moduleName, "tokenHudPosition", {
    scope: "client",
    config: false,
    type: Object,
    default: {},
});
await game.settings.register(HelperFunctions.moduleName, "helperHudPosition", {
    scope: "client",
    config: false,
    type: Object,
    default: {},
});
await game.settings.register(HelperFunctions.moduleName, "savedCombat", {
    scope: "world",
    config: false,
    type: Object,
    default: {},
});
await game.settings.register(HelperFunctions.moduleName, "savedClocks", {
    scope: "world",
    config: false,
    type: Object,
    default: {},
});
await game.settings.register(CombatHud.ID, "currentPhase", {
    scope: "world",
    config: false,
    type: String,
    default: "fastPlayerTurn",
    onChange: (currentPhase) => {
        if (!game.user.isGM) Hooks.call("combatHudPhaseChanged", currentPhase);
    },
});
await game.settings.register(CombatHud.ID, "currentRound", {
    scope: "world",
    config: false,
    type: Number,
    default: 0,
    onChange: (currentRound) => {
        if (!game.user.isGM) Hooks.call("combatHudRoundChanged", currentRound);
    },
});
await game.settings.register(CombatHud.ID, "activationObject", {
    scope: "world",
    config: false,
    type: Object,
    default: {},
});
await game.settings.register(CombatHud.ID, "activeCategories", {
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

/**
 * For more information about FormApplications, see:
 * https://foundryvtt.wiki/en/development/guides/understanding-form-applications
 */
class HATSettingsMenu extends FormApplication {
    // lots of other things...

    getData() {
        return game.settings.get("myModuleName", "myComplexSettingName");
    }

    _updateObject(event, formData) {
        const data = expandObject(formData);
        game.settings.set("myModuleName", "myComplexSettingName", data);
    }
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            classes: ["form", "hud-and-trackers"],
            popOut: true,
            template: `/modules/hud-and-trackers/templates/inner-scene-display/scene-map.hbs`,
            id: "inner-scene-display",
            title: "Inner Scene Display",
            resizable: true,
        });
    }
}
