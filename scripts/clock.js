"use strict";
import { ClockConfig } from "./ClockConfig.js";
import { ClockDisplay } from "./ClockDisplay.js";
import { ClockHelpers } from "./ClockHelpers.js";
var clockHelpers;
ClockHelpers().then((value) => (clockHelpers = value));
//Because ClockHelpers is an async function, we have to do this to get its value
import * as HelperFunctions from "./helper-functions.js";
let socket;

Hooks.on("quenchReady", (quench) => {
    quench.registerBatch(
        "Clock Test",
        (context) => {
            const { describe, it, assert, expect } = context;
            describe("Clock Test Suite", function () {
                describe("Testing Clock Deletion", function () {
                    //specification for deleting clocks
                    it("makes sure a clock is deleted", function () {
                        let clockData = { clockId: ["clockStuff"] };
                        delete clockData.clockId;
                        expect(clockData).to.deep.equal({});
                    });
                });
            });
        },
        { displayName: "QUENCH: Eva's Clock Test" }
    );
});

// also register socket to share clock data
Hooks.once("socketlib.ready", () => {
    socket = socketlib.registerModule("hud-and-trackers");
    socket.register("renderNewClockFromData", renderNewClockFromData);
    socket.register("refreshClockDependentItems", refreshClockDependentItems);
    // socket.register("updateSetting", updateSetting);
});

/**
 * This will render the global clock display
 */
export async function getGlobalClockDisplayData() {
    let clocksToDisplay = {
        sharedClocks: getSharedClocks(),
        myClocks: getClocksByUser(game.userId),
        sceneClocks: HelperFunctions.convertArrayIntoObjectById(getClocksLinkedToEntity(game.scenes.viewed.id)),
    };

    //text to display in a tooltip to describe each category when hovered
    let tooltipText = {
        sharedClocks: "Clocks that have been shared with you",
        myClocks: "Clocks you've personally created",
        sceneClocks: "Clocks linked to the scene you're viewing",
    };
    //text to display in a tooltip when you're adding a new clock
    let addClockTooltipText = {
        sharedClocks: "Add new clock that'll automatically be shared",
        myClocks: "Add new personal clock only you can see",
        sceneClock: "Add new clock linked to the scene you're viewing",
    };
    //text to display when there are no clocks in the category
    let emptyText = {
        sharedClocks: "No clocks are being shared by other users.",
        myClocks: "You haven't created any clocks.",
        sceneClocks: "You haven't linked any clocks to this scene",
    };
    //the individual categories in the "accordion" that will be expanded.
    // For saving which ones the user has expanded
    let categoriesShown = await game.user.getFlag("hud-and-trackers", "displayCategoriesShown");

    //if the flag returns null, create it, and set it to these defaults
    if (!categoriesShown) {
        categoriesShown = {
            sharedClocks: true,
            myClocks: false,
            sceneClocks: false,
        };
        await game.user.setFlag("hud-and-trackers", "displayCategoriesShown", categoriesShown);
    }
    let allData = {
        clocksToDisplay: clocksToDisplay,
        categoriesShown: categoriesShown,
        tooltipText: tooltipText,
        addClockTooltipText: addClockTooltipText,
        emptyText: emptyText,
    };

    return clockHelpers.convertData(allData);
}

//attach all the clocks to their linked entities' render hooks
// start a rendered clock object to keep track of
// all the rendered clocks
Hooks.on("ready", async () => {
    let finalData;
    await getGlobalClockDisplayData().then((value) => (finalData = value));
    // let finalData = getGlobalClockDisplayData();
    game.clockDisplay = new ClockDisplay(finalData, false).render(true);

    game.renderedClocks = {};
    hookEntities();
});
Hooks.on("renderClockViewer", (app, html) => {
    game.clockViewer = app;
});

/**
 * tries to find the clocks of all users whose share property is set to true
 * @returns an object with id keys of all sharedClocks that were found
 */
export function getSharedClocks() {
    let allClocks = getAllClocks();
    let sharedClocks = Object.values(allClocks).filter((clockData) => {
        return clockData.shared;
    });
    sharedClocks = HelperFunctions.convertArrayIntoObjectById(sharedClocks);
    return sharedClocks;
}

//**HANDLEBAR HELPERS =================== */
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

Handlebars.registerHelper("objectEmpty", function (object) {
    if (isObjectEmpty(object)) {
        return "true";
    } else {
        return "false";
    }
});

/**For showing clocks */
export class Clock extends FormApplication {
    constructor(clockData) {
        super({
            data: clockData,
        });
        this.data = clockData;
        console.log("Rendering new clock");
    }

    //this will be used for when the clock data update is coming from a different
    //location
    updateEntireClock(clockData, dontSave) {
        this.data = clockData;
        if (dontSave) {
            this.render(true);
        } else {
            this.saveAndRenderApp();
        }
    }
    /**
     *
     * @param {section} sectionId the id of the section we're targeting
     * @param {data} data - the data we're sending through
     */
    updateSections(sectionId, data) {
        this.data.sectionMap[sectionId] = new Section({
            id: sectionId,
            ...data,
        });
        this.saveAndRenderApp();
    }

    userIsCreator() {
        return game.user.id === this.data.creator;
    }

    async getData() {
        return {
            ...this.data,
            sections: Object.values(this.data.sectionMap),
            user: game.user,
        };
    }

    async generateConfirmationDialog(confirmCallback, event, message, title) {
        let confirmation = new Dialog({
            title: `${title}`,
            content: `<p>Are you sure you want to ${message}</p>`,
            buttons: {
                yes: {
                    icon: '<i class="fas fa-check"></i>',
                    label: "Delete",
                    callback: () => {
                        confirmCallback(event, this);
                    },
                },
                no: {
                    icon: '<i class="fas fa-times"></i>',
                    label: "Cancel",
                },
            },
        });
        confirmation.render(true);
    }

    //this will handle if the clock's delete button is clicked
    async handleClockDeletion(event, app) {
        event.preventDefault();

        deleteClock(app.data.ourId);

        this.close();
    }

    //this will handle if the clock's share button is clicked
    async handleShareClock(event, app) {
        event.preventDefault();
        if (this.data.shared) {
            this.data.shared = false;
            ui.notifications.notify("Stopped sharing clock");
        } else {
            this.data.shared = true;
            ui.notifications.notify("Sharing clock");
        }
        this.saveAndRenderApp();
    }
    //for opening the entity sheets, or rendering the entity scene
    async handleEntityClick(event, app) {
        event.preventDefault();
        let element = event.currentTarget;
        let entityType = element.dataset.type;
        let entityId = element.id;
        let ourEntity;
        await HelperFunctions.getEntityById(entityType, entityId).then((value) => (ourEntity = value));

        if (event.altKey) {
            //if alt key is pressed, we're going to unlink the entity
            this.unlinkEntity(ourEntity);
            //!NOTE -- when updating, because the entity is removed,
            //! When the linked entities are called to update, the unlinked one
            //! won't be in the list
            // await unlinkClockFromEntity(ourEntity, this.data.ourId);
            // this.saveAndRenderApp();
            return;
        }

        if (entityType == "Scene") {
            //if it's a scene and we're not already viewing it
            //view it
            if (game.scenes.viewed != ourEntity) {
                ourEntity.view();
            }
        } else if (ourEntity.sheet) {
            //else if it's something with a sheet, render that sheet
            //if it's not already rendered
            if (!ourEntity.sheet.rendered) {
                ourEntity.sheet.render(true);
            }
        }
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

                //if we're editing a break label
                if (this.classList.contains("breakLabel")) {
                    app.data.breakLabels[this.id] = newData;

                    //if we're editing the clock's name
                } else if (this.classList.contains("clockName")) {
                    app.data.name = newData;

                    //if we're editing the waypoint
                } else if (this.classList.contains("waypointLabel")) {
                    app.data.waypoints[this.parentNode.id] = newData;
                }
                //save and render the app
                app.saveAndRenderApp();
            }
        });
    }

    async _handleButtonClick(event) {
        event.stopPropagation();

        let clickedElement = $(event.currentTarget); //this will return the form itself?

        let action = clickedElement.data().action;

        const elementId = clickedElement.id;

        switch (action) {
            case "share": {
                this.handleShareClock(event, this);
                break;
            }
            case "clone": {
                //duplicate clock with same data, but chance to change values
                new ClockConfig(this.data, true).render(true);
                break;
            }
            case "changeColor": {
                //change the color
                event.preventDefault();
                let d = new Dialog({
                    title: "Change Color",
                    content: `
		<div class="form-group gradients">
        <label>Choose Gradient</label>
        <div class="reddish">
            <input
                type="radio"
                id="reddish"
                name="gradient"
                value="reddish"
                checked
            />
            <label for="reddish">Reddish</label>
        </div>

        <div class="purple">
            <input
                type="radio"
                id="purple"
                name="gradient"
                value="purple"
            />
            <label for="purple">Purple</label>
        </div>

        <div class="bluePink">
            <input
                type="radio"
                id="bluePink"
                name="gradient"
                value="bluePink"
            />
            <label for="bluePink">Blue Pink</label>
        </div>
        <div class="turquoise">
            <input
                type="radio"
                id="turquoise"
                name="gradient"
                value="turquoise"
            />
            <label for="turquoise">Turquoise</label>
        </div>
        <div class="pinkLemonade">
            <input
                type="radio"
                id="pinkLemonade"
                name="gradient"
                value="pinkLemonade"
            />
            <label for="pinkLemonade">Pink Lemonade</label>
        </div>
        <div class="fire">
            <input
                type="radio"
                id="fire"
                name="gradient"
                value="fire"
            />
            <label for="fire">Fire</label>
        </div>
        <div class="magic">
            <input
                type="radio"
                id="magic"
                name="gradient"
                value="magic"
            />
            <label for="magic">Magic</label>
        </div>
        <div class="pastel">
            <input
                type="radio"
                id="pastel"
                name="gradient"
                value="pastel"
            />
            <label for="pastel">Pastel</label>
        </div>`,
                    buttons: {
                        yes: {
                            icon: '<i class="fas fa-check"></i>',
                            label: "Change Color",
                            callback: (html) => {
                                let newGradient = html.find("input[name='gradient']:checked").val();

                                this.data.gradient = newGradient;
                                this.saveAndRenderApp();
                            },
                        },
                        no: {
                            icon: '<i class="fas fa-times"></i>',
                            label: "Cancel",
                        },
                    },
                    render: (html) => {
                        let windowContent = html.closest(".window-content");
                        let gradientDivs = windowContent.find(".gradients")[0].children;
                        Array.from(gradientDivs).forEach((element) => {
                            if (element.tagName == "DIV") {
                                element.addEventListener("click", (event) => {
                                    element.querySelector("input").checked = true;
                                });
                            }
                        });
                    },
                }).render(true);
                break;
            }
            case "delete": {
                //ask for user's confirmation before deleting clock
                this.generateConfirmationDialog(
                    this.handleClockDeletion.bind(this),
                    event,
                    "delete this clock",
                    "Delete Clock"
                );
                break;
            }
            case "showEntity": {
                this.handleEntityClick(event, this);
                break;
            }
            default:
                console.log("Invalid action");
        }
    }

    async handleBreaksAndWaypoints() {
        //adding breaks if we have any
        let sectionsArray = Array.from(sections);
        let framesArray = Array.from(frames);
        breakLabels = Array.from(breakLabels);
        let count = 0;
        //go through all the sub-sections if there are some
        if (this.data.breaks.length > 0) {
            //if breaks is = [2, 1, 2]
            this.data.breaks.forEach((num) => {
                count += num; //count = 2, first time around, 3 second time around, 5 3rd time around
                $(sectionsArray[count - 1]).attr("data-break", true); //(we're subtracting one since array indices start at zero)
            });
            let i = 0;

            for (i = 0; i < this.data.breaks.length; i++) {
                $(framesArray[i]).width((index, currentWidth) => {
                    return currentWidth * this.data.breaks[i];
                });
                $(breakLabels[i]).width((index, currentWidth) => {
                    return currentWidth * this.data.breaks[i];
                });
                $(waypoints[i]).width((index, currentWidth) => {
                    return currentWidth * this.data.breaks[i];
                });
            }
        }
    }

    //activating all the listeners on the app
    async activateListeners(html) {
        super.activateListeners(html);
        this.handleEditableContent(this);
        let windowContent = html.closest(".window-content");

        let clockWrapper = windowContent.find(".clockWrapper")[0];

        //make the background wrapper's gradient look like the chosen one
        // clockWrapper.style.backgroundImage = this.data.gradient;
        //add class
        if (this.data.gradient.includes("gradient")) {
            //find all the children and change their backgroundImage
            $(clockWrapper).css("backgroundImage", `${this.data.gradient}`);
        } else {
            //find all the children and add a class
            $(clockWrapper).addClass(this.data.gradient);
        }
        // $(clockWrapper).addClass(this.data.gradient);

        //clicking on the clock wrapper will fill or unfill the sections
        clockWrapper.addEventListener("mousedown", (event) => {
            if (!event.ctrlKey && this.userIsCreator()) {
                if (event.which == 1) {
                    this.data.filledSections++;
                    if (this.data.filledSections > this.data.sectionCount) {
                        this.data.filledSections = this.data.sectionCount;
                    }
                    this.saveAndRenderApp();
                } else if (event.which == 3) {
                    this.data.filledSections--;
                    if (this.data.filledSections < 0) {
                        this.data.filledSections = 0;
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

        windowContent.off("click", "[data-action]");
        windowContent.one("click", "[data-action]", this._handleButtonClick.bind(this));

        //adding breaks if we have any
        let sectionsArray = Array.from(sections);
        let framesArray = Array.from(frames);
        breakLabels = Array.from(breakLabels);
        let count = 0;
        //go through all the sub-sections if there are some
        if (this.data.breaks.length > 0) {
            //if breaks is = [2, 1, 2]
            this.data.breaks.forEach((num) => {
                count += num; //count = 2, first time around, 3 second time around, 5 3rd time around
                $(sectionsArray[count - 1]).attr("data-break", true); //(we're subtracting one since array indices start at zero)
            });
            let i = 0;

            for (i = 0; i < this.data.breaks.length; i++) {
                $(framesArray[i]).width((index, currentWidth) => {
                    return currentWidth * this.data.breaks[i];
                });
                $(breakLabels[i]).width((index, currentWidth) => {
                    return currentWidth * this.data.breaks[i];
                });
                $(waypoints[i]).width((index, currentWidth) => {
                    return currentWidth * this.data.breaks[i];
                });
            }
        }

        //refilling the sections if we have any, and adding event listener for click and ctrl click
        sectionsArray.forEach((element) => {
            //refilling the sections after refresh
            if (filled < this.data.filledSections) {
                element.classList.add("filled");
                filled++;
                this.data.sectionMap[element.id].filled = true;
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
        await updateClock(this.data.ourId, this.data);
    }

    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            classes: ["form", "clockHud", "hud-and-trackers"],
            popOut: true,
            submitOnChange: true,
            closeOnSubmit: false,
            minimizable: false,
            resizable: false,
            background: "none",
            template: "modules/hud-and-trackers/templates/clock.hbs",
            title: "Clock",
            dragDrop: [{ dragSelector: ".entity", dropSelector: ".contentWrapper" }],
        });
    }
    async _onDrop(event) {
        event.preventDefault();
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
        let ourEntity;
        await HelperFunctions.getEntityById(data.type, data.id).then((value) => (ourEntity = value));

        if (ourEntity) {
            //save the linked entity on our clock
            //save this entity a linked entity on our clock
            let entityData = {
                name: ourEntity.name,
                entity: ourEntity.documentName,
            };
            //get our linked entities, and find the id of this entity, and add the linked entities to this data
            this.data.linkedEntities[data.id] = entityData;

            this.saveAndRenderApp();
        }
    }
    async unlinkEntity(entityData) {
        //delete the entity from linkedEntities, and refresh the entity
        delete this.data.linkedEntities[entityData.id];

        //was accessing "ourId" instead of "id"
        // refreshSpecificEntity(entityData, this.data.ourId);
        const keyDeletion = {
            [`-=${entityData.id}`]: null,
        };
        //add the key deletion thing so it'll be deleted properly in the users' saved flags as well
        this.data.linkedEntities[`-=${entityData.id}`] = null;
        this.saveAndRenderApp();
    }

    async _updateObject(event, formData) {
        let clockData = await getAllClocks()[this.data.ourId];
        this.updateEntireClock(clockData, true);
    }
}

//registers the hooks for journal sheets, actor sheets, item sheets
function registerHooks(hookName) {
    Hooks.on(hookName, async (app, html) => {
        if (app.element.find(".app-child").length == 0) {
            console.log("No app child. showing drawer");
            await showClockDrawer(app);
        } else {
            console.log("App child found. Not adding new one.");
        }
    });
}
/**
 * show a floating clock drawer on entity/document sheets that have linked clocks
 * @param {*} app - the application instance
 */
async function showClockDrawer(app) {
    let entity = app.object;
    let element = app.element;
    let linkedClocks = await getClocksLinkedToEntity(entity.id);

    //this is turning the array into an object w/ ids as key and obj literal as value
    linkedClocks = HelperFunctions.convertArrayIntoObjectById(linkedClocks);

    // get the handlebars template
    const template = "modules/hud-and-trackers/templates/clock-partials/clock-display.hbs";

    let data = {};
    for (let clockId in linkedClocks) {
        data[clockId] = { ...linkedClocks[clockId] };
        data[clockId].sections = Object.values(linkedClocks[clockId].sectionMap);
        data[clockId].user = game.user;
    }
    //TODO: Maybe put in the entity type, like "actor" or "journal entry"
    let clocksToDisplay = { linkedClocks: data };
    let categoriesShown = { linkedClocks: true };
    let tooltipText = {
        linkedClocks: `Clocks that are linked to this ${entity.documentName}`,
    };
    let addClockTooltipText = {
        linkedClocks: `Add a new clock linked to this ${entity.documentName}?`,
    };
    let emptyText = {
        linkedClocks: `There are no clocks linked to this ${entity.documentName}`,
    };

    //convert the data to the format the clock display needs
    let allData = {
        clocksToDisplay,
        categoriesShown,
        tooltipText,
        addClockTooltipText,
        emptyText,
    };
    allData = clockHelpers.convertData(allData);

    var drawerHtml = await renderTemplate(template, allData);

    //convert it to a jquery object
    drawerHtml = $(drawerHtml);

    //get the app's element and append this
    app.element.append(drawerHtml);
    let wrapString = "<div class='clock-display app-child'><section class='clock-container'></section></div>";

    //if the drawer was expanded, we want it to be expanded when we refresh too
    if (await entity.getFlag("hud-and-trackers", "clockDrawerExpanded")) {
        wrapString = "<div class='clock-display app-child expanded'><section class='clock-container'></section></div>";
    }
    drawerHtml.wrapAll(wrapString);

    //must be put in the dom first
    clockHelpers._activateListeners(drawerHtml.closest(".app-child"), allData.data, entity);
}

//check if the clock is already rendered
export function isClockRendered(clockId) {
    return game.renderedClocks[clockId];
}
//event handler for when the clock is rendered
Hooks.on("renderClock", (app, html) => {
    //if the clock is rendered, add it to our global rendered clocks object
    if (game.renderedClocks[app.data.ourId] == undefined) {
        game.renderedClocks[app.data.ourId] = app;
    }
});
Hooks.on("closeClock", (app, html) => {
    //if the clock is no longer rendered, remove it from our global rendered clocks object
    delete game.renderedClocks[app.data.ourId];
});

//registers the hooks for scenes
function registerSceneHook() {
    Hooks.on("canvasReady", (canvas) => {
        game.clockDisplay.render();
    });
}
/**
 * renders a new clock from saved clock data,
 * or updates and brings-to-top the clock if it is already rendered
 * @param {Object} clockData - an object holding the clock's data
 */
export async function renderNewClockFromData(clockData) {
    if (!isClockRendered(clockData.ourId)) {
        await new Clock(clockData).render(true);
    } else {
        updateAndFocusClock(clockData);
    }
}

/**
 * updates and brings-to-top an already rendered clock
 * @param {Object} clockData - object holding clock's data
 */
export async function updateAndFocusClock(clockData) {
    game.renderedClocks[clockData.ourId].updateEntireClock(clockData);
    game.renderedClocks[clockData.ourId].bringToTop();
}

/**
 * gets the clocks from the users' flags
 * @param {String} userId - the Id of the user whose saved clocks we want to get
 * @returns the users clocks, which should be an Object with ids and Clock data
 */
export function getClocksByUser(userId) {
    return game.users.get(userId)?.getFlag("hud-and-trackers", "savedClocks");
}
/**
 * this method will return all the clocks combined from every user
 * @returns allClocks - returns every clock of every user, combined together as one
 */
export function getAllClocks() {
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

/**
 * return clocks that have this entity linked to them
 * @param {string} entityId - the id of the entity we're looking for linkedClocks on
 * @returns linkedClocks - the linked clocks found on this entity
 */
export function getClocksLinkedToEntity(entityId) {
    let linkedClocks = Object.values(getAllClocks()).filter((clock) => {
        //if our linked entities keys includes this entity, include it in allClocks
        return Object.keys(clock.linkedEntities).includes(entityId);
    });
    return linkedClocks;
}

/**
 * this function will save (or update) a clock to the user's flags
 * @param {String} clockId - the id of the clock to update the flags with
 * @param {Object} updateData - the object containing the data we want to update the clock with
 * @param {String} userId - the id of the user whose clock this is, and whose flags we will update
 */
export async function updateClock(clockId, updateData, userId) {
    if (!userId) {
        const relevantClock = getAllClocks()[clockId];
        userId = relevantClock.creator;
    }

    //might be the issue with deleting keys
    const updateInfo = {
        [clockId]: updateData,
    };
    let user = game.users.get(userId);

    let result = await user.setFlag("hud-and-trackers", "savedClocks", updateInfo);
    Hooks.call("clockUpdated", clockId, updateData, false);
}

/**
 * This should delete the clock from the user's flags
 * @param {String} clockId - the id of the clock we want to delete from the user's flag
 */
async function deleteClock(clockId) {
    const relevantClock = getAllClocks()[clockId];

    const keyDeletion = {
        [`-=${clockId}`]: null,
    };
    let user = game.users.get(relevantClock.creator);
    await user.setFlag("hud-and-trackers", "savedClocks", keyDeletion);
    Hooks.call("clockUpdated", clockId, relevantClock, true);
}

/**
 *
 * @param {Object} ourEntity - the entity that's linked to us
 * @param {string} clockId - the id of the clock that's linked
 */
async function reRenderLinkedEntity(ourEntity, clockId) {
    if (ourEntity.sheet.rendered) {
        //if the entity sheet is rendered, re-render it
        let clockDrawer = ourEntity.sheet.element.find(".app-child");
        let expanded = clockDrawer.hasClass("expanded");
        console.log("Clock drawer is,", clockDrawer);
        if (clockDrawer) {
            clockDrawer.remove();
        }
        await ourEntity.setFlag("hud-and-trackers", "clockDrawerExpanded", expanded);
        ourEntity.sheet.render();
    }
}

/**
 *  This function removes the clock (by its id) from the entity's flags
 * @param {Object} ourEntity - the entity (Document?) we want to unlink the clock from
 * @param {String} clockId - the id of the clock we want to delete
 */
async function unlinkClockFromEntity(ourEntity, clockId) {
    //get the clock and delete the linked entity from the clock
    let clockData = getClocksByUser(game.userId)[clockId];

    //delete the specific linked entity from the clock
    let deletion = {
        [clockId]: {
            linkedEntities: {
                [`-=${ourEntity.id}`]: null,
            },
        },
    };

    //save it
    let result = await game.user.setFlag("hud-and-trackers", "savedClocks", deletion);
    Hooks.call("clockUpdated", clockId, clockData, false);
}

async function refreshClockDependentItems(clockId, clockData, isDeletion) {
    //re-render the sheets of every entity linked to this clock
    //get all of the entities linked to this clock
    for (let entityId in clockData.linkedEntities) {
        let entityData = clockData.linkedEntities[entityId];
        let entity;

        //If the entity data is null, that mostl ikely means it has
        //been unlinked from the entity/document. Therefore if we
        // want to re-render, we try and find a window in the ui w/ the
        // same id, extract its type from its id, which should be something like
        // "actor-2j0e0fjidjfoaij" for example
        // and use that to pass to the reRenderLinkedEntity method
        if (entityData == null) {
            let trimmedId = entityId.replace("-=", "");
            let entityWindow = Object.values(ui.windows).find((window) => window.id?.includes(trimmedId));
            let entityWindowId = entityWindow.id;
            let type;
            if (entityWindowId.includes("actor")) {
                type = "Actor";
            } else if (entityWindowId.includes("item")) {
                type = "Item";
            } else if (entityWindowId.includes("journalentry")) {
                type = "JournalEntry";
            }
            await HelperFunctions.getEntityById(type, trimmedId).then((value) => (entity = value));
            if (entity?.sheet && entity.sheet.rendered) {
                reRenderLinkedEntity(entity, clockId);
            }
        } else {
            await HelperFunctions.getEntityById(entityData.entity, entityId).then((value) => (entity = value));
            if (entity?.sheet && entity.sheet.rendered) {
                reRenderLinkedEntity(entity, clockId);
            }
        }
        // }
    }
    //re-render the ClockDisplay
    if (game.clockDisplay) {
        game.clockDisplay.render(true);
    }
    //close or re-render any rendered clocks
    if (isClockRendered(clockId)) {
        if (isDeletion) {
            game.renderedClocks[clockId].close();
        } else {
            if (game.userId == clockData.creator) {
                game.renderedClocks[clockId].render();
            } else {
                updateAndFocusClock(clockData);
            }
        }
    }
}

/**
 * Hook for when the clock is updated
 */
Hooks.on("clockUpdated", async (clockId, clockData, isDeletion) => {
    //refresh any document sheet or clock that's attached to this clock
    refreshClockDependentItems(clockId, clockData, isDeletion);
    socket.executeForOthers("refreshClockDependentItems", clockId, clockData, isDeletion);
});

// ==================================

//sets up hook handlers for all the different entity types
function hookEntities() {
    registerHooks("renderJournalSheet");
    registerHooks("renderActorSheet");
    registerHooks("renderItemSheet");
    registerSceneHook();
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
            classes: ["form", "hud-and-trackers"],
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
}

export class Section {
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

Handlebars.registerHelper("getValues", (data) => {
    return Object.values(data);
});
