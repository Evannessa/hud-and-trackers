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

export class FullProfile extends Application {
    constructor(data = {}) {
        super();
        this.data = data;
    }

    async getData() {
        return {
            ...this.data,
        };
    }

    async saveTags(tagInput) {
        this.data.tags = [...this.data.tags, tagInput.value]; //set our data to include the new tags

        await updateCharacter(this.data.id, this.data);
        this.render(true);
    }

    async _handleButtonClick(event) {
        let el = $(event.currentTarget);
        let action = el.data().action;
        switch (action) {
            case "save-tags":
                //input text field should be previous element
                let tagInput = el.prev()[0].querySelector("#tag-input");
                //get the id of our character

                this.data.tags = [...this.data.tags, tagInput.value]; //set our data to include the new tags

                await updateCharacter(this.data.id, this.data);
                this.render(true);
        }
    }

    activateListeners(html) {
        //remove app from "ui.windows" to not let it close with the escape key
        delete ui.windows[this.appId];
        super.activateListeners(html);
        html.on("click", "[data-action]", this._handleButtonClick.bind(this));

        $("#tag-input").keypress(async (e) => {
            if (e.keyCode == 13) {
                this.saveTags.bind(this);
                await this.saveTags(e.currentTarget);
            }
        });
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

    async _updateObject(event, formData) {}
}
export class CharacterProfileConfig extends FormApplication {
    constructor(data = {}, edit = false) {
        console.log("Our profile data is", data);
        super(data);
        this.data = { ...data };
        if (Object.keys(data).length === 0) {
            //if it's empty data we're starting with
            //call characterFactory with no parameters, which will return
            //default data
            this.data = characterFactory();
        }
        this.edit = edit;
    }
    getData() {
        //if character data was passed in, copy its data. Else, use default data
        // let defaultData = { ...this.data };
        return { ...this.data };
    }

    async _updateObject(event, formData) {
        const characterData = {
            ...formData,
            tags: this.data.tags,
            id: this.data.id,
        };
        console.log(characterData);

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
        this.data.currentFilterTags = [];
        this.data.currentSearch = "";
        this.data.visible = false;
    }

    async showActorList() {
        new Dialog({
            title: "Actors",
            content: ``,
        }).render(true);
    }

    /**
     *
     * @param {String} filterData - the string we want to filter by
     * @param {string} selectorString - the selector we want to query of objects we want to be filtered
     */
    async filter(filterData, selectorString) {
        //!NOTE: ()=>{} is different than function(). ()=>{} binds the 'this'
        // https://stackoverflow.com/questions/45203479/jquery-with-arrow-function

        if (
            typeof filterData !== "string" &&
            Array.isArray(filterData) !== true
        ) {
            console.log("Error. Not array or string");
            return;
        }
        if (typeof filterData === "string") {
            filterData = filterData.split(" ");
        }
        let allElements = $(selectorString);
        let matchElements = [];
        let notMatched = [];

        //go through all the elements

        Array.from(allElements).forEach((element) => {
            let matchFound = false;

            //go through every filter item
            filterData.every((filterItem) => {
                if ($(element).text().toLowerCase().indexOf(filterItem) > -1) {
                    matchFound = true;
                }
                if (matchFound) {
                    //if we find an item, push it to the elements that match, then cancel out of this loop
                    matchElements.push(element);
                    return false; //cancel out of the "every" function loop
                } else {
                    return true; //keep going
                }
            });
            //if there wasn't a match after checking each filter item
            if (!matchFound) {
                notMatched.push(element);
            }
        });
        console.log("Our matches are", matchElements);

        $(matchElements).toggle(true);
        $(notMatched).toggle(false);
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
    filterBySearch() {
        $("#search").on("keyup", async function () {
            //save the current search data to our filters
            game.characterSceneDisplay.data.currentSearch = $(this)
                .val()
                .toLowerCase();
            await game.characterSceneDisplay.applyFilters();
        });
    }
    /**
     * if a tag is clicked, we want to filter all the objects by it
     */
    async filterByTag(tagValue) {
        //we're going to filter by the tag
        //// this.filter(tagValue, ".character-list > li");
        //update the current filter tags
        this.data.currentFilterTags = [
            ...this.data.currentFilterTags,
            tagValue,
        ];
        await this.applyFilters();
        this.render(true); //Re-render here to apply new elements rather than just hide already-rendered ones
    }
    async applyFilters() {
        if (this.data.currentSearch || this.data.currentFilterTags.length > 0) {
            //if we have a current search or current tags
            let searchStrings = this.data.currentSearch;
            let filterData = [
                ...searchStrings.split(" "),
                ...this.data.currentFilterTags,
            ];
            await this.filter(filterData, ".character-list > li");
        }
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
            ...this.data,
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
                if (id) {
                    let currentCharacter = this.data.characters[id];
                    game.characterProfileConfig = new CharacterProfileConfig(
                        currentCharacter
                    ).render(true);
                }
                break;
            case "filter-tag":
                // event.stopPropagation();
                this.filterByTag(el.text().toLowerCase().trim());
                break;
            case "remove-tag-filter":
                this.removeTagFilter(el.text().toLowerCase().trim());
                break;
        }
    }

    /**
     *
     * @param {String} filterTagValue - value of tag we want to remove
     */
    removeTagFilter(filterTagValue) {
        //remove this one from the currentFilterTags
        this.data.currentFilterTags = this.data.currentFilterTags.filter(
            (item) => item.toLowerCase().trim() !== filterTagValue
        );
        this.render(true);
    }

    activateListeners(html) {
        //remove app from "ui.windows" to not let it close with the escape key
        delete ui.windows[this.appId];
        super.activateListeners(html);
        html.on("click", "[data-action]", this._handleButtonClick.bind(this));
        //if current search isn't an empty string

        //apply filters active from previous render
        this.applyFilters();

        //this will filter upon keypresses in the search bar
        this.filterBySearch();
    }

    debounce(func, timeout = 300) {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => {
                func.apply(this, args);
            }, timeout);
        };
    }

    processChange() {
        this.debounce(() => this.render(true));
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
    console.log(characterUpdateData);
    await game.settings.set("hud-and-trackers", "globalDisplayCharacters", {
        ...currentCharacters,
        [id]: { ...characterUpdateData, tags: [...characterUpdateData.tags] },
        // newCharacter,
    });
}
