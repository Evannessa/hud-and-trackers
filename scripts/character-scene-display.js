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
function characterFactory(data = {}) {
    //if data is empty, fill it with default data
    if (Object.keys(data).length === 0) {
        data = {
            name: "Test Name",
            char_full_body: "icons/svg/mystery-man.svg",
            thumbnail_image: "icons/svg/mystery-man.svg",
            description: "This is a test character",
            tags: [],
            linkedDocuments: {},
        };
    }
    let {
        name,
        char_full_body,
        thumbnail_image,
        description,
        linkedDocuments,
        tags,
    } = data;

    let id = HelperFunctions.idGenerator();

    return {
        name,
        id,
        char_full_body,
        thumbnail_image,
        description,
        linkedDocuments,
        tags,
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
            tags: [],
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
        // let currentCharacters = //await game.settings.get(
        // "hud-and-trackers",
        // "globalDisplayCharacters"
        // );

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
        return {
            ...this.data,
        };
    }

    async _handleButtonClick(event) {
        let el = $(event.currentTarget);
        let action = el.data().action;
        switch (action) {
            case "save-tags":
                let tagInput = el.prev();
                console.log(tagInput, tagInput[0].value);
                //get the id of our character
                let id = el.closest(".full-profile").data().id;
                //use it to find the character
                // let prevTags = await game.settings.get(
                // "hud-and-trackers",
                // "globalDisplayCharacters"
                // )[id].tags;
                await game.settings.set(
                    "hud-and-trackers",
                    "globalDisplayCharacters",
                    {
                        [id]: {
                            ...newCharacter,
                            tags: [...prevTags, tagInput[0].value],
                        },
                        // newCharacter,
                    }
                );
        }
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

        //if this isn't an edit, meaning it's a new object, $e default data
        if (!this.edit) {
            //call characterFactory with no parameters, which will return
            //default data
            defaultData = characterFactory();
            // defaultData = {
            //     name: "Test Name",
            //     char_full_body: "icons/svg/mystery-man.svg",
            //     thumbnail_image: "icons/svg/mystery-man.svg",
            //     description: "This is a test character",
            //     tags: [],
            //     linkedDocuments: {},
            // };
        }
        return defaultData;
    }

    async _updateObject(event, formData) {
        const characterData = {
            ...formData,
            tags: this.data.tags,
            id: this.data.id,
        };

        //if we're creating a new character
        if (!this.edit) {
            let newCharacter;
            newCharacter = characterFactory(characterData);
            await addNewCharacter(newCharacter);
        } else {
            //else if  we're just editing the same character
            await updateCharacter(characterData.id, characterData);
        }
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
    filter() {
        $("#search").on("keyup", function () {
            var value = $(this).val().toLowerCase();
            $(".character-list > li").filter(function () {
                $(this).toggle(
                    $(this).text().toLowerCase().indexOf(value) > -1
                );
            });
        });
    }
    filterByScene(pcArray, activeOrViewed) {
        let sceneActors;
        if (activeOrViewed == "active") {
            sceneActors = game.scenes.active.tokens.map((token) => token.actor);
        } else if (activeOrViewed == "viewed") {
            sceneActors = game.scenes.viewed.tokens.map((token) => token.actor);
        } else {
            sceneActors = this.getPCs();
        }
        sceneActors = [...new Set(sceneActors)];
        return this.filterByFolder(sceneActors, "Main PCs");
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
        // html.on("click", "input", (event) => {
        //     event.stopPropagation();
        //     console.log("clicked on input");
        // });
        html.on("click", async (event) => {
            console.log("Actor image clicked", event.currentTarget);
        });
        this.filter();
        // html.on("mouseenter")
        // html.on("contextmenu", "img", async (event) => {});
    }

    filterByFolder(pcArray, folderName) {
        return pcArray.filter((actor) => {
            return game.folders.getName(folderName).content.includes(actor);
        });
    }

    async _updateObject(event, formData) {}
}

/**
 * C - Create in Crud
 * @param {Object} newCharacterData - the data of a character we're going to add
 */
async function addNewCharacter(newCharacterData) {
    //get current characters from
    let currentCharacters = await getAllCharacters();

    await game.settings.set("hud-and-trackers", "globalDisplayCharacters", {
        ...currentCharacters,
        [newCharacterData.id]: { ...newCharacterData },
    });
}

/**
 * R - Read - the R in Crud
 * @param {string} id  - the id of the character we're looking for
 * @returns object containing the character data
 */
async function getCharacter(id) {
    let allCharacters = await getAllCharacters();
    let ourCharacter = allCharacters[id];
    return ourCharacter;
}

async function getAllCharacters() {
    let allCharacters = await game.settings.get(
        "hud-and-trackers",
        "globalDisplayCharacters"
    );
    return allCharacters;
}

/**
 * U - Update - the U in CRUD
 * @param {String} id  - the id of the character to update
 * @param {Object} characterUpdateData - the data we're using to update the character
 */
async function updateCharacter(id, characterUpdateData) {
    let currentCharacters = await getAllCharacters();
    await game.settings.set("hud-and-trackers", "globalDisplayCharacters", {
        ...currentCharacters,
        [id]: { ...characterUpdateData },
        // newCharacter,
    });
}
