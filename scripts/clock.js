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
    constructor(clockData) {
        super({
            ...clockData,
        });
        ({
            name: this.name,
            sectionCount: this.sectionCount,
            sectionMap: this.sectionMap,
            gradient: this.gradient,
            filledSections: this.filledSections,
            breaks: this.breaks,
            linkedEntities: this.linkedEntities,
            id: this.ourId,
        } = clockData);
        console.log("Rendering new clock");
    }

    /**
     *
     * @param {section} sectionId the id of the section we're targeting
     * @param {data} data - the data we're sending through
     */
    updateSections(sectionId, data) {
        console.log("Updating section", sectionId, data);
        this.sectionMap[sectionId] = new Section({
            id: sectionId,
            ...data,
        });
        this.saveAndRenderApp();
    }

    async getData() {
        return {
            ...this.object,
            sections: Object.values(this.sectionMap),
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
            console.log(this.sectionMap);
            if (filled < this.filledSections) {
                console.log(element.id);
                element.classList.add("filled");
                filled++;
                this.sectionMap[element.id].filled = true;
            }

            //clicking on the sections
            element.addEventListener("mousedown", (event) => {
                if (event.which == 1) {
                    //left click
                    //if the control key is held down, edit the section
                    if (event.ctrlKey) {
                        let clock = this;
                        console.log(
                            "🚀 ~ file: clock.js ~ line 140 ~ Clock ~ element.addEventListener ~ clock",
                            clock
                        );

                        new SectionConfig({
                            sectionId: element.id,
                            sectionLabel: element.dataset.label,
                            sectionFilled: element.classList.contains("filled"),
                            clockParent: this,
                        }).render(true);
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
            dragDrop: [{ dragSelector: ".entity", dropSelector: ".entityLinkBox" }],
        });
    }
    async _onDrop(event) {
        event.preventDefault();
        console.log("Something dropped");
        let data;
        try {
            data = JSON.parse(event.dataTransfer.getData("text/plain"));
        } catch (err) {
            return;
        }

        //get drop target
        const li = event.target.closest(".entityLinkBox");
    }

    //link an entity that's dragged onto here
    async linkEntity(data) {
        //set this as a flag on the entity
        let ourEntity;
        switch (data.type) {
            case "JournalEntry":
                ourEntity = game.journal.get(data.id);
                break;
            case "Actor":
                ourEntity = game.actors.get(data.id);
                break;
            case "Scene":
                ourEntity = game.scenes.get(data.id);
                break;
            default:
                break;
        }
        //if our entity is defined
        if (ourEntity) {
            //add this clock to a flag of the entity
            let clocks = await ourEntity.getFlag("hud-and-trackers", linkedClocks);
            clocks.push(this.ourId);
            await ourEntity.setFlag("hud-and-trackers", "linkedClocks", clocks);

            //save this entity a linked entity on our clock
            this.linkedEntities[data.id] = ourEntity;
        }
        //set to render clock when entity is opened
    }
    showEntityLinks() {}
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
        //split the linked entities array into an array of string ids
        let linkedEntities = formData.linkedEntities.split(",");

        if (linkedEntities[0] == "") {
            linkedEntities = [];
        }
        formData.linkedEntities = linkedEntities;

        let breaks = formData.breaks.split(",");
        breaks = breaks.map((ch) => parseInt(ch));

        //! this will return [""] then [NaN] if it doesn't find anything
        //if we have a number in the breaks array
        if (!Number.isNaN(breaks[0])) {
            //set the section count to the sum of all the sections in each group
            formData.sectionCount = breaks.reduce((previousValue, currentValue) => {
                return previousValue + currentValue;
            });
        } else {
            //if not, set breaks to []
            breaks = [];
        }
        formData.breaks = breaks;

        //initialize the section map to an empty object, and filledSections to zero
        let sectionMap = {};
        let filledSections = 0;

        //loop through and populate the section map with new sections.
        //if start filled is active, set filledSections to the full amount

        if (formData.startFilled) {
            filledSections = formData.sectionCount;
        }

        //generate all sections as section objects to store
        for (let i = 0; i < formData.sectionCount; i++) {
            let sectionID = HelperFunctions.idGenerator();
            let sectionData = {
                id: sectionID,
                label: "",
                filled: formData.startFilled,
            };
            sectionMap[sectionID] = new Section(sectionData);
            // if (!formData.startFilled) {
            //     sectionMap[sectionID] = new Section(sectionID, "", false);
            // } else {
            //     filledSections = formData.sectionCount;
            //     sectionMap[sectionID] = new Section(sectionID, "", true);
            // }
        }

        let id = HelperFunctions.idGenerator();

        //get the formData, and then all the extra stuff we had to calculate/generate
        const newClockData = {
            ...formData,
            sectionMap: sectionMap,
            filledSections: filledSections,
            id: id,
        };

        let savedClocks = await game.settings.get("hud-and-trackers", "savedClocks");

        //create the clock
        let newClock = new Clock(newClockData);

        //update saved clocks
        savedClocks[newClock.object.id] = newClock.object;
        await game.settings.set("hud-and-trackers", "savedClocks", savedClocks);

        //render new clock
        newClock.render(true);

        if (game.clockViewer && game.clockViewer.rendered) {
            //re-render the clock viewer if it's open
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
    constructor(sectionData) {
        super();
        ({
            sectionId: this.sectionId,
            sectionLabel: this.sectionLabel,
            sectionFilled: this.sectionFilled,
            clockParent: this.clockParent,
        } = sectionData);
        console.log(sectionData);
        console.log(
            "🚀 ~ file: clock.js ~ line 354 ~ SectionConfig ~ constructor ~ this.clockParent",
            this.clockParent
        );
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
        console.log(this);
        let data = {
            label: formData.label,
            filled: this.sectionFilled,
        };
        this.clockParent.updateSections(this.sectionId, data);
    }

    activateListeners(html) {
        super.activateListeners(html);
    }

    linkEntityDialogue() {
        let d = new Dialog({
            title: "Link Entity to Clock",
            content: `
			<form class="flexcol">
				<div class="form-group">
					<label for="entityName">Entity Name</label>
					<input type="text" name="entityName" placeholder="Enter entity name">
				</div>
			</form>
			`,
            callback: () => {},
        }).render(true);
    }
}

class Section {
    constructor(sectionData) {
        ({ id: this.id, label: this.label, filled: this.filled } = sectionData);
    }
    static fromJSON(obj) {
        if (typeof obj == "string") {
            obj = JSON.parse(obj);
        }
        return new Section(...obj);
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
                await new Clock(clockData).render(true);
            }
        }
    }

    async _updateObject(event, formData) {}
}
