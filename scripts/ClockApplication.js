/**
 * Define your class that extends FormApplication
 */
class ClockApplication extends FormApplication {
    constructor(data = {}) {
        super();
        this.data = data;
    }

    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            classes: ["form", "hud-and-trackers"],
            popOut: true,
            template: `myFormApplication.html`,
            id: "my-form-application",
            title: "My FormApplication",
        });
    }

    getData() {
        // Send data to the template
        return {
            msg: this.exampleOption,
            color: "red",
        };
    }

    activateListeners(html) {
        super.activateListeners(html);
    }

    async _updateObject(event, formData) {
        console.log(formData.exampleInput);
    }
}
