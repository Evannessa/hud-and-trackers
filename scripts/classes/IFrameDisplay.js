/**
 * Description
 */
export class IFrameDisplay extends Application {
    constructor(data) {
        super();
        this.data = data;
    }

    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            classes: ["form", "iframe-display"],
            popOut: true,
            resizable: true,
            minimizeable: true,
            template: `modules/hud-and-trackers/templates/iframe-display.hbs`,
            id: "IFrameDisplay",
            title: " IFrame Display",
        });
    }

    getData() {
        // Send data to the template
        return this.data;
    }

    activateListeners(html) {
        super.activateListeners(html);
        // this._handleButtonClick();
        html.off("click").on("click", ["data-action"], (event) => this._handleButtonClick(event));
    }
    async _handleButtonClick(event) {
        event.preventDefault();
        let clickedElement = event.target;
        let action = clickedElement.dataset.clickAction;

        switch (action) {
            case "sendToTile":
                const text = await navigator.clipboard.readText();
                // game.JTCS.imageUtils.manager.determineDisplayMethod({ url: text, method: "artScene" });
                game.JTCS.imageUtils.manager.determineDisplayMethod({ url: text, method: "anyScene" });
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
}

window.IFrameDisplay = IFrameDisplay;
