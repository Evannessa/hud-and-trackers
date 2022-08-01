"use strict";
import {
    Clock,
    getSharedClocks,
    getClocksLinkedToEntity,
    getAllClocks,
    isClockRendered,
    renderNewClockFromData,
    getClocksByUser,
    getGlobalClockDisplayData,
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
        this.data = data;

        this.parent = parent;
        this.initialized = false;

        //this keeps track of if the initial width of the clocks has been set
        //for the purposes of calculating the width for the accordion
        //animation
        this.clocksInitialized = {
            sharedClocks: false,
            myClocks: false,
            sceneClocks: false,
        };
    }

    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            classes: ["form", "hud-and-trackers"],
            popOut: true,
            left: -380,
            template: `modules/hud-and-trackers/templates/clock-partials/clock-display.hbs`,
            // id: "clock-display",
            title: "Clock Display",
        });
    }
    /**
     * this is taking the clocks in each category or type
     * and converting it into data that can be used by the templates (.e.g, turning sectionMap object into
     * an array of the clock's sections)
     * @param object - all the clock data held within a certain category or type (e.g., sharedClocks, sceneClocks, personalClocks.)
     * @param parentObject - the category object within our "data" object that we want to fill with the converted clock data
     * */
    convertTemplateData(object, parentObject) {
        for (let clockId in object) {
            parentObject[clockId] = { ...object[clockId] };
            parentObject[clockId].sections = Object.values(object[clockId].sectionMap);
            parentObject[clockId].user = game.user;
        }
    }

    /**
     * This method goes through all the clocks in the category passed to it, and applies the gradients,
     * fills the sections, and handles the breaks & waypoints for the associated elements in the DOM
     * @param {Object} object - a single category/type of clocks (e.g., sharedClocks, sceneClocks, etc.);
     * @param {string} parentName - the name of the associated parent element in the DOM (probably should be id)
     */
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
        await getGlobalClockDisplayData().then((value) => (this.data = value));
        return this.data;
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
                            [scene.id]: { name: scene.name, entity: scene.documentName },
                        },
                    };
                }

                new ClockConfig(data, false).render(true);
                break;
            case "expand":
                //get the category whose button was clicked
                let category = el.closest(".clockCategory");
                let name = category.data().name;

                //toggle wether the content for this category is toggled
                //toggle open classes on button and category
                //(these classes will toggle the styling
                //on the button and category elements)
                el.toggleClass("open");
                category.toggleClass("open");

                //call the expandButtonClicked method
                this.expandButtonClicked(el);
                this.data.categoriesShown[name] = !this.data.categoriesShown[name];
                await game.user.setFlag("hud-and-trackers", "displayCategoriesShown", this.data.categoriesShown);
                break;
        }
    }

    /**
     * measure the outerWidth of the content in the category (.clockCategory__inner class)
     * (the content holds the actual `clock' components)
     * and save its value on a property on the element.
     * Note!: We're keeping track of if this is the first time the display is rendering or not with
     * the clocksInitialized object.
     * If this is called again, for example whenever a clock
     * is added, updated or deleted, we want to add the no-transition class and set a timeout
     * so the transition animation isn't played again every time a clock is updated, which would be annoying
     * @param {*} index - unused
     * @param {element} element - the clockCategory (holds both the button and the content)
     */
    async measureAccordionContents(index, element) {
        var contentWidth = $(element).find(".clockCategory__inner").outerWidth();
        let cs = await game.user.getFlag("hud-and-trackers", "displayCategoriesShown", this.data.categoriesShown);
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
        //turn transition back on after waiting so the transition
        //isn't played when a clock is played
        setTimeout(() => {
            if (parent.hasClass("no-transition")) {
                parent.removeClass("no-transition");
            }
        }, 300);

        //save the width on a property on the element itself
        element.style.setProperty("--expanded", contentWidth + "px");
    }

    /**
     * Find the content of the clockCategory (clockCategory__inner class)
     * and toggle the is-visible and is-hidden classes, which will make it
     * grow or hide
     * @param {*} element - the button that was clicked
     */
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
        this.data.categoriesShown[name] = el.prop("checked");
        if (el.prop("checked")) {
            //insert a check icon
            el.next("label").children("span").html('<i class="fas fa-check"></i>');
        } else {
            //insert a plus icon
            el.next("label").children("span").html(`<i class="fas fa-plus"></i>`);
        }
        //set the variable to equal whether it is checked or not
        //save that in the user's flags
        await game.user.setFlag("hud-and-trackers", "displayCategoriesShown", this.data.categoriesShown);
        this.render();
    }

    /**
     * Basically opens the individual app version/detailed version of the clock
     * @param {event} event - the click event that triggered this
     */
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

        //apply the gradients, refill the empty sections, etc.
        for (let clockType in this.data.data) {
            this.applyTemplateDressing(this.data.data[clockType], clockType);
        }

        //for each category, measure the contents of the clock
        $("#clock-display .clockCategory").each(this.measureAccordionContents.bind(this));
    }

    applyGradientToEach(clockData, children) {
        let size = 100 * clockData.sectionCount;
        let position = 100 * clockData.sectionCount;
        for (let child of children) {
            child = $(child);
            child.css("background-size", `${size}% 100%`);
            child.css("background-position", `${position}% 0%`);
            position -= 100;
        }
    }

    replaceGradientDirection(gradientString) {
        const regex = /(\d+)deg/i;
        return gradientString.replace(regex, "to bottom");
    }

    /**
     * apply a gradient to the clock
     * @param {object} clockData - the data for each particular clock
     * @param {string} parentName - the name of the clockCategory this clock is under
     * (the associated element will have a class of the same name)
     */
    async applyGradient(clockData, parentName) {
        let clockWrapper = $(`#clock-display .${parentName} form[data-id='${clockData.ourId}'] .clockWrapper`);
        clockWrapper.addClass("clockWrapper__squares");
        //make the background wrapper's gradient look like the chosen one
        if (clockData.gradient.includes("gradient")) {
            //find all the children and change their backgroundImage
            clockWrapper.children(".clockSection.filled").each((index, element) => {
                $(element).css("backgroundImage", `${clockData.gradient}`);
            });
        } else {
            //find all the children and add a class
            clockWrapper.children(".clockSection.filled").each((index, element) => {
                $(element).addClass(`${clockData.gradient}`);
            });
        }
        this.applyGradientToEach(clockData, clockWrapper.children(".clockSection"));
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
