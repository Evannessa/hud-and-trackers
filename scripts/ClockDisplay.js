"use strict";
import { getClocksByUser } from "./clock.js";

export class ClockDisplay extends FormApplication {
    constructor(data = {}) {
        super(data);
        //TODO: We want to show the shared clocks, but this is fine for now
        this.clocks = game.sharedClocks; //getClocksByUser(game.userId);
    }

    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            classes: ["form", "clockHud"],
            popOut: true,
            template: `modules/hud-and-trackers/templates/clock-partials/clock-display.hbs`,
            id: "clock-display",
            title: "Clock Display",
        });
    }

    getData() {
        let testClock = {
            name: "none",
            breakLabels: {},
            breaks: [],
            filledSections: 2,
            gradient: "",
            linkedEntities: {},
            ourId: "id0",
            sectionCount: 3,
            sectionMap: {},
            showWayPoints: false,
            startFilled: false,
            waypoints: {},
            user: game.user,
        };
        let data = {};
        for (let clockId in this.clocks) {
            data[clockId] = { ...this.clocks[clockId] };
            data[clockId].sections = Object.values(this.clocks[clockId].sectionMap);
            data[clockId].user = game.user;
        }
        return data;
    }

    activateListeners(html) {
        // super.activateListeners(html);
        let i = 0;
        for (var clockId in this.clocks) {
            //! this seems to be a workaround
            $(`#clock-display section > div`).wrapAll(`<form id=${clockId}>`);
            this.handleBreaksAndWaypoints(this.clocks[clockId]);
            this.refillSections(this.clocks[clockId]);
            this.applyGradient(this.clocks[clockId]);
            i++;
        }
    }
    async applyGradient(clockData) {
        let clockWrapper = $(`#clock-display form#${clockData.ourId} .clockWrapper`);
        //make the background wrapper's gradient look like the chosen one
        clockWrapper.css("backgroundImage", clockData.gradient);
    }

    async refillSections(clockData) {
        let filled = 0;
        let sectionsArray = $(
            `#clock-display form#${clockData.ourId} .clockSection`
        ).toArray();
        sectionsArray.forEach((element) => {
            //refilling the sections after refresh
            if (filled < clockData.filledSections) {
                element.classList.add("filled");
                filled++;
                clockData.sectionMap[element.id].filled = true;
            }
        });
    }
    async handleBreaksAndWaypoints(clockData) {
        //adding breaks if we have any
        let sectionsArray = $(
            `#clock-display form#${clockData.ourId} .clockSection`
        ).toArray();
        let framesArray = $(
            `#clock-display form#${clockData.ourId} .frameSection`
        ).toArray();
        let breakLabels = $(
            `#clock-display form#${clockData.ourId} .breakLabel`
        ).toArray();
        let waypoints = $(`#clock-display form#${clockData.ourId} .waypoint`).toArray();
        let count = 0;
        //go through all the sub-sections if there are some
        if (clockData.breaks.length > 0) {
            //if breaks is = [2, 1, 2]
            clockData.breaks.forEach((num) => {
                count += num; //count = 2, first time around, 3 second time around, 5 3rd time around
                $(sectionsArray[count - 1]).attr("data-break", true); //(we're subtracting one since array indices start at zero)
            });
            let i = 0;

            for (i = 0; i < clockData.breaks.length; i++) {
                $(framesArray[i]).width((index, currentWidth) => {
                    return currentWidth * clockData.breaks[i];
                });
                $(breakLabels[i]).width((index, currentWidth) => {
                    return currentWidth * clockData.breaks[i];
                });
                $(waypoints[i]).width((index, currentWidth) => {
                    return currentWidth * clockData.breaks[i];
                });
            }
        }
    }

    async _updateObject(event, formData) {}
}
Handlebars.registerHelper("spreadObject", (object) => {
    return { ...object };
});
