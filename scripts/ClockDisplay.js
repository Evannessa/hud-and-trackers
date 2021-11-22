"use strict";
import {
    Clock,
    getSharedClocks,
    getClocksLinkedToEntity,
    getAllClocks,
    isClockRendered,
    renderNewClockFromData,
    getClocksByUser,
} from "./clock.js";
import { convertArrayIntoObjectById } from "./helper-functions.js";
import { ClockConfig } from "./ClockConfig.js";

export class ClockDisplay extends Application {
    constructor(data = {}, parent) {
        if (!parent) {
            super(data, { id: "clock-display" });
            this.options.id = "clock-display";
        } else {
            super(data, { id: "clock-display_app-child" });
            this.options.id = "clock-display_app-child";
            console.log("Our data is", data);
        }
        this.categoriesShown = {
            sharedClocks: true,
            myClocks: false,
            sceneClocks: false,
        };
        if (!game.user.getFlag("hud-and-trackers", "displayCategoriesShown")) {
            game.user.setFlag(
                "hud-and-trackers",
                "displayCategoriesShown",
                this.categoriesShown
            );
        }
        this.clocks = data;
        this.otherClocks = {
            myClocks: getClocksByUser(game.userId),
            sceneClocks: convertArrayIntoObjectById(
                getClocksLinkedToEntity(game.scenes.viewed.id)
            ),
        };
        this.parent = parent;
    }

    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            classes: ["form", "clockHud"],
            popOut: true,
            left: -380,
            template: `modules/hud-and-trackers/templates/clock-partials/clock-display.hbs`,
            // id: "clock-display",
            title: "Clock Display",
        });
    }
    convertTemplateData(object, parentObject) {
        for (let clockId in object) {
            parentObject[clockId] = { ...object[clockId] };
            parentObject[clockId].sections = Object.values(object[clockId].sectionMap);
            parentObject[clockId].user = game.user;
        }
    }

    applyTemplateDressing(object, parentName) {
        var i = 0;
        for (var clockId in object) {
            this.handleBreaksAndWaypoints(object[clockId], parentName);
            this.refillSections(object[clockId], parentName);
            this.applyGradient(object[clockId], parentName);
            i++;
        }
    }

    async getData() {
        this.clocks = getSharedClocks();

        this.otherClocks = {
            sharedClocks: getSharedClocks(),
            myClocks: getClocksByUser(game.userId),
            sceneClocks: convertArrayIntoObjectById(
                getClocksLinkedToEntity(game.scenes.viewed.id)
            ),
        };

        this.categoriesShown = await game.user.getFlag(
            "hud-and-trackers",
            "displayCategoriesShown"
        );
        //if the flag returns null, create it, and set it to these defaults
        if (!this.categoriesShown) {
            this.categoriesShown = {
                sharedClocks: true,
                myClocks: false,
                sceneClocks: false,
            };
            await game.user.setFlag(
                "hud-and-trackers",
                "displayCategoriesShown",
                this.categoriesShown
            );
        }
        let data = {
            sharedClocks: {},
            myClocks: {},
            sceneClocks: {},
        };

        for (let clockType in this.otherClocks) {
            this.convertTemplateData(this.otherClocks[clockType], data[clockType]);
        }

        return {
            data: data,
            categoriesShown: this.categoriesShown,
            //  await game.user.getFlag(
            //     "hud-and-trackers",
            //     "displayCategoriesShown"
            // ),
        };
    }

    handleButtonClick(event) {
        event.preventDefault();
        let el = $(event.currentTarget);
        let action = el.data().action;
        switch (action) {
            case "showClocks":
                el.closest("#clock-display").toggleClass("expanded");
                break;
            case "addClock":
                let clockConfig = new ClockConfig({}, false).render(true);
                break;
        }
    }
    //if one of the toggle switches (checkboxes) is checked
    async handleInputChange(event) {
        event.preventDefault();
        let el = $(event.currentTarget);
        let name = el.data().name;
        this.categoriesShown[name] = el.prop("checked");
        //set the variable to equal whether it is checked or not
        //save that in the user's flags
        await game.user.setFlag(
            "hud-and-trackers",
            "displayCategoriesShown",
            this.categoriesShown
        );
        this.render();
    }

    openClock(event) {
        // event.preventDefault();
        let el = $(event.currentTarget);
        let id = el.attr("id");
        if (!isClockRendered()) {
            renderNewClockFromData(getAllClocks()[id]);
        }
    }

    activateListeners(html) {
        //! The "html" will be different depending on if you're using application or form-application
        super.activateListeners(html);
        html = html.closest(".app");
        $(html).off("click", "[data-action]");
        $(html).off("click", ".clockApp");
        $(html).on("click", "[data-action]", this.handleButtonClick.bind(this));
        $(html).on("click", ".clockApp", this.openClock);
        $(html).on("change", "input[type='checkbox']", this.handleInputChange.bind(this));
        for (let clockType in this.categoriesShown) {
            //set the toggle switches values to equal what's stored in "categories shown"
            $(`input[data-name='${clockType}']`).prop(
                "checked",
                this.categoriesShown[clockType]
            );
        }
        for (let clockType in this.otherClocks) {
            this.applyTemplateDressing(this.otherClocks[clockType], clockType);
        }
    }
    async applyGradient(clockData, parentName) {
        let clockWrapper = $(
            `#clock-display .${parentName} form[data-id='${clockData.ourId}'] .clockWrapper`
        );
        //make the background wrapper's gradient look like the chosen one
        clockWrapper.css("backgroundImage", clockData.gradient);
    }

    /**
     * refill the sections based on how many sections are filled
     */
    async refillSections(clockData, parentName) {
        let filled = 0;
        let sectionsArray = $(
            `#clock-display .${parentName} form[data-id='${clockData.ourId}'] .clockSection`
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
    async handleBreaksAndWaypoints(clockData, parentName) {
        //adding breaks if we have any
        let string = `#clock-display .${parentName} form[data-id='${clockData.ourId}']`;
        //TODO: Replace all these long strings with the above + .clockSection
        let sectionsArray = $(`${string} .clockSection`).toArray();
        let framesArray = $(`${string} .frameSection`).toArray();
        let breakLabels = $(`${string} .breakLabel`).toArray();
        let waypoints = $(`${string} .waypoint`).toArray();
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
