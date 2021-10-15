"use strict";
import * as HelperFunctions from "./helper-functions.js";

Hooks.on("renderClockViewer", (app, html) => {
    game.clockViewer = app;
});
Handlebars.registerHelper("isNumber", function (value) {
    return Number.isNaN(value);
});
Handlebars.registerHelper("getValue", function (array, index) {
    return array[index];
});

Handlebars.registerHelper("times", function (n, block) {
    var accum = "";
    for (var i = 0; i < n; ++i) accum += block.fn(i);
    return accum;
});

class Clock extends FormApplication {
    constructor(name, sectionCount, sectionMap, gradient, filledSections, breaks, id) {
        console.log("Rendering new clock");
        super({
            name,
            sectionCount,
            sectionMap,
            gradient,
            filledSections,
            breaks,
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
        this.breaks = breaks;

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
        console.log(
            "🚀 ~ file: clock.js ~ line 65 ~ Clock ~ getData ~ this.ourId",
            this.ourId
        );
        this.name = ourClock.name;

        return {
            id: this.ourId,
            name: this.name,
            sectionCount: this.sectionCount,
            sections: Object.values(this.sectionsMap),
            breaks: this.breaks,
        };
    }

    async activateListeners(html) {
        super.activateListeners(html);
        let windowContent = html.closest(".window-content");

        let clockWrapper = windowContent.find(".clockWrapper")[0];
        clockWrapper.style.backgroundImage = this.gradient;

        clockWrapper.addEventListener("mousedown", (event) => {
            if (!event.ctrlKey) {
                if (event.which == 1) {
                    this.filledSections++;
                    if (this.filledSections > this.sectionCount) {
                        this.filledSections = this.sectionCount;
                    }
                    console.log(this.filledSections);
                    this.saveAndRenderApp();
                } else if (event.which == 3) {
                    this.filledSections--;
                    if (this.filledSections < 0) {
                        this.filledSections = 0;
                    }
                    this.saveAndRenderApp();
                }
            }
        });

        let sections = windowContent.find(".clockSection");
        let frames = windowContent.find(".frameSection");
        let filled = 0;
        let deleteClock = windowContent.find(".delete")[0];

        //delete clock button
        deleteClock.addEventListener("click", (event) => {
            let savedClocks = game.settings.get("hud-and-trackers", "savedClocks");
            delete savedClocks[this.ourId];
            game.settings.set("hud-and-trackers", "savedClocks", savedClocks);
            if (game.clockViewer && game.clockViewer.rendered) {
                //TODO: Find way to delay this until after the clocks are updated
                game.clockViewer.render(true);
            }
            this.close();
        });

        //adding breaks if we have any
        let sectionsArray = Array.from(sections);
        let framesArray = Array.from(frames);
        let count = 0;
        //go through all the sub-sections if there are some
        if (this.breaks.length > 0) {
            //if breaks is = [2, 1, 2]
            this.breaks.forEach((num) => {
                count += num; //count = 2, first time around, 3 second time around, 5 3rd time around
                $(sectionsArray[count - 1]).attr("data-break", true); //(we're subtracting one since array indices start at zero)
            });
            let i = 0;

            framesArray.forEach((frame) => {
                $(frame).width((index, currentWidth) => {
                    let result = currentWidth * this.breaks[i];
                    return currentWidth * this.breaks[i];
                });
                i++;
            });
        }

        //refilling the sections if we have any, and adding event listener for click and ctrl click
        sectionsArray.forEach((element) => {
            //refilling the sections after refresh
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
            element.addEventListener("mouseenter", (event) => {
                if (event.ctrlKey) {
                    if (element.classList.contains("filled")) {
                        element.style.backgroundColor = "gray";
                    }
                }
            });
            element.addEventListener("mouseleave", (event) => {
                if (element.classList.contains("filled")) {
                    element.style.backgroundColor = "white";
                }
            });
        });
    }

    /**
     * this will update our app with saved values
     */
    async saveAndRenderApp() {
        let savedClocks = await game.settings.get("hud-and-trackers", "savedClocks");
        this.object.filledSections = this.filledSections;
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
        let gradient = formData.gradient;
        let sectionCount = formData.sectionCount;
        let startFilled = formData.startFilled;
        let breaksString = formData.breaks;
        let breaks = breaksString.split(",");
        breaks = breaks.map((ch) => parseInt(ch));
        //! this will return [""] then [NaN]
        //if we have a number in the breaks array
        if (!Number.isNaN(breaks[0])) {
            sectionCount = breaks.reduce((previousValue, currentValue) => {
                return previousValue + currentValue;
            });
        } else {
            breaks = [];
        }
        let sectionMap = {};
        let filledSections = 0;
        for (let i = 0; i < sectionCount; i++) {
            let sectionID = HelperFunctions.idGenerator();
            if (!startFilled) {
                sectionMap[sectionID] = new Section(sectionID, "", false);
            } else {
                filledSections = sectionCount;
                sectionMap[sectionID] = new Section(sectionID, "", true);
            }
        }

        let savedClocks = await game.settings.get("hud-and-trackers", "savedClocks");
        let id = HelperFunctions.idGenerator();

        let newClock = new Clock(
            clockName,
            sectionCount,
            sectionMap,
            gradient,
            filledSections,
            breaks,
            id
        );
        savedClocks[newClock.object.id] = newClock.object;
        await game.settings.set("hud-and-trackers", "savedClocks", savedClocks);
        newClock.render(true);
        if (game.clockViewer) {
            game.clockViewer.render(true);
        }
        this.render();
    }

    activateListeners(html) {
        super.activateListeners(html);
        let windowContent = html.closest(".window-content");
        let gradientDivs = windowContent.find(".gradients")[0].children;
        Array.from(gradientDivs).forEach((element) => {
            if (element.tagName == "DIV") {
                element.addEventListener("click", (event) => {
                    element.querySelector("input").checked = true;
                });
            }
        });
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
    constructor(sectionId, sectionLabel, sectionFilled, clockParent) {
        super();
        // super(sectionId, sectionLabel, sectionColor, sectionFilled, clockParent);
        this.sectionId = sectionId;
        this.sectionLabel = sectionLabel;
        this.sectionFilled = sectionFilled;
        this.clockParent = clockParent;
    }
    getData() {
        return {
            sectionLabel: this.sectionLabel,
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
            sectionFilled: this.sectionFilled,
        };
        this.clockParent.updateSections(this.sectionId, data);
    }

    activateListeners(html) {
        super.activateListeners(html);
    }
}

class Section {
    constructor(id, label, filled) {
        this.id = id;
        this.label = label;
        this.filled = filled;
    }
    static fromJSON(obj) {
        if (typeof obj == "string") {
            obj = JSON.parse(obj);
        }
        return new Section(obj.id, obj.label, obj.filled);
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
        html.on("click", ["data-action"], this._handleButtonClick);
        // html.on("click", "button", this._handleButtonClick);
    }

    async _handleButtonClick(event) {
        event.preventDefault();
        let savedClocks = await game.settings.get("hud-and-trackers", "savedClocks");
        this.clocks = savedClocks;

        const clickedElement = event.target;
        const action = clickedElement.dataset.action;

        let clockData = savedClocks[clickedElement.id];

        switch (action) {
            case "open": {
                await new Clock(
                    clockData.name,
                    clockData.sectionCount,
                    clockData.sectionMap,
                    clockData.gradient,
                    clockData.filledSections,
                    clockData.breaks,
                    clockData.id
                ).render(true);
            }
        }
    }

    async _updateObject(event, formData) {}
}
