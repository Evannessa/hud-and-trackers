Hooks.on("ready", () => {
    game.actionHud = new ActionHud().render(true);
});
export class ActionHud extends Application {
    constructor() {
        super();
    }
    /** @override */
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            popOut: true,
            submitOnChange: false,
            closeOnSubmit: false,
            minimizable: false,
            resizable: false,
            background: "none",
            template: "modules/hud-and-trackers/templates/action-hud.hbs",
            id: "action-hud",
            title: "action-hud",
        });
    }
}
