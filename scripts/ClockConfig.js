"use strict";
import * as HelperFunctions from "./helper-functions.js";
import { Section, Clock, updateClock } from "./clock.js";

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
            breaks: "",
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
