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
            classes: ["form"],
            popOut: true,
            template: `modules/hud-and-trackers/templates/clock-partials/clock-display.hbs`,
            id: "clock-display",
            title: "Clock Display",
        });
    }

    getData() {
        return {
            ...this.clocks,
        };
    }

    activateListeners(html) {
        super.activateListeners(html);
        for (var clockId in this.clocks) {
            this.handleBreaksAndWaypoints(this.clocks[clockId]);
            this.refillSections(this.clocks[clockId]);
        }
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
