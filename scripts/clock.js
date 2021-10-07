"use strict";
import * as HelperFunctions from "./helper-functions.js";

class Clock extends FormApplication {
    constructor(name, sectionCount, sectionMap, color1, gradient, filledSections, id) {
        console.log("Rendering new clock");
        super({
            name,
            sectionCount,
            sectionMap,
            color1,
            gradient,
            filledSections,
            id,
        });
        if (!id) {
            this.ourId = HelperFunctions.idGenerator();
        } else {
            this.ourId = id;
        }
        this.name = name;
        this.sectionCount = sectionCount;
        this.sectionsMap = sectionMap;
        this.gradient = gradient;

        this.filledSections = filledSections;
    }

    /**
     *
     * @param {section} sectionId the id of the section we're targeting
     * @param {data} data - the data we're sending through
     */
    updateSections(sectionId, data) {
        this.sectionsMap[sectionId] = new Section(
            sectionId,
            data.sectionLabel,
            data.sectionColor,
            data.sectionFilled
        );
        this.saveAndRenderApp();
    }

    async getData() {
        let data = await game.settings.get("hud-and-trackers", "savedClocks");
        let ourClock = data[this.ourId];
        this.name = ourClock.name;

        return {
            id: this.ourId,
            name: this.name,
            sectionCount: this.sectionCount,
            sections: Object.values(this.sectionsMap),
        };
    }

    async activateListeners(html) {
        super.activateListeners(html);
        let windowContent = html.closest(".window-content");

        let clockWrapper = windowContent.find(".clockWrapper")[0];
        clockWrapper.style.backgroundImage = this.gradient;

        clockWrapper.addEventListener("mousedown", (event) => {
            if (event.which == 1) {
                this.filledSections++;
                if (this.filledSections > this.sectionCount) {
                    this.filledSections = this.sectionCount;
                }
                this.saveAndRenderApp();
            } else if (event.which == 3) {
                this.filledSections--;
                if (this.filledSections < 0) {
                    this.filledSections = 0;
                }
                this.saveAndRenderApp();
            }
        });

        let sections = windowContent.find(".clockSection");
        let filled = 0;
        let deleteClock = windowContent.find(".delete")[0];

        deleteClock.addEventListener("click", (event) => {
            let savedClocks = game.settings.get("hud-and-trackers", "savedClocks");
            delete savedClocks[this.ourId];
            game.settings.set("hud-and-trackers", "savedClocks", savedClocks);
            this.close();
        });

        Array.from(sections).forEach((element) => {
            //refilling the sections after refresh
            // if (this.sectionsMap[element.id].filled) {
            //     element.classList.add("filled");
            // }
            if (filled < this.filledSections) {
                element.classList.add("filled");
                filled++;
                this.sectionsMap[element.id].filled = true;
            }

            //clicking on the sections
            element.addEventListener("mousedown", (event) => {
                if (event.which == 1) {
                    //left click
                    //if the control key is held down, edit the section
                    if (event.ctrlKey) {
                        new SectionConfig(
                            element.id,
                            element.dataset.label,
                            element.dataset.color,
                            element.classList.contains("filled"),
                            this
                        ).render(true);
                    }
                }
            });
        });
    }

    /**
     * this will update our app with saved values
     */
    async saveAndRenderApp() {
        let savedClocks = await game.settings.get("hud-and-trackers", "savedClocks");
        savedClocks[this.ourId] = this.object;
        await game.settings.set("hud-and-trackers", "savedClocks", savedClocks);
        this.render();
    }

    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            classes: ["form", "clockHud"],
            popOut: true,
            submitOnChange: true,
            closeOnSubmit: false,
            minimizable: false,
            resizable: false,
            background: "none",
            template: "modules/hud-and-trackers/templates/clock.html",
            title: "clockHud",
        });
    }
    async _updateObject(event, formData) {}
}

/** This will be the configuration for the clock itself. */
export class ClockConfig extends FormApplication {
    constructor() {
        super();
    }
    getData() {
        return {};
    }
    async _updateObject(event, formData) {
        //create a new clock
        let clockName = formData.clockName;
        let color = formData.color;
        let gradient = formData.gradient;
        console.log(formData);
        console.log(gradient);
        let sectionCount = formData.sectionCount;
        let startFilled = formData.startFilled;
        let sectionMap = {};
        let filledSections = 0;
        for (let i = 0; i < sectionCount; i++) {
            let sectionID = HelperFunctions.idGenerator();
            if (!startFilled) {
                sectionMap[sectionID] = new Section(sectionID, "", color, false);
            } else {
                filledSections = sectionCount;
                sectionMap[sectionID] = new Section(sectionID, "", color, true);
            }
        }

        let savedClocks = await game.settings.get("hud-and-trackers", "savedClocks");
        let id = HelperFunctions.idGenerator();

        let newClock = new Clock(
            clockName,
            sectionCount,
            sectionMap,
            color,
            gradient,
            filledSections,
            id
        );
        savedClocks[newClock.object.id] = newClock.object;
        await game.settings.set("hud-and-trackers", "savedClocks", savedClocks);
        newClock.render(true);
        this.render();
    }

    activateListeners(html) {
        super.activateListeners(html);
    }
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            classes: ["form"],
            popOut: true,
            submitOnChange: false,
            closeOnSubmit: true,
            template: "modules/hud-and-trackers/templates/clock-config.html",
            id: "clockConfig",
            title: "Clock Config",
            onSubmit: (e) => e.preventDefault(),
        });
    }
}

class SectionConfig extends FormApplication {
    constructor(sectionId, sectionLabel, sectionColor, sectionFilled, clockParent) {
        console.log(sectionId, sectionLabel, sectionColor, sectionFilled, clockParent);
        super();
        // super(sectionId, sectionLabel, sectionColor, sectionFilled, clockParent);
        this.sectionId = sectionId;
        this.sectionLabel = sectionLabel;
        this.sectionColor = sectionColor;
        this.sectionFilled = sectionFilled;
        this.clockParent = clockParent;
    }
    getData() {
        return {
            sectionLabel: this.sectionLabel,
            sectionColor: this.sectionColor,
        };
    }
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            classes: ["form"],
            popOut: true,
            submitOnChange: false,
            closeOnSubmit: true,
            template: "modules/hud-and-trackers/templates/section-config.html",
            id: "sectionConfig",
            title: "Section Config",
            onSubmit: (e) => e.preventDefault(),
        });
    }
    async _updateObject(event, formData) {
        let data = {
            sectionLabel: formData.label,
            sectionColor: formData.color,
            sectionFilled: this.sectionFilled,
        };
        this.clockParent.updateSections(this.sectionId, data);
    }

    activateListeners(html) {
        super.activateListeners(html);
    }
}

class Section {
    constructor(id, label, color, filled) {
        this.id = id;
        this.label = label;
        this.color = color;
        this.filled = filled;
    }
    static fromJSON(obj) {
        if (typeof obj == "string") {
            obj = JSON.parse(obj);
        }
        return new Section(obj.id, obj.label, obj.color, obj.filled);
    }
}

/**
 * Define your class that extends FormApplication
 */
export class ClockViewer extends FormApplication {
    constructor() {
        super();
        let savedClocks = game.settings.get("hud-and-trackers", "savedClocks");
        this.clocks = savedClocks;
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
        let savedClocks = await game.settings.get("hud-and-trackers", "savedClocks");
        this.clocks = Object.values(savedClocks);
        console.log(this.clocks);
        // Send data to the template
        return {
            clocks: this.clocks,
        };
    }

    async activateListeners(html) {
        super.activateListeners(html);
        let savedClocks = await game.settings.get("hud-and-trackers", "savedClocks");
        this.clocks = savedClocks;
        console.log(this.clocks);
        console.log(html);
        html.on("click", ["data-action"], this._handleButtonClick);
        // html.on("click", "button", this._handleButtonClick);
    }

    async _handleButtonClick(event) {
        console.log(event);
        event.preventDefault();
        let savedClocks = await game.settings.get("hud-and-trackers", "savedClocks");
        this.clocks = savedClocks;
        console.log(savedClocks);

        const clickedElement = event.target;
        const action = clickedElement.dataset.action;
        console.log(clickedElement.id);

        let clockData = savedClocks[clickedElement.id];

        switch (action) {
            case "open": {
                await new Clock(
                    clockData.name,
                    clockData.sectionCount,
                    clockData.sectionMap,
                    clockData.color,
                    clockData.gradient,
                    clockData.filledSections,
                    clockData.id
                ).render(true);
            }
        }
    }

    async _updateObject(event, formData) {}
}
