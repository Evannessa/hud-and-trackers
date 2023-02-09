"use strict";
import * as HelperFunctions from "./helper-functions.js";
import { Section, Clock, updateClock } from "./clock.js";
// {
//     "name": "boop",
//     "sectionCount": 3,
//     "breaks": [],
//     "showWaypoints": false,
//     "startFilled": false,
//     "gradient": "purple",
//     "sectionMap": {
//         "xsnjsvqgdff8o83o": {
//             "id": "xsnjsvqgdff8o83o",
//             "label": "",
//             "filled": true
//         },
//         "r7x01mlro93by19t": {
//             "id": "r7x01mlro93by19t",
//             "label": "",
//             "filled": true
//         },
//         "wnhuaxq276prnoa1": {
//             "id": "wnhuaxq276prnoa1",
//             "label": "",
//             "filled": false
//         }
//     },
//     "filledSections": 2,
//     "breakLabels": {},
//     "waypoints": {},
//     "linkedEntities": {
//         "TgDkOmX8rdeX2ag8": {
//             "name": "Aron",
//             "entity": "Actor"
//         }
//     },
//     "shared": false,
//     "creator": "xjKGzWFbtOifTl9H",
//     "ourId": "8fuvyy7ihvb5m5tw"
// }
/** This will be the configuration for the clock itself. */
//
export class ClockConfig extends FormApplication {
    /**
     * Configure a new clock object, or update one
     * @param {Object} clockData - the clock data
     * @param {String} clockData.name - the clock's name
     * @param {Number} clockData.sectionCount - the number of sections the clock has
     * @param {Boolean} clone - whether or not to clone the clock we're updating
     */
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
            breaks: "",
            description: "",
            showWaypoints: false,
            startFilled: false,
        };
        if (Object.keys(this.data).length == 0) {
            return defaultData;
        } else {
            if (this.clone) {
                this.data.breaks = this.data.breaks.toString();
                this.data.name = this.data.name + "(copy)";
                return {
                    ...this.data,
                    isClone: this.clone,
                };
            }
            //we're not a clone, but we're changing some of the default data
            //such as being called from an entity sheet
            else {
                return defaultData;
            }
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
        //I'm thinking (hoping) this means it'll set it to an empty object if linkedEntities doesn't exist
        let linkedEntities = (this.data.linkedEntities ||= {});
        let shared = (this.data.shared ||= false);

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
                let sectionID = foundry.utils.randomID(); //foundry.utils.randomID()();
                let sectionData = {
                    id: sectionID,
                    label: "",
                    filled: formData.startFilled,
                };
                sectionMap[sectionID] = new Section(sectionData);
            }

            //populate the break labels with default strings
            formData.breaks.forEach((el) => {
                let labelId = foundry.utils.randomID();
                breakLabels[labelId] = "Input Label";

                let waypointId = foundry.utils.randomID();
                waypoints[waypointId] = "Waypoint";
            });
        } else {
            //if we are cloning && copying, just set the values to equal the same
            sectionMap = this.data.sectionMap;
            breakLabels = this.data.breakLabels;
            waypoints = this.data.waypoints;
        }

        let id = foundry.utils.randomID();

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
            shared: shared,
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
            classes: ["form", "hud-and-trackers"],
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
