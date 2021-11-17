export const ClockHelpers = async function () {
    function handleButtonClick(event) {
        event.preventDefault();
        let el = $(event.currentTarget);
        let action = el.data().action;
        switch (action) {
            case "showClocks":
                el.closest(".app-child").toggleClass("expanded");
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

    function _activateListeners(html, clocks) {
        console.log(document);
        //! The "html" will be different depending on if you're using application or form-application
        console.log(html, "Clock listener html");
        $(html).off("click", "[data-action]");
        $(html).off("click", ".clockApp");
        $(html).on("click", "[data-action]", handleButtonClick);
        $(html).on("click", ".clockApp", openClock);
        let i = 0;
        for (var clockId in clocks) {
            handleBreaksAndWaypoints.call(html, clocks[clockId]);
            refillSections.call(html, clocks[clockId]);
            applyGradient.call(html, clocks[clockId]);
            i++;
        }
    }
    async function applyGradient(clockData) {
        console.log(this);
        console.log("Applying gradient", clockData);
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

    return {
        handleButtonClick: handleButtonClick,
        openClock: openClock,
        _activateListeners: _activateListeners,
        applyGradient: applyGradient,
        refillSections: refillSections,
        handleBreaksAndWaypoints: handleBreaksAndWaypoints,
    };
};
