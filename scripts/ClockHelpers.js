export const ClockHelpers = async function () {
    function handleButtonClick(event) {
        event.preventDefault();
        let el = $(event.currentTarget);
        let action = el.data().action;
        switch (action) {
            case "showClocks":
                el.closest("#clock-display").toggleClass("expanded");
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

    function activateListeners(html, clocks) {
        //! The "html" will be different depending on if you're using application or form-application
        $(html).off("click", "[data-action]");
        $(html).off("click", ".clockApp");
        $(html).on("click", "[data-action]", handleButtonClick);
        $(html).on("click", ".clockApp", openClock);
        let i = 0;
        for (var clockId in clocks) {
            handleBreaksAndWaypoints(clocks[clockId]);
            refillSections(clocks[clockId]);
            applyGradient(clocks[clockId]);
            i++;
        }
    }
    async function applyGradient(clockData) {
        let clockWrapper = $(`#clock-display form#${clockData.ourId} .clockWrapper`);
        //make the background wrapper's gradient look like the chosen one
        clockWrapper.css("backgroundImage", clockData.gradient);
    }

    async function refillSections(clockData) {
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
    async function handleBreaksAndWaypoints(clockData) {
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
};
