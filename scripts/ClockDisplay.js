"use strict";
// import { gsap } from "../../../../scripts/greensock/esm/all.js";
// gsap.registerPlugin(Flip);
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
        this.initialized = false;
        this.clocksInitialized = {
            sharedClocks: false,
            myClocks: false,
            sceneClocks: false,
        };
    }

    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            classes: ["form"],
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

        let tooltipText = {
            sharedClocks: "Clocks that have been shared with you",
            myClocks: "Clocks you've personally created",
            sceneClocks: "Clocks linked to the scene you're viewing",
        };
        let addClockTooltipText = {
            sharedClocks: "Add new clock that'll automatically be shared",
            myClocks: "Add new personal clock only you can see",
            sceneClock: "Add new clock linked to the scene you're viewing",
        };
        let emptyText = {
            sharedClocks: "No clocks are being shared by other users.",
            myClocks: "You haven't created any clocks.",
            sceneClocks: "You haven't linked any clocks to this scene",
        };

        for (let clockType in this.otherClocks) {
            this.convertTemplateData(this.otherClocks[clockType], data[clockType]);
        }

        return {
            data: data,
            categoriesShown: this.categoriesShown,
            tooltipText: tooltipText,
            addClockTooltipText: addClockTooltipText,
            emptyText: emptyText,
        };
    }

    /**
     * Handles buttons clicked on the ClockDisplay
     * @param {Object} event - the button click event
     */
    async handleButtonClick(event) {
        event.preventDefault();
        let el = $(event.currentTarget);
        let action = el.data().action;

        switch (action) {
            case "showClocks":
                el.closest("#clock-display").toggleClass("expanded");
                break;
            case "addClock":
                let categoryName = el.closest(".clockCategory").data().name;
                let data = {};
                if (categoryName === "sharedClocks") {
                    //if we create a clock in the shared clock category
                    //set it to be shared by default
                    data = { shared: true };
                } else if (categoryName === "sceneClocks") {
                    //if we create a clock in the scene clocks category
                    //set its linked entities to include the viewed scene
                    //by default
                    let scene = game.scenes.viewed;
                    data = {
                        linkedEntities: {
                            [scene.id]: { name: scene.name, entity: scene.entity },
                        },
                    };
                }
                new ClockConfig(data, false).render(true);
                break;
            case "expand":
                let category = el.closest(".clockCategory");
                let container = el.next(".clockCategory__inner");
                let name = category.data().name;

                el.toggleClass("open");
                this.expandButtonClicked(el);
                this.categoriesShown[name] = !this.categoriesShown[name];
                await game.user.setFlag(
                    "hud-and-trackers",
                    "displayCategoriesShown",
                    this.categoriesShown
                );
                break;
        }
    }
    async measureAccordionContents(index, element) {
        var contentWidth = $(element).find(".clockCategory__inner").outerWidth();
        let cs = await game.user.getFlag(
            "hud-and-trackers",
            "displayCategoriesShown",
            this.categoriesShown
        );
        let elementName = $(element).data().name;
        let inner = $(element).find(".clockCategory__inner");
        let parent = $(element).closest(".app");

        // !not sure if this if statement is necessary v
        if (game.clockDisplay.clocksInitialized[elementName] == false) {
            game.clockDisplay.clocksInitialized[elementName] = true;
        } else {
            //turn off transition
            parent.addClass("no-transition");
        }
        // set default class toggles
        if (cs[$(element).data().name]) {
            $(element).find(".clockCategory__inner").toggleClass("is-visible");
        } else {
            $(element).find(".clockCategory__inner").toggleClass("is-hidden");
        }
        //turn transition back on
        setTimeout(() => {
            if (parent.hasClass("no-transition")) {
                parent.removeClass("no-transition");
            }
        }, 300);

        element.style.setProperty("--expanded", contentWidth + "px");
    }

    async expandButtonClicked(element) {
        var clickedItem = element;
        var content = $(clickedItem).parent().find(".clockCategory__inner");
        content.toggleClass("is-visible").toggleClass("is-hidden");
    }

    //if one of the toggle switches (checkboxes) is checked
    async handleInputChange(event) {
        event.preventDefault();
        event.stopPropagation();
        let el = $(event.currentTarget);
        let name = el.data().name;
        this.categoriesShown[name] = el.prop("checked");
        if (el.prop("checked")) {
            //insert a check icon
            el.next("label").children("span").html('<i class="fas fa-check"></i>');
        } else {
            //insert a plus icon
            el.next("label").children("span").html(`<i class="fas fa-plus"></i>`);
        }
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
        $(html).off("change", "input[type='checkbox']");
        $(html).on("click", "[data-action]", this.handleButtonClick.bind(this));
        $(html).on("click", ".clockApp", this.openClock);

        for (let clockType in this.categoriesShown) {
            //set the toggle switches values to equal what's stored in "categories shown"
            if (this.categoriesShown[clockType] === false) {
                // $(
                //     `.clockCategory[data-name='${clockType}'] .clockCategory__inner`
                // ).hide();
            }
        }

        for (let clockType in this.otherClocks) {
            this.applyTemplateDressing(this.otherClocks[clockType], clockType);
        }

        $(".clockCategory").each(this.measureAccordionContents);
    }

    replaceGradientDirection(gradientString) {
        const regex = /(\d+)deg/i;
        return gradientString.replace(regex, "to bottom");
    }

    async applyGradient(clockData, parentName) {
        let clockWrapper = $(
            `#clock-display .${parentName} form[data-id='${clockData.ourId}'] .clockWrapper`
        );
        //make the background wrapper's gradient look like the chosen one
        // clockWrapper.css("backgroundImage", clockData.gradient);
        let newGradient = this.replaceGradientDirection(clockData.gradient);
        clockWrapper.children(".clockSection.filled").each((index, element) => {
            $(element).css("backgroundImage", newGradient);
        });
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
