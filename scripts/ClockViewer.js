"use strict";
import { getClocksByUser, Clock } from "./clock.js";

/**
 * Define your class that extends FormApplication
 */

export class ClockViewer extends FormApplication {
    constructor() {
        super();
        let savedClocks = getClocksByUser(game.userId);
        if (savedClocks) {
            this.clocks = savedClocks;
        } else {
            this.clocks = {};
        }
    }

    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            classes: ["form"],
            popOut: true,
            submitOnChange: false,
            closeOnSubmit: false,
            template: `modules/hud-and-trackers/templates/clock-viewer.html`,
            id: "clockViewer",
            title: "Clock Viewer",
        });
    }

    async getData() {
        let savedClocks = getClocksByUser(game.userId); //await game.settings.get("hud-and-trackers", "savedClocks");
        if (savedClocks) {
            this.clocks = Object.values(savedClocks);
        } else {
            this.clocks = [];
        }
        // Send data to the template
        return {
            clocks: this.clocks,
        };
    }

    async activateListeners(html) {
        super.activateListeners(html);
        let savedClocks = getClocksByUser(game.userId); //await game.settings.get("hud-and-trackers", "savedClocks");
        this.clocks = savedClocks;
        html.on("click", ["data-action"], this._handleButtonClick); //TODO: Fix this to be "[data-action]" rather than ["data-action"]. Fix references in handleButtonClick as well

        // html.on("click", "button", this._handleButtonClick);
    }

    async _handleButtonClick(event) {
        event.preventDefault();
        let savedClocks = getClocksByUser(game.userId); //await game.settings.get("hud-and-trackers", "savedClocks");
        this.clocks = savedClocks;

        const clickedElement = event.target;
        const action = clickedElement.dataset.action;

        let clockData = savedClocks[clickedElement.id];

        switch (action) {
            case "open": {
                await new Clock(clockData).render(true);
            }
        }
    }

    async _updateObject(event, formData) {}
}
