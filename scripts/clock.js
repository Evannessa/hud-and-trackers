"use strict";
import * as HelperFunctions from "./helper-functions.js";
let clock;
let clockConfig;
let filledSections = 0;
let sectionsMap = {};
Hooks.on("ready", () => {
    // clockConfig = new ClockConfig().render(true);
});
class Clock extends FormApplication {
    constructor(name, sectionCount, sectionMap, color1, id) {
        super({
            name,
            sectionCount,
            sectionMap,
            color1,
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
            data.sectionColor
        );
        this.render();
    }

    getData() {
        let data = game.settings.get("hud-and-trackers", "savedClocks");
        this.name = data.name;
        return {
            id: this.ourId,
            name: this.name,
            sectionCount: this.sectionCount,
            sections: Object.values(this.sectionsMap),
        };
    }

    activateListeners(html) {
        super.activateListeners(html);
        // let app = html.closest(".window-app")[0];
        // console.log("Our clock app is", app);
        // app.classList.add("clockHud");
        let windowContent = html.closest(".window-content");
        let editBtns = windowContent.find(".edit");
        let sections = windowContent.find(".clockSection");
        let filled = 0;
        let nameForm = windowContent.find(".clockName")[0];

        nameForm.blur((event) => {
            console.log("NAME CHANGED FULLY");
        });
        nameForm.addEventListener("input", (event) => {
            console.log("Name changed!");
        });

        Array.from(editBtns).forEach((element) => {
            let section = element.parentNode;
            element.addEventListener("click", (e) => {
                e.preventDefault();
                // e.stopPropogation();
                e.cancelBubble = true;
                new SectionConfig(
                    section.id,
                    section.dataset.label,
                    section.dataset.color,
                    this
                ).render(true);
            });
        });
        Array.from(sections).forEach((element) => {
            //refilling the sections after refresh
            if (filled < filledSections) {
                element.classList.add("filled");
                filled++;
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
                            this
                        ).render(true);
                    } else {
                        //if not, just fill it
                        if (!element.classList.contains("filled")) {
                            filledSections++;
                            element.classList.add("filled");
                            this.render();
                        }
                    }
                } else if (event.which == 3) {
                    //right click
                    if (element.classList.contains("filled")) {
                        filledSections--;
                        element.classList.remove("filled");
                        this.render();
                    }
                }
            });
        });
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
    async _updateObject(event, formData) {
        console.log(formData);
        this.name = formData.clockName;
        this.sectionCount = formData.sectionCount;
        let savedClocks = await game.settings.get(
            "hud-and-trackers",
            "savedClocks"
        );
        savedClocks[this.ourId] = formData;
        await game.settings.set("hud-and-trackers", "savedClocks", savedClocks);
        this.object.update(formData);
        this.render();
    }
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
        let sectionCount = formData.sectionCount;
        let sectionMap = {};
        for (let i = 0; i < sectionCount; i++) {
            let sectionID = HelperFunctions.idGenerator();
            sectionMap[sectionID] = new Section(sectionID, "", color);
        }

        let savedClocks = game.settings.get("hud-and-trackers", "savedClocks");
        let id = HelperFunctions.idGenerator();

        let newClock = new Clock(
            clockName,
            sectionCount,
            sectionMap,
            color,
            id
        ).render(true);
        savedClocks.push(newClock.object);
        game.settings.set("hud-and-trackers", "savedClocks", savedClocks);
        this.render();
    }

    activateListeners(html) {
        super.activateListeners(html);
        // let windowContent = html.closest(".window-content");
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
    constructor(sectionId, sectionLabel, sectionColor, clockParent) {
        super(sectionId, sectionLabel, sectionColor, clockParent);
        this.sectionId = sectionId;
        this.sectionLabel = sectionLabel;
        this.sectionColor = sectionColor;
        this.clockParent = clockParent;
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
        };
        this.clockParent.updateSections(this.sectionId, data);
    }

    activateListeners(html) {
        super.activateListeners(html);
    }
}

class Section {
    constructor(id, label, color) {
        this.id = id;
        this.label = label;
        this.color = color;
    }
    static fromJSON(obj) {
        if (typeof obj == "string") {
            obj = JSON.parse(obj);
        }
        return new Section(obj.id, obj.label, obj.color);
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
            template: `modules/hud-and-trackers/templates/clock-viewer.html`,
            id: "clockViewer",
            title: "Clock Viewer",
        });
    }

    async getData() {
        let savedClocks = await game.settings.get(
            "hud-and-trackers",
            "savedClocks"
        );
        this.clocks = savedClocks;
        // Send data to the template
        return {
            clocks: this.clocks,
        };
    }

    async activateListeners(html) {
        super.activateListeners(html);
        let savedClocks = await game.settings.get(
            "hud-and-trackers",
            "savedClocks"
        );
        this.clocks = savedClocks;
        html.on("click", "[data-action]", this._handleButtonClick);
    }

    async _handleButtonClick(event) {
        event.preventDefault();
        let savedClocks = await game.settings.get(
            "hud-and-trackers",
            "savedClocks"
        );
        this.clocks = savedClocks;

        const clickedElement = event.currentTarget;
        const action = clickedElement.dataset.action;

        let clockData = savedClocks.find(
            (ourClock) => ourClock.id == clickedElement.id
        );

        switch (action) {
            case "open": {
                await new Clock(
                    clockData.name,
                    clockData.sectionCount,
                    clockData.sectionMap,
                    clockData.color,
                    clockData.id
                ).render(true);
            }
        }
    }

    async _updateObject(event, formData) {
        let windowContent = html.closest(".window-content");
    }
}
