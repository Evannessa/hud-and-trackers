"use strict";
import { ClockDisplay } from "./ClockDisplay.js";
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
    socket.register("saveAndRenderApp", saveAndRenderApp);
    socket.register("saveClock", saveClock);
});
//attack all the clocks to their linked entities' render hooks
// start a rendered clock object to keep track of
// all the rendered clocks
Hooks.on("ready", () => {
    game.sharedClocks = {};
    game.clockDisplay = new ClockDisplay().render(true);
    game.renderedClocks = {};
    hookEntities();
});
Hooks.on("renderClockViewer", (app, html) => {
    game.clockViewer = app;
});

function addToSharedClocks(clock) {
    game.sharedClocks[clock.ourId] = clock;
    updateClockDisplay();
}
function removeFromSharedClocks(clock) {
    delete game.sharedClocks[clock.ourId];
    updateClockDisplay();
}

function updateSharedClocks(clock) {
    game.sharedClocks[clock.ourId] = clock;
    updateClockDisplay();
}

function updateClockDisplay() {
    if (game.clockDisplay) {
        game.clockDisplay.clocks = game.sharedClocks;
        game.clockDisplay.render(true);
    }
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

/**For showing clocks */
class Clock extends FormApplication {
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
            console.log("should be rendering");
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
        console.log("How many times is this being called?");
        event.preventDefault();
        //delete us in all our linked entities
        for (let entityId in app.data.linkedEntities) {
            //special syntax for deleting a specific key in flag objects
            let ourEntity;
            await HelperFunctions.getEntityById(
                this.data.linkedEntities[entityId].entity,
                entityId
            ).then((value) => (ourEntity = value));

            await unlinkClockFromEntity(ourEntity, app.data.ourId);
        }
        //delete us from the saved clocks setting
        deleteClock(app.data.ourId);

        if (game.clockViewer && game.clockViewer.rendered) {
            //TODO: Find way to delay this until after the clocks are updated
            game.clockViewer.render(true);
        }
        this.close();
    }

    //this will handle if the clock's share button is clicked
    async handleShareClock(event, app) {
        event.preventDefault();
        if (this.data.shared) {
            this.data.shared = false;
            //remove from shared clocks
            removeFromSharedClocks(this.data);
            ui.notifications.notify("Stopped sharing clock");
        } else {
            this.data.shared = true;
            //add to shared clocks
            addToSharedClocks(this.data);
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
        await HelperFunctions.getEntityById(entityType, entityId).then(
            (value) => (ourEntity = value)
        );

        if (event.altKey) {
            //if alt key is pressed, we're going to unlink the entity
            await unlinkClockFromEntity(ourEntity, this.data.ourId);
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
        console.log("Handling click!");
        event.stopPropagation();

        let clickedElement = $(event.currentTarget); //this will return the form itself?

        let action = clickedElement.data().action;

        const elementId = clickedElement.id;

        console.log(action);
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
                value="linear-gradient(to right, #DC2424 0%, #4A569D  100%)"
                checked
            />
            <label for="reddish">Reddish</label>
        </div>

        <div class="purple">
            <input
                type="radio"
                id="purple"
                name="gradient"
                value="linear-gradient(to right, #4776E6 0%, #8E54E9  100%)"
            />
            <label for="purple">Purple</label>
        </div>

        <div class="bluePink">
            <input
                type="radio"
                id="bluePink"
                name="gradient"
                value="linear-gradient(62deg, rgb(21, 213, 235) 0.00%, rgb(255, 0, 191) 100.00%)"
            />
            <label for="bluePink">Blue Pink</label>
        </div>
        <div class="turquoise">
            <input
                type="radio"
                id="turquoise"
                name="gradient"
                value="linear-gradient(132deg, rgb(161, 255, 255) 0.00%, rgb(0, 216, 216) 100.00%)"
            />
            <label for="turquoise">Turquoise</label>
        </div>
        <div class="pinkLemonade">
            <input
                type="radio"
                id="pinkLemonade"
                name="gradient"
                value="linear-gradient(132deg, rgb(253, 112, 136) 0.00%, rgb(255, 211, 165) 100.00%)"
            />
            <label for="pinkLemonade">Pink Lemonade</label>
        </div>
        <div class="fire">
            <input
                type="radio"
                id="fire"
                name="gradient"
                value="linear-gradient(132deg, rgb(250, 170, 0) 0.00%, rgb(237, 19, 19) 50.00%, rgb(213, 74, 255) 100.00%)"
            />
            <label for="fire">Fire</label>
        </div>
        <div class="magic">
            <input
                type="radio"
                id="magic"
                name="gradient"
                value="linear-gradient(132deg, rgb(0, 255, 157) 0.00%, rgb(227, 43, 175) 100.00%)"
            />
            <label for="magic">Magic</label>
        </div>
        <div class="pastel">
            <input
                type="radio"
                id="pastel"
                name="gradient"
                value="linear-gradient(132deg, rgb(255, 206, 236) 0.00%, rgb(151, 150, 240) 100.00%)"
            />
            <label for="pastel">Pastel</label>
        </div>`,
                    buttons: {
                        yes: {
                            icon: '<i class="fas fa-check"></i>',
                            label: "Change Color",
                            callback: (html) => {
                                let newGradient = html
                                    .find("input[name='gradient']:checked")
                                    .val();

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
        clockWrapper.style.backgroundImage = this.data.gradient;

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
        if (!this.userIsCreator()) {
            //if we're not the creator
            //just render it and don't save it
            this.render();
            return;
        }

        await updateClock(this.data.ourId, this.data);
        // //get saved clocks from settings

        //if we're sharing this, update on other users' ends
        if (this.data.shared) {
            updateSharedClocks(this.data);
            socket.executeForOthers("renderNewClockFromData", this.data);
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
        let ourEntity;
        await HelperFunctions.getEntityById(data.type, data.id).then(
            (value) => (ourEntity = value)
        );
        console.log(ourEntity);

        if (ourEntity) {
            //save the linked entity on our clock
            //save this entity a linked entity on our clock
            let entityData = {
                name: ourEntity.name,
                entity: ourEntity.entity,
            };
            //get our linked entities, and find the id of this entity, and add the linked entities to this data
            this.data.linkedEntities[data.id] = entityData;

            //make a new object for storing the clock on the entity as well
            const newLinkedClocks = {
                [this.data.ourId]: this.data,
            };

            //set the entity flag *after* the linkedEntities is updated, so that the entity
            //gets the most recent version
            await ourEntity.setFlag("hud-and-trackers", "linkedClocks", newLinkedClocks);
            this.saveAndRenderApp();
        }
    }

    async _updateObject(event, formData) {
        let clockData = await getAllClocks()[this.data.ourId];
        console.log(clockData);
        this.updateEntireClock(clockData, true);
    }
}

//registers the hooks for journal sheets, actor sheets, item sheets
function registerHooks(hookName) {
    Hooks.on(hookName, async (app, html) => {
        console.log("Rendering actor sheet!");
        let linkedClocks = await app.object.getFlag("hud-and-trackers", "linkedClocks");
        //if we have linked clocks
        if (linkedClocks && Object.keys(linkedClocks).length > 0) {
            app.element.css("position", "relative");
            // $(html[0]).css("position", "relative");
            if (app.element.find(".clock-drawer").length == 0) {
                await showClockDrawer(app, html, linkedClocks);
            }
            // for (let clockId in linkedClocks) {
            //     // renderNewClockFromData(linkedClocks[clockId]);
            // }
        }
    });
}
//show a floating clock drawer on sheets that have linked clocks
async function showClockDrawer(app, html, linkedClocks) {
    let entity = app.object;

    //get the handlebars template
    const template =
        "modules/hud-and-trackers/templates/clock-partials/clock-drawer.html";

    //render the handlebars template
    var drawerHtml = await renderTemplate(template, {
        clocks: linkedClocks,
        entityType: entity.entity,
    });

    //convert it to a jquery object
    drawerHtml = $(drawerHtml);
    drawerHtml.on("keydown", function (e) {
        console.log(e);
    });

    //get the app's element and append this
    app.element.append(drawerHtml);

    //find all the buttons, (filter to avoid grabbing anything that's not a button)
    let buttons = drawerHtml.find(".button-holder").children(); //[0].children());
    buttons = buttons.filter("button");

    //get the DOM object from the jquery object, loop through, and add event listeners
    buttons.get().forEach((element) => {
        $(element).mouseenter((event) => {
            if (event.altKey) {
                $(element).css("background-color", "red");
            }
        });
        $(element).mouseleave((event) => {
            $(element).css("background-color", "#252423");
        });
        $(element).keydown((event) => {
            console.log(event);
        });
    });

    //add click event listener for all of the button elements with "data-action"
    drawerHtml.on("click", "[data-action]", async (event) => {
        event.preventDefault();
        const clickedElement = $(event.currentTarget);
        //if we have the alt key held down, unlink instead
        if (event.altKey) {
            await unlinkClockFromEntity(entity, clickedElement.id);
            //re-render this sheet and return
            drawerHtml.remove();
            // app.render(true);
            return;
        }
        const action = clickedElement.data().action;
        console.log(clickedElement);
        let clockData = linkedClocks[clickedElement.attr("id")];
        switch (action) {
            case "open": {
                await renderNewClockFromData(clockData);
            }
        }
    });
}

//check if the clock is already rendered
function isClockRendered(clockId) {
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
        let linkedClocks = canvas.scene.getFlag("hud-and-trackers", "linkedClocks");
        if (linkedClocks) {
            for (let clockId in linkedClocks) {
                renderNewClockFromData(linkedClocks[clockId]);
            }
        }
    });
}
/**
 * renders a new clock from saved clock data, or updates and brings-to-top the clock if it is already rendered
 * @param {Object} clockData - an object holding the clock's data
 */
async function renderNewClockFromData(clockData) {
    if (!isClockRendered(clockData.ourId)) {
        await new Clock(clockData).render(true);
    } else {
        game.renderedClocks[clockData.ourId].updateEntireClock(clockData);
        game.renderedClocks[clockData.ourId].bringToTop();
    }
}

//external functions for socket to handle internal function of Clock Object
async function saveAndRenderApp(clockApp) {
    clockApp.saveAndRenderApp();
}

/**
 * !deprecated
 * @param {Object} clock - saves a clock
 */
async function saveClock(clock) {
    let savedClocks = await game.settings.get("hud-and-trackers", "savedClocks");
    savedClocks[clock.ourId] = clock;
    await game.settings.set("hud-and-trackers", "savedClocks", savedClocks);
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

/**
 * this function will save (or update) a clock to the user's flags
 * @param {String} clockId - the id of the clock to update the flags with
 * @param {Object} updateData - the object containing the data we want to update the clock with
 * @param {String} userId - the id of the user whose clock this is, and whose flags we will update
 */
async function updateClock(clockId, updateData, userId) {
    if (!userId) {
        const relevantClock = getAllClocks()[clockId];
        userId = relevantClock.creator;
    }
    const updateInfo = {
        [clockId]: updateData,
    };
    let user = game.users.get(userId);

    let result = await user.setFlag("hud-and-trackers", "savedClocks", updateInfo);
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
    user.setFlag("hud-and-trackers", "savedClocks", keyDeletion);
}

/**
 *  This function removes the clock (by its id) from the entity's flags
 * @param {Object} ourEntity - the entity (Document?) we want to unlink the clock from
 * @param {String} clockId - the id of the clock we want to delete
 */
async function unlinkClockFromEntity(ourEntity, clockId) {
    await ourEntity.setFlag("hud-and-trackers", "linkedClocks", {
        [`-=${clockId}`]: null,
    });

    if (ourEntity.sheet.rendered) {
        //if the entity sheet is rendered, re-render it
        if (ourEntity.sheet.element.find(".clock-drawer")) {
            ourEntity.sheet.element.remove(".clock-drawer");
        }
        ourEntity.sheet.render(true);
    }
    //get the clock and delete the linked entity from the clock
    let clockData = getClocksByUser(game.userId)[clockId];

    let deletion = {
        [clockId]: {
            linkedEntities: {
                [`-=${ourEntity.id}`]: null,
            },
        },
    };
    let result = await game.user.setFlag("hud-and-trackers", "savedClocks", deletion);

    if (isClockRendered(clockId)) {
        let clocks = await game.user.getFlag("hud-and-trackers", "savedClocks");
        let newClockData = clocks[clockId];
        game.renderedClocks[clockId].updateEntireClock(newClockData, true);
    }
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
    constructor(clockData = {}, clone = false) {
        super(clockData);
        //cloning the clockData here so it doesn't affect the original object
        this.data = { ...clockData };
        this.clone = clone;
    }
    getData() {
        let defaultData = {
            name: `NewClock`,
            sectionCount: 3,
            breaks: "", //[2, 3, 4],
            showWaypoints: false,
            startFilled: false,
        };
        if (Object.keys(this.data).length == 0) {
            return defaultData;
        } else {
            this.data.breaks = this.data.breaks.toString();
            this.data.name = this.data.name + "(copy)";
            return {
                ...this.data,
                isClone: this.clone,
            };
        }
    }
    async _updateObject(event, formData) {
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
        //initialize extra values that don't come from the form
        //!TODO: copy these when clock is cloned
        let linkedEntities = {};
        let sectionMap = {};
        let filledSections = 0;
        let breakLabels = {};
        let waypoints = {};

        //loop through and populate the section map with new sections.
        //if start filled is active, set filledSections to the full amount

        if (formData.startFilled) {
            filledSections = formData.sectionCount;
        }
        //if we copy the fill
        //!this will override the above option. Maybe make into a radio button later.
        if (formData.copyFill) {
            filledSections = this.data.filledSections;
        }
        //if we're not copying the clock, or copying the labels
        if (!formData.copyLabels) {
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
        } else {
            //if we are cloning && copying, just set the values to equal the same
            sectionMap = this.data.sectionMap;
            breakLabels = this.data.breakLabels;
            waypoints = this.data.waypoints;
        }

        let id = HelperFunctions.idGenerator();

        //TODO: Add functionality to delete original clock
        // if (formData.deleteOriginal) {
        //     //delete the property so we don't worry about it
        //     delete formData.deleteOriginal;
        // }
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

        //create the clock w/ the new data
        let newClock = new Clock(newClockData);

        //save the clock's data to the users' flags by id
        updateClock(newClock.data.ourId, newClockData, game.userId);

        //render new clock
        newClock.render(true);

        if (game.clockViewer && game.clockViewer.rendered) {
            //re-render the clock viewer if it's open
            game.clockViewer.render(true);
        }
        // this.render();
    }

    _handleButtonClick(event) {
        // event.preventDefault(); //keep form from submitting?
        let clickedElement = $(event.currentTarget);
        let action = clickedElement.data().action;
        switch (action) {
            case "cancel": {
                event.preventDefault();
                this.close();
            }
        }
    }
    activateListeners(html) {
        // html.off("click", ["data-action"]);
        html.on("click", ["data-action"], this._handleButtonClick.bind(this));

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

        //if this is a cloned of another clock
        if (this.clone) {
            //set the selected gradient to the original's gradient
            let setGradient = html.find(`[value="${this.data.gradient}"]`);
            setGradient.prop("checked", true);
        }
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

Handlebars.registerHelper("getValues", (data) => {
    return Object.values(data);
});
