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

    function openClock(event) {
        // event.preventDefault();
        let el = $(event.currentTarget);
        let id = el.attr("id");
        if (!isClockRendered()) {
            renderNewClockFromData(getAllClocks()[id]);
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

    function _activateListeners(html, clocks, caller) {
        //! The "html" will be different depending on if you're using application or form-application
        $(html).off("click", "[data-action]");
        $(html).off("click", ".clockApp");
        // $(html).on("click", "[data-action]", handleButtonClick.bind(html));
        $(html).on("click", "[data-action]", (event) => {
            handleButtonClick.call(html, event, caller);
        });
        $(html).on("click", ".clockApp", openClock.bind(html));
        let i = 0;
        for (var clockId in clocks) {
            handleBreaksAndWaypoints.call(html, clocks[clockId]);
            refillSections.call(html, clocks[clockId]);
            applyGradient.call(html, clocks[clockId]);
            i++;
        }
    }
    async function applyGradient(clockData) {
        let clockWrapper = $(`.app-child form#${clockData.ourId} .clockWrapper`);
        //make the background wrapper's gradient look like the chosen one
        clockWrapper.css("backgroundImage", clockData.gradient);
    }

    async function refillSections(clockData) {
        let filled = 0;
        let sectionsArray = $(
            `.app-child form#${clockData.ourId} .clockSection`
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
    async function handleBreaksAndWaypoints(clockData) {
        //adding breaks if we have any
        let sectionsArray = $(
            `.app-child form#${clockData.ourId} .clockSection`
        ).toArray();
        let framesArray = $(`.app-child form#${clockData.ourId} .frameSection`).toArray();
        let breakLabels = $(`.app-child form#${clockData.ourId} .breakLabel`).toArray();
        let waypoints = $(`.app-child form#${clockData.ourId} .waypoint`).toArray();
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

    return {
        handleButtonClick: handleButtonClick,
        openClock: openClock,
        _activateListeners: _activateListeners,
        applyGradient: applyGradient,
        refillSections: refillSections,
        handleBreaksAndWaypoints: handleBreaksAndWaypoints,
    };
};
