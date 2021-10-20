"use strict";
import * as HelperFunctions from "./helper-functions.js";
let socket;

// also register socket to share clock data
Hooks.once("socketlib.ready", () => {
    socket = socketlib.registerModule("hud-and-trackers");
    socket.register("renderNewClockFromData", renderNewClockFromData);
    socket.register("saveAndRenderApp", saveAndRenderApp);
    socket.register("saveClock", saveClock);
});
//attack all the clocks to their linked entities' render hooks
// start a rendered clock object to keep track of
// all the rendered clocks
Hooks.on("ready", () => {
    game.renderedClocks = {};
    hookEntities();
});
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
            breakLabels: this.breakLabels,
            waypoints: this.waypoints,
            linkedEntities: this.linkedEntities,
            shared: this.shared,
            creator: this.creator,
            ourId: this.ourId,
        } = clockData);
        console.log("Rendering new clock");
    }

    //this will be used for when the clock data update is coming from a different
    //location
    updateEntireClock(clockData) {
        this.object = {
            ...clockData,
        }(
            ({
                name: this.name,
                sectionCount: this.sectionCount,
                sectionMap: this.sectionMap,
                gradient: this.gradient,
                filledSections: this.filledSections,
                breaks: this.breaks,
                breakLabels: this.breakLabels,
                waypoints: this.waypoints,
                linkedEntities: this.linkedEntities,
                shared: this.shared,
                creator: this.creator,
                ourId: this.ourId,
            } = clockData)
        );

        this.saveAndRenderApp();
    }
    /**
     *
     * @param {section} sectionId the id of the section we're targeting
     * @param {data} data - the data we're sending through
     */
    updateSections(sectionId, data) {
        this.sectionMap[sectionId] = new Section({
            id: sectionId,
            ...data,
        });
        this.saveAndRenderApp();
    }

    userIsCreator() {
        return game.user.id === this.creator;
    }

    async getData() {
        return {
            ...this.object,
            sections: Object.values(this.sectionMap),
            user: game.user,
        };
    }

    //this method is simply for handling changing the various headers and labels
    //without them needing to be text inputs
    handleEditableContent(app) {
        // Find all editable content.
        $("[contenteditable=true]")
            // When you click on item, record into data("initialText") content of this item.
            .focus(function () {
                $(this).data("initialText", $(this).html());
            });
        // When you leave an item...
        $("[contenteditable=true]").blur(function () {
            // ...if content is different...
            if ($(this).data("initialText") !== $(this).html()) {
                // ... check if it's the title or a label, then save and render it
                let newData = $(this).html();
                if (this.classList.contains("breakLabel")) {
                    app.breakLabels[this.id] = newData;
                } else if (this.classList.contains("clockName")) {
                    app.name = newData;
                }
                app.saveAndRenderApp();
            }
        });
    }

    //activating all the listeners on the app
    async activateListeners(html) {
        super.activateListeners(html);
        this.handleEditableContent(this);
        let windowContent = html.closest(".window-content");

        let clockWrapper = windowContent.find(".clockWrapper")[0];

        //make the background wrapper's gradient look like the chosen one
        clockWrapper.style.backgroundImage = this.gradient;

        //clicking on the clock wrapper will fill or unfill the sections
        clockWrapper.addEventListener("mousedown", (event) => {
            if (!event.ctrlKey && this.userIsCreator()) {
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
        let breakLabels = windowContent.find(".breakLabel");
        let waypoints = windowContent.find(".waypoint");
        let entityLinks = windowContent.find(".entityLink");
        let filled = 0;
        let deleteClock = windowContent.find(".delete")[0];
        let shareClock = windowContent.find(".share")[0];

        Array.from(entityLinks).forEach((element) => {
            element.addEventListener("click", (event) => {
                let entityType = element.dataset.type;
                let entityId = element.id;
                let ourEntity;
                switch (entityType) {
                    case "Actor":
                        ourEntity = game.actors.get(entityId);
                        break;
                    case "Item":
                        ourEntity = game.items.get(entityId);
                        break;
                    case "Scene":
                        ourEntity = game.scenes.get(entityId);
                        break;
                    case "JournalEntry":
                        ourEntity = game.journal.get(entityId);
                        break;
                    default:
                        break;
                }
                if (entityType == "Scene") {
                    //if it's a scene, view it
                    ourEntity.view();
                } else if (ourEntity.sheet) {
                    //else if it's something with a sheet, render that sheet
                    ourEntity.sheet.render(true);
                }
            });
        });
        //delete clock button
        if (deleteClock) {
            deleteClock.addEventListener("click", (event) => {
                //delete us in all our linked entities
                //TODO: Place this back in -- right now linkedEntities only stores the actor type and name
                //TODO: maybe create a helper function that gets the entity in question
                // for (let us in this.linkedEntities) {
                //     //special syntax for deleting a specific key in flag objects
                //     console.log(
                //         "🚀 ~ file: clock.js ~ line 161 ~ Clock ~ deleteClock.addEventListener ~  this.linkedEntities[us]",
                //         this.linkedEntities[us]
                //     );
                //     this.linkedEntities[us].setFlag("hud-and-trackers", "linkedClocks", {
                //         [`-=${this.ourId}`]: null,
                //     });
                // }
                //delete us from the saved clocks setting
                let savedClocks = game.settings.get("hud-and-trackers", "savedClocks");
                delete savedClocks[this.ourId];
                game.settings.set("hud-and-trackers", "savedClocks", savedClocks);
                if (game.clockViewer && game.clockViewer.rendered) {
                    //TODO: Find way to delay this until after the clocks are updated
                    game.clockViewer.render(true);
                }
                this.close();
            });
        }
        //share clock button
        if (shareClock) {
            shareClock?.addEventListener("click", (event) => {
                //toggle whether or not it's shared
                if (this.shared) {
                    this.shared = false;
                    ui.notifications.notify("Stopped sharing clock");
                } else {
                    this.shared = true;
                    ui.notifications.notify("Sharing clock");
                }
                this.saveAndRenderApp();
            });
        }
        //adding breaks if we have any
        let sectionsArray = Array.from(sections);
        let framesArray = Array.from(frames);
        breakLabels = Array.from(breakLabels);
        let count = 0;
        //go through all the sub-sections if there are some
        if (this.breaks.length > 0) {
            //if breaks is = [2, 1, 2]
            this.breaks.forEach((num) => {
                count += num; //count = 2, first time around, 3 second time around, 5 3rd time around
                $(sectionsArray[count - 1]).attr("data-break", true); //(we're subtracting one since array indices start at zero)
            });
            let i = 0;

            for (i = 0; i < this.breaks.length; i++) {
                $(framesArray[i]).width((index, currentWidth) => {
                    return currentWidth * this.breaks[i];
                });
                $(breakLabels[i]).width((index, currentWidth) => {
                    return currentWidth * this.breaks[i];
                });
                $(waypoints[i]).width((index, currentWidth) => {
                    return currentWidth * this.breaks[i];
                });
            }
        }

        //refilling the sections if we have any, and adding event listener for click and ctrl click
        sectionsArray.forEach((element) => {
            //refilling the sections after refresh
            if (filled < this.filledSections) {
                element.classList.add("filled");
                filled++;
                this.sectionMap[element.id].filled = true;
            }

            //clicking on the sections
            if (this.userIsCreator()) {
                element.addEventListener("mousedown", (event) => {
                    if (event.which == 1) {
                        //left click
                        //if the control key is held down, edit the section
                        if (event.ctrlKey) {
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
            }
        });
    }

    /**
     * this will update our app with saved values
     */
    async saveAndRenderApp() {
        foundry.utils.mergeObject(this.object, this, { insertKeys: false });
        if (!this.userIsCreator()) {
            //if we're not the creator
            //just render it and don't save it
            this.render();
            return;
        }

        await updateClock(this.ourId, this.object);
        // //get saved clocks from settings

        // let savedClocks = await game.settings.get("hud-and-trackers", "savedClocks");

        // savedClocks[this.ourId] = this;

        // //save it back to the settings
        // await game.settings.set("hud-and-trackers", "savedClocks", savedClocks);

        //if we're sharing this, update on other users' ends
        if (this.shared) {
            socket.executeForOthers("renderNewClockFromData", this);
        }

        //re-render
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
            dragDrop: [{ dragSelector: ".entity", dropSelector: ".contentWrapper" }],
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

        this.linkEntity(data);
        //get drop target
    }

    //link an entity that's dragged onto here
    async linkEntity(data) {
        //set this as a flag on the entity
        let ourEntity = await HelperFunctions.getEntityById(data.type, data.id);

        if (ourEntity) {
            //add this clock to a flag of the entity

            const newLinkedClocks = {
                [this.ourId]: this.object,
            };

            await ourEntity.setFlag("hud-and-trackers", "linkedClocks", newLinkedClocks);

            //save the linked entity on our clock
            let entityData = {
                name: ourEntity.name,
                entity: ourEntity.entity,
            };
            //save this entity a linked entity on our clock
            this.linkedEntities[data.id] = entityData;
            this.saveAndRenderApp();
        }
        //set to render clock when entity is opened
    }
    showEntityLinks() {}
    async _updateObject(event, formData) {}
}

//registers the hooks for journal sheets, actor sheets, item sheets
function registerHooks(hookName) {
    Hooks.on(hookName, (app) => {
        let linkedClocks = app.object.getFlag("hud-and-trackers", "linkedClocks");
        if (linkedClocks) {
            for (let clockId in linkedClocks) {
                //if the clock isn't already rendered, render it
                // if (!isClockRendered(clockId)) {
                renderNewClockFromData(linkedClocks[clockId]);
                // }
            }
        }
    });
}

function isClockRendered(clockId) {
    return game.renderedClocks[clockId];
}

Hooks.on("renderClock", (app, html) => {
    if (game.renderedClocks[app.ourId] == undefined) {
        game.renderedClocks[app.ourId] = app;
    }
});
Hooks.on("closeClock", (app, html) => {
    delete game.renderedClocks[app.ourId];
});

//registers the hooks for scenes
function registerSceneHook() {
    Hooks.on("canvasReady", (canvas) => {
        let linkedClocks = canvas.scene.getFlag("hud-and-trackers", "linkedClocks");
        if (linkedClocks) {
            for (let clockId in linkedClocks) {
                renderNewClockFromData(linkedClocks[clockId]);
            }
        }
    });
}
//renders a new clock from saved clock data on an entity or setting
async function renderNewClockFromData(clockData) {
    if (!isClockRendered(clockData.ourId)) {
        await new Clock(clockData).render(true);
    } else {
        game.renderedClocks[clockData.ourId].updateEntireClock(clockData);
    }
}

//external functions for socket to handle internal function of Clock Object
async function saveAndRenderApp(clockApp) {
    clockApp.saveAndRenderApp();
}
async function saveClock(clock) {
    let savedClocks = await game.settings.get("hud-and-trackers", "savedClocks");
    savedClocks[clock.ourId] = clock;
    await game.settings.set("hud-and-trackers", "savedClocks", savedClocks);
}
function getClocksByUser(userId) {
    return game.users.get(userId)?.getFlag("hud-and-trackers", "savedClocks");
}
function getAllClocks() {
    const allClocks = game.users.reduce((accumulator, user) => {
        const userClocks = getClocksByUser(user.id);

        if (userClocks) {
            //if user clocks is defined
            return {
                ...accumulator,
                ...userClocks,
            };
        } else {
            return {
                ...accumulator,
            };
        }
    }, {});
    return allClocks;
}

async function updateClock(clockId, updateData, userId) {
    if (!userId) {
        const relevantClock = getAllClocks()[clockId];
        userId = relevantClock.creator;
    }
    const updateInfo = {
        [clockId]: updateData,
    };
    let user = game.users.get(userId);

    user.setFlag("hud-and-trackers", "savedClocks", updateInfo);
}

// ==================================

//sets up hook handlers for all the different entity types
function hookEntities() {
    registerHooks("renderJournalSheet");
    registerHooks("renderActorSheet");
    registerHooks("renderItemSheet");
    registerSceneHook();
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
        let linkedEntities = {};

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

        //initialize the section map to an empty object, and filledSections to zero, and break labels to empty array
        let sectionMap = {};
        let filledSections = 0;
        let breakLabels = {};
        let waypoints = {};

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
        }

        //populate the break labels with default strings
        formData.breaks.forEach((el) => {
            let labelId = HelperFunctions.idGenerator();
            breakLabels[labelId] = "Input Label";

            let waypointId = HelperFunctions.idGenerator();
            waypoints[waypointId] = "Waypoint";
        });

        let id = HelperFunctions.idGenerator();

        //get the formData, and then all the extra stuff we had to calculate/generate
        const newClockData = {
            ...formData,
            sectionMap: sectionMap,
            filledSections: filledSections,
            breakLabels: breakLabels,
            waypoints: waypoints,
            linkedEntities: linkedEntities,
            shared: false,
            creator: game.user.id,
            ourId: id,
        };

        //get saved clocks from game settings
        //! let savedClocks = await game.settings.get("hud-and-trackers", "savedClocks");

        //create the clock
        let newClock = new Clock(newClockData);

        updateClock(newClock.ourId, newClockData, game.userId);
        //update saved clocks with the new clock
        // savedClocks[newClock.ourId] = newClock.object;
        // if (game.user.isGM) {
        //     await game.settings.set("hud-and-trackers", "savedClocks", savedClocks);
        // } else {
        //     await socket.executeAsGM("saveClock", newClock);
        // }

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
        let savedClocks = getClocksByUser(game.userId); //game.settings.get("hud-and-trackers", "savedClocks");
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
        let savedClocks = getClocksByUser(game.userId); //await game.settings.get("hud-and-trackers", "savedClocks");
        this.clocks = Object.values(savedClocks);
        // Send data to the template
        return {
            clocks: this.clocks,
        };
    }

    async activateListeners(html) {
        super.activateListeners(html);
        let savedClocks = getClocksByUser(game.userId); //await game.settings.get("hud-and-trackers", "savedClocks");
        this.clocks = savedClocks;
        html.on("click", ["data-action"], this._handleButtonClick);
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
