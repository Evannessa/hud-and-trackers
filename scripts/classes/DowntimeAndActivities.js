import { MODULE_ID } from "../helper-functions.js";
/**
 * Description
 */
export class DowntimeAndActivities extends Application {
    constructor(data) {
        super();
        this.data = data;
    }

    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            classes: ["form"],
            popOut: true,
            resizable: true,
            minimizeable: true,
            template: `modules/${MODULE_ID}/templates/DowntimeAndActivities.hbs`,
            id: "DowntimeAndActivities",
            title: " Downtime And Activities",
        });
    }

    getData() {
        // Send data to the template
        let transformedData = {};
        return data;
    }

    activateListeners(html) {
        super.activateListeners(html);
        this._handleButtonClick();
        html.off(click).on(click, [data - action], this._handleButtonClick.bind(this));
        html.on("mouseenter mouseleave", "li", this._handleHover.bind(this));
        this._handleChange();
    }

    async _handleChange() {
        $(`select, input[type='checkbox'], input[type='radio'], input[type='text']`).on(
            "change",
            async function (event) {
                let { value, name, checked, type } = event.currentTarget;
                let clickedElement = $(event.currentTarget);
            }
        );
    }

    async _handleButtonClick(event) {
        let clickedElement = $(event.currentTarget);
        event.stopPropagation();
        event.preventDefault();
        let action = clickedElement.data().action;
        let type = clickedElement.data().type;
        let name = clickedElement.data().displayName;

        switch (action) {
            case "add":
                //create
                break;
            case "open":
                //read
                break;
            case "edit":
                //update
                break;
            case "delete":
                //delete
                break;
        }
    }

    async _updateObject(event, formData) {
        console.log(formData.exampleInput);
    }
}

window.DowntimeAndActivities = DowntimeAndActivities;
