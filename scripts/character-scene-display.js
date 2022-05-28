import * as HelperFunctions from "./helper-functions.js";
Hooks.on("ready", () => {
    game.characterSceneDisplay = new CharacterSceneDisplay().render(true);
});
Hooks.once("init", () => {
    loadTemplates([
        `modules/hud-and-trackers/templates/character-scene-display/actor-list-template.hbs`,
    ]);
});

/**
 * Create an object representing the data of a character
 * @param {*} name
 * @param {*} imgPath
 * @param {*} description
 * @param {*} linkedDocuments
 * @returns
 */
function characterFactory(data) {
    let { name, imgPath, description, linkedDocuments } = data;

    return {
        name,
        imgPath,
        description,
        linkedDocuments,
    };
}

export class CharacterProfileConfig extends FormApplication {
    constructor(data = {}) {
        super(data);
        this.data = { ...data };
    }
    getData() {
        let defaultData = {
            name: "Test Name",
            imgPath: "testPath",
            description: "This is a test character",
            linkedDocuments: {},
        };
        return defaultData;
    }

    async handleSubmit() {
        let newCharacter = characterFactory(newCharacterData);

        //save data to global settings
        await game.settings.set("hud-and-trackers", "globalDisplayCharacters", {
            ...this.data.characters,
            newCharacter,
        });
        //re-render the display
        game.characterSceneDisplay.render(true);
    }
    async _updateObject(event, formData) {
        console.log(event);
        const newCharacterData = {
            ...formData,
        };

        //create the clock w/ the new data
        let newCharacter = characterFactory(newCharacterData);

        //save data to global settings
        await game.settings.set("hud-and-trackers", "globalDisplayCharacters", {
            ...this.data.characters,
            newCharacter,
        });
        //re-render the display
        game.characterSceneDisplay.render(true);
    }

    async _handleButtonClick(event) {
        // console.log(this.element);
        let clickedElement = $(event.target);
        let action = clickedElement.data().action;
        let img;
        switch (action) {
            case "submit":
                break;
            case "cancel":
                event.preventDefault();
                this.close();
                break;
            case "open-picker":
                event.preventDefault();
                event.stopPropagation();
                let inputField = clickedElement.prev()[0];
                let filepicker = new FilePicker({
                    type: "image",
                    current: img,
                    field: inputField,
                    callback: (path) => {
                        img = path;
                        console.log(img);
                    },
                }).render(true);
                break;
        }
    }
    activateListeners(html) {
        // html.off("click", ["data-action"]);
        html.on("click", ["data-action"], this._handleButtonClick.bind(this));

        super.activateListeners(html);
        let windowContent = html.closest(".window-content");
    }
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            // classes: ["form"],
            popOut: true,
            // submitOnChange: false,
            // closeOnSubmit: true,
            template:
                "modules/hud-and-trackers/templates/character-scene-display/config-partial.hbs",
            id: "character-profile-config",
            title: "Character Profile Config",
            // onSubmit: (e) => e.preventDefault(),
        });
    }
}

export class CharacterSceneDisplay extends Application {
    constructor(data = {}) {
        super();
        this.data = data;
        this.data.characters = {};
    }

    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            resizeable: true,
            popOut: true,
            template: `modules/hud-and-trackers/templates/character-scene-display/character-scene-display.hbs`,
            id: "character-scene-display",
            title: "Character Scene Display",
        });
    }

    async getData() {
        this.data.characters = await game.settings.get(
            "hud-and-trackers",
            "globalDisplayCharacters"
        );
        console.log(this.data.characters);
        return {
            user: game.user,
            characters: this.data.characters,
        };
    }

    async _handleButtonClick(event) {
        let el = $(event.currentTarget);
        let action = el.data().action;
        console.log("Something was clicked?", action);
        switch (action) {
            case "add-actor":
                let actors = game.actors.contents;

                const data = {
                    actors: actors,
                };
                //add an actor, show list of actors
                const myHtml = await renderTemplate(
                    `modules/hud-and-trackers/templates/character-scene-display/actor-list-template.hbs`,
                    { data: data }
                );
                game.characterSceneDisplay.element[0].insertAdjacentHTML(
                    "beforeend",
                    myHtml
                );
            case "add-unlinked":
                //add an unlinked character, for data without creating an actor
                game.characterProfileConfig =
                    new CharacterProfileConfig().render(true);
            // await game.settings.set(
            //     "hud-and-trackers",
            //     "globalDisplayCharacters",
            //     { ...this.data.characters, newActor }
            // );
            // this.render(true);
            //TODO: add tags as well
        }
    }

    activateListeners(html) {
        //remove app from "ui.windows" to not let it close with the escape key
        delete ui.windows[this.appId];
        super.activateListeners(html);
        html.on("click", "[data-action]", this._handleButtonClick.bind(this));
        html.on("click", async (event) => {
            console.log("Actor image clicked", event.currentTarget);
        });
        // html.on("contextmenu", "img", async (event) => {});
    }

    async _updateObject(event, formData) {}
}
