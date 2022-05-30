import * as HelperFunctions from "./helper-functions.js";
Hooks.on("ready", () => {
    game.characterSceneDisplay = new CharacterSceneDisplay().render(true);
});
Hooks.once("init", () => {
    loadTemplates([
        `modules/hud-and-trackers/templates/character-scene-display/actor-list-template.hbs`,
    ]);
});
Hooks.on("renderCharacterSceneDisplay", (app, html) => {
    let windowApp = html.closest(".window-app");
    $(windowApp).css({
        height: "-moz-max-content",
        height: "fit-content",
        // width: "-moz-max-content",
        // width: "fit-content",
        width: "45vw",
        // minWidth: "45vh",
    });
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
    let {
        name,
        char_full_body,
        thumbnail_image,
        description,
        linkedDocuments,
    } = data;

    let id = HelperFunctions.idGenerator();

    return {
        name,
        id,
        char_full_body,
        thumbnail_image,
        description,
        linkedDocuments,
    };
}

/**
 * actor list for actors that already exist in game
 */
export class ActorList extends FormApplication {
    constructor(data = {}) {
        super(data);
        this.data = { ...data };
    }
    getData() {
        let defaultData = {
            name: "Test Name",
            char_full_body: "icons/svg/mystery-man.svg",
            thumbnail_image: "icons/svg/mystery-man.svg",
            description: "This is a test character",
            linkedDocuments: {},
        };
        return defaultData;
    }
    async _updateObject(event, formData) {
        const newCharacterData = {
            ...formData,
        };

        //create the clock w/ the new data
        let newCharacter = characterFactory(newCharacterData);

        //save data to global settings
        let id = HelperFunctions.idGenerator();

        //get current stored characters
        let currentCharacters = await game.settings.get(
            "hud-and-trackers",
            "globalDisplayCharacters"
        );
        //add new character to current stored characters
        await game.settings.set("hud-and-trackers", "globalDisplayCharacters", {
            ...currentCharacters,
            [id]: { ...newCharacter },
            // newCharacter,
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

export class FullProfile extends Application {
    constructor(data = {}) {
        super();
        this.data = data;
    }

    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            resizeable: true,
            popOut: true,
            template: `modules/hud-and-trackers/templates/character-scene-display/character-profile-full.hbs`,
            id: "character-full-profile",
            title: "Character Profile",
        });
    }

    async getData() {
        // console.log("Full profile data is", this.data);
        return {
            ...this.data,
        };
    }

    async _handleButtonClick(event) {
        let el = $(event.currentTarget);
        let action = el.data().action;
        // switch (action) {

        // }
    }

    activateListeners(html) {
        //remove app from "ui.windows" to not let it close with the escape key
        delete ui.windows[this.appId];
        super.activateListeners(html);
        html.on("click", "[data-action]", this._handleButtonClick.bind(this));
    }

    async _updateObject(event, formData) {}
}
export class CharacterProfileConfig extends FormApplication {
    constructor(data = {}, edit = false) {
        super(data);
        console.log("Data is", data);
        this.data = { ...data };
        this.edit = edit;
    }
    getData() {
        //if character data was passed in, copy its data. Else, use default data
        let defaultData = { ...this.data };
        if (!this.edit) {
            defaultData = {
                name: "Test Name",
                char_full_body: "icons/svg/mystery-man.svg",
                thumbnail_image: "icons/svg/mystery-man.svg",
                description: "This is a test character",
                linkedDocuments: {},
            };
        }
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
        const newCharacterData = {
            ...formData,
            id: this.data.id,
        };

        //create the clock w/ the new data
        let newCharacter = newCharacterData;
        if (!this.edit) {
            newCharacter = characterFactory(newCharacterData);
        }

        //get current stored characters
        let currentCharacters = await game.settings.get(
            "hud-and-trackers",
            "globalDisplayCharacters"
        );
        //add new character to current stored characters
        //save data to global settings
        await game.settings.set("hud-and-trackers", "globalDisplayCharacters", {
            ...currentCharacters,
            [newCharacter.id]: { ...newCharacter },
            // newCharacter,
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
        this.data.visible = false;
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
        return {
            user: game.user,
            characters: this.data.characters,
        };
    }

    async _handleButtonClick(event) {
        let el = $(event.currentTarget);
        let action = el.data().action;
        let id = el.data().id;
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
            case "display-drawer":
                let drawer = el.closest(".side-drawer");
                if (!this.data.visible) {
                    drawer.addClass("visible");
                    this.data.visible = true;
                } else {
                    drawer.removeClass("visible");
                    this.data.visible = false;
                }
                break;
            case "show-profile":
                //show profile
                let currentCharacter = this.data.characters[id];
                console.log(currentCharacter, id);
                game.fullCharacterProfile = new FullProfile(
                    currentCharacter
                ).render(true);
                break;
            case "edit":
                //edit
                event.stopPropagation();
                //get id from parent element if we're clicking on a child
                if (!id) {
                    id = el.closest("li").data().id;
                }
                if (id) {
                    let currentCharacter = this.data.characters[id];
                    game.characterProfileConfig = new CharacterProfileConfig(
                        currentCharacter,
                        true
                    ).render(true);
                } else {
                    console.log("No id!", id);
                }
                break;
            case "delete":
                if (!id) {
                    id = el.closest("li").data().id;
                }
                event.stopPropagation();
                //TODO: DELETE STUFF
                if (id) {
                    let currentCharacter = this.data.characters[id];
                    game.characterProfileConfig = new CharacterProfileConfig(
                        currentCharacter
                    ).render(true);
                }
                break;
            //delete
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
        // html.on("mouseenter")
        // html.on("contextmenu", "img", async (event) => {});
    }

    async _updateObject(event, formData) {}
}
