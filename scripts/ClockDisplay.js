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
        }
        // this.clocks.forEach((element) => {
        //     this.handleBreaksAndWaypoints(element);
        // });
    }
    async handleBreaksAndWaypoints(element) {
        console.log("Clock data should be", element);
        //adding breaks if we have any
        let sectionsArray = $(`form#${element.ourId} .clockSection`).toArray();
        let framesArray = $(`form#${element.ourId} .frameSection`).toArray();
        let breakLabels = $(`form#${element.ourId} .breakLabel`).toArray();
        let waypoints = $(`form#${element.ourId} .waypoint`).toArray();
        let count = 0;
        //go through all the sub-sections if there are some
        if (element.breaks.length > 0) {
            //if breaks is = [2, 1, 2]
            element.breaks.forEach((num) => {
                count += num; //count = 2, first time around, 3 second time around, 5 3rd time around
                $(sectionsArray[count - 1]).attr("data-break", true); //(we're subtracting one since array indices start at zero)
            });
            let i = 0;

            for (i = 0; i < element.breaks.length; i++) {
                $(framesArray[i]).width((index, currentWidth) => {
                    return currentWidth * element.breaks[i];
                });
                $(breakLabels[i]).width((index, currentWidth) => {
                    return currentWidth * element.breaks[i];
                });
                $(waypoints[i]).width((index, currentWidth) => {
                    return currentWidth * element.breaks[i];
                });
            }
        }
    }

    async _updateObject(event, formData) {}
}
