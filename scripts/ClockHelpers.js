import { Clock, getAllClocks } from "./clock.js";
import { ClockConfig } from "./ClockConfig.js";

export const ClockHelpers = async function () {
    function handleButtonClick(event, caller) {
        event.preventDefault();
        let el = $(event.currentTarget);
        let action = el.data().action;
        switch (action) {
            case "showClocks":
                el.closest(".app-child").toggleClass("expanded");
                break;
            case "addClock":
                createClock("linked", caller);
                break;
        }
    }

    function createClock(type, caller) {
        console.log(caller, type);
        switch (type) {
            case "linked":
                //we're creating a clock from an entity, so we want
                //that clock to have its linkedEntities object already set
                //with that entity within
                let clockConfig = new ClockConfig(
                    {
                        linkedEntities: {
                            [caller.id]: { name: caller.name, entity: caller.entity },
                        },
                    },
                    false
                ).render(true);

                // caller.sheet.render();
                break;
            case "shared":
                break;
            default:
                break;
        }
    }
    /**
     * This method goes through all the clocks in the category passed to it, and applies the gradients,
     * fills the sections, and handles the breaks & waypoints for the associated elements in the DOM
     * @param {Object} object - a single category/type of clocks (e.g., sharedClocks, sceneClocks, etc.);
     * @param {string} parentName - the name of the associated parent element in the DOM (probably should be id)
     */
    function applyTemplateDressing(object, parentName) {
        var i = 0;
        for (var clockId in object) {
            handleBreaksAndWaypoints(object[clockId], parentName);
            refillSections(object[clockId], parentName);
            applyGradient(object[clockId], parentName);
            i++;
        }
    }

    function applyGradientToEach(clockData, children) {
        let size = 100 * clockData.sectionCount;
        let position = 100 * clockData.sectionCount;
        for (let child of children) {
            child = $(child);
            child.css("background-size", `${size}% 100%`);
            child.css("background-position", `${position}% 0%`);
            position -= 100;
        }
    }

    function replaceGradientDirection(gradientString) {
        const regex = /(\d+)deg/i;
        return gradientString.replace(regex, "to bottom");
    }

    /**
     * apply a gradient to the clock
     * @param {object} clockData - the data for each particular clock
     * @param {string} parentName - the name of the clockCategory this clock is under
     * (the associated element will have a class of the same name)
     */
    async function applyGradient(clockData, parentName) {
        let clockWrapper = $(
            `.clock-display .${parentName} form[data-id='${clockData.ourId}'] .clockWrapper`
        );
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
        applyGradientToEach(clockData, clockWrapper.children(".clockSection"));
    }

    /**
     * refill the sections based on how many sections are filled
     */
    async function refillSections(clockData, parentName) {
        let filled = 0;
        let sectionsArray = $(
            `.clock-display .${parentName} form[data-id='${clockData.ourId}'] .clockSection`
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
    async function handleBreaksAndWaypoints(clockData, parentName) {
        //adding breaks if we have any
        let string = `.clock-display .${parentName} form[data-id='${clockData.ourId}']`;
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
    /**
     * Basically opens the individual app version/detailed version of the clock
     * @param {event} event - the click event that triggered this
     */
    function openClock(event) {
        // event.preventDefault();
        let el = $(event.currentTarget);
        let id = el.attr("id");
        if (!isClockRendered()) {
            renderNewClockFromData(getAllClocks()[id]);
        }
    }

    /**
     *
     * @param {*} html
     * @param {Object} clocks - the clocks whose listeners are being activated
     * @param {Object} caller - what object are the listeners being activated on
     */
    function _activateListeners(html, clockCategories, caller) {
        //! The "html" will be different depending on if you're using application or form-application
        html = html.closest(".app");
        $(html).off("click", "[data-action]");
        $(html).off("click", ".clockApp");
        $(html).on("click", "[data-action]", (event) => {
            handleButtonClick.call(html, event, caller);
        });
        $(html).on("click", ".clockApp", openClock);

        //apply the gradients, refill the empty sections, etc.
        for (let clockType in clockCategories) {
            applyTemplateDressing(clockCategories[clockType], clockType);
        }

        //for each category, measure the contents of the clock
        //! $(".clockCategory").each(this.measureAccordionContents.bind(this));
        //-------------------------------
        // $(html).off("click", "[data-action]");
        // $(html).off("click", ".clockApp");
        // // $(html).on("click", "[data-action]", handleButtonClick.bind(html));
        // $(html).on("click", "[data-action]", (event) => {
        //     handleButtonClick.call(html, event, caller);
        // });
        // $(html).on("click", ".clockApp", openClock.bind(html));
        // let i = 0;
        // for (var clockId in clocks) {
        //     handleBreaksAndWaypoints.call(html, clocks[clockId]);
        //     refillSections.call(html, clocks[clockId]);
        //     applyGradient.call(html, clocks[clockId]);
        //     i++;
        // }
    }

    //check if the clock is already rendered
    function isClockRendered(clockId) {
        return game.renderedClocks[clockId];
    }
    /**
     * renders a new clock from saved clock data,
     * or updates and brings-to-top the clock if it is already rendered
     * @param {Object} clockData - an object holding the clock's data
     */
    async function renderNewClockFromData(clockData) {
        if (!isClockRendered(clockData.ourId)) {
            await new Clock(clockData).render(true);
        } else {
            reRenderClock(clockData);
            // game.renderedClocks[clockData.ourId].updateEntireClock(clockData);
            // game.renderedClocks[clockData.ourId].bringToTop();
        }
    }

    /**
     * updates and brings-to-top an already rendered clock
     * @param {Object} clockData - object holding clock's data
     */
    async function reRenderClock(clockData) {
        game.renderedClocks[clockData.ourId].updateEntireClock(clockData);
        game.renderedClocks[clockData.ourId].bringToTop();
    }
    /**
     * this is taking the clocks in each category or type
     * and converting it into data that can be used by the templates (.e.g, turning sectionMap object into
     * an array of the clock's sections)
     * @param object - all the clock data held within a certain category or type (e.g., sharedClocks, sceneClocks, personalClocks.)
     * @param parentObject - the category object within our "data" object that we want to fill with the converted clock data
     * */
    var convertTemplateData = function (object, parentObject) {
        for (let clockId in object) {
            parentObject[clockId] = { ...object[clockId] };
            parentObject[clockId].sections = Object.values(object[clockId].sectionMap);
            parentObject[clockId].user = game.user;
        }
    };
    /**
     * converts clocks in categories to data to be fed to the template
     * @param allClocks - an object with objects representing the various
     * clock categories you want to display as children
     */
    var convertData = function (allData) {
        //copy keys to new object to store converted data
        let data = {};
        for (let category in allData.clocksToDisplay) {
            data[category] = {};
        }

        //for each type or category of clock we have, convert it
        for (let clockType in allData.clocksToDisplay) {
            convertTemplateData(allData.clocksToDisplay[clockType], data[clockType]);
        }

        return {
            data: data,
            categoriesShown: allData.categoriesShown,
            tooltipText: allData.tooltipText,
            addClockTooltipText: allData.addClockTooltipText,
            emptyText: allData.emptyText,
        };
    };

    return {
        convertData: convertData,
        handleButtonClick: handleButtonClick,
        openClock: openClock,
        _activateListeners: _activateListeners,
        applyGradient: applyGradient,
        refillSections: refillSections,
        handleBreaksAndWaypoints: handleBreaksAndWaypoints,
    };
};
