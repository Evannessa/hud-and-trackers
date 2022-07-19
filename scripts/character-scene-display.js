import * as HelperFunctions from "./helper-functions.js";
let clanTags;
let categoryIndividualTags;
let basePath = "/Idyllwild/Art/Characters/";
fetch("/Idyllwild/Test JSON Data/tags.json")
    .then((response) => {
        return response.json();
    })
    .then((data) => {
        categoryIndividualTags = data.find((tags) => {
            return tags.tag.includes("category/individual");
        });
        clanTags = data.filter((tags) => {
            return tags.tag.includes("clans/");
        });
    });
Hooks.on("ready", () => {
    // console.log("Our tags", characterTags, processTagData());
    game.characterTags = processTagData();

    // game.characterSceneDisplay = new CharacterSceneDisplay().render(true);
    game.innerSceneDisplay = new InnerSceneDisplay().render(true);
});

function processTagData() {
    let individuals = categoryIndividualTags.relativePaths;
    return clanTags.map((tagObject) => {
        let characterPaths = tagObject.relativePaths.filter((charPath) => individuals.includes(charPath));
        return {
            tagName: tagObject.tag,
            characters: characterPaths.map((path, index) => {
                let clanName = tagObject.tag.split("/").pop();
                //get character name from file path
                let name = path.split("/").pop().replace(".md", "");
                let firstName = name.split(" ").shift();
                if (!name.toLowerCase().includes(clanName.toLowerCase())) {
                    firstName = name.split(" ").pop();
                }
                let pathName = name.split(" ").join("-").toLowerCase();

                return {
                    name: name,
                    pathName: pathName,
                    imagePath: `${basePath}/${clanName}/${firstName}.webp`,
                };
            }),
        };
    });
}

Hooks.on("canvasReady", async (canvas) => {
    // game.innerSceneDisplay.data.temporaryCharacters = await HelperFunctions.getAllActorsInScene();
    // game.innerSceneDisplay.currentScene = canvas.scene;
    if (game.innerSceneDisplay) {
        game.innerSceneDisplay.render(true);
    }
});

Hooks.once("init", () => {
    loadTemplates([`modules/hud-and-trackers/templates/character-scene-display/actor-list-template.hbs`]);
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
 * Will display scenes I don't want to make entire scenes for
 * Along with characters
 */
class InnerSceneDisplay extends Application {
    constructor(data) {
        super();
        this.getSceneDisplayData();
        this.data = { ...data };
    }

    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            popOut: true,
            template: `/modules/hud-and-trackers/templates/inner-scene-display/scene-map.hbs`,
            id: "inner-scene-display",
            title: "Inner Scene Display",
            resizable: true,
        });
    }

    async getSceneDisplayData() {
        let currentScene = game.scenes.viewed;
        let sceneDisplayData = await currentScene.getFlag("hud-and-trackers", "sceneDisplayData");
        if (!sceneDisplayData || !sceneDisplayData.characters || !sceneDisplayData.innerScenes) {
            let data = {
                characters: [],
                innerScenes: [],
            };
            sceneDisplayData = await currentScene.setFlag("hud-and-trackers", "sceneDisplayData", data);
        }
        return sceneDisplayData;
    }

    async setSceneDisplayData(data) {
        await currentScene.setFlag("hud-and-trackers", "sceneDisplayData", data);
    }
    async addInnerScene(scene) {
        let currentScene = game.scenes.viewed;
        let sceneDisplayData = await currentScene.getFlag("hud-and-trackers", "sceneDisplayData");
        let innerScenes = sceneDisplayData.innerScenes;
        innerScenes.push(scene);
        sceneDisplayData = { ...sceneDisplayData, innerScenes: [...innerScenes] };
        await currentScene.setFlag("hud-and-trackers", "sceneDisplayData", sceneDisplayData);
        this.render(true);
    }

    async updateInnerScene(scene) {}

    async addCharacter(character) {
        let currentScene = game.scenes.viewed;
        let sceneDisplayData = await currentScene.getFlag("hud-and-trackers", "sceneDisplayData");
        let characters = sceneDisplayData.characters;

        //make sure we don't already hve a character with this name before pushing
        if (!characters.some((cha) => cha.name === character.name)) {
            characters.push(character);
            sceneDisplayData = { ...sceneDisplayData, characters: [...characters] };
            await currentScene.setFlag("hud-and-trackers", "sceneDisplayData", sceneDisplayData);
            this.render(true);
        }
    }
    async removeCharacter(character) {
        let currentScene = game.scenes.viewed;
        let sceneDisplayData = await currentScene.getFlag("hud-and-trackers", "sceneDisplayData");
        let characters = sceneDisplayData.characters;
        characters = characters.filter((ch) => ch.name !== character.name);
        sceneDisplayData = { ...sceneDisplayData, characters: [...characters] };
        await currentScene.setFlag("hud-and-trackers", "sceneDisplayData", sceneDisplayData);
        this.render(true);
    }

    async updateSceneDisplayData(newData, type, isUpdate) {
        let currentScene = game.scenes.viewed;
        let sceneDisplayData = await currentScene.getFlag("hud-and-trackers", "sceneDisplayData");
        if (type === "character") {
            let characters = sceneDisplayData.characters;
            //make sure we don't already hve a character with this name before pushing
            if (!characters.some((cha) => cha.name === newData.name)) {
                characters.push(newData);
                sceneDisplayData = { ...sceneDisplayData, characters: [...characters] };
            }
        } else if (type === "innerScene") {
            let innerScenes = sceneDisplayData.innerScenes;
            if (!isUpdate) {
                innerScenes.push(newData);
            } else {
                innerScenes.map((scene) => {
                    return scene.id === newData.id ? newData : scene;
                });
            }
            sceneDisplayData = { ...sceneDisplayData, innerScenes: [...innerScenes] };
        }
        await currentScene.setFlag("hud-and-trackers", "sceneDisplayData", sceneDisplayData);
        this.render(true);
    }

    async getData() {
        // Send data to the template
        let currentScene = game.scenes.viewed;
        let sceneDisplayData = await currentScene.getFlag("hud-and-trackers", "sceneDisplayData");
        if (!sceneDisplayData) {
            this.getSceneDisplayData();
        }
        let clans = game.characterTags.map((obj) => {
            return {
                name: obj.tagName.split("/").pop(),
                value: obj.tagName,
            };
        });
        let options = [];
        if (this.data.clanSelect) {
            options = game.characterTags.find((el) => el.tagName === this.data.clanSelect).characters;
        }
        // filter out any that are included in the selected characters already
        options = options.filter((opt) => {
            return !sceneDisplayData.characters.map((char) => char.name).includes(opt.name);
        });
        options.sort((a, b) => (a.name > b.name ? 1 : b.name > a.name ? -1 : 0));
        clans.sort((a, b) => (a.name > b.name ? 1 : b.name > a.name ? -1 : 0));

        sceneDisplayData = {
            ...sceneDisplayData,
            clans: clans,
            clanSelect: this.data.clanSelect || "",
            options: options,
        };

        return sceneDisplayData;
    }

    _handleButtonClick(event) {
        event.stopPropagation();
        event.preventDefault();
        let clickedElement = $(event.currentTarget); //$(event.target.closest("li"));

        let action = clickedElement.data().action;
        let name = clickedElement.data().name;
        let imagePath = clickedElement.data().imagePath;
        let data = { name: name, imagePath: imagePath };
        switch (action) {
            case "select":
                this.updateSceneDisplayData(data, "character", false);
                break;
            case "remove":
                this.removeCharacter(data);
                break;
            case "browse":
                // let img = clickedElement[0].src;
                let name = clickedElement[0].closest("li").querySelector("input[type='text']").value || "New Scene";
                let filepicker = new FilePicker({
                    type: "image",
                    callback: (path) => {
                        data.imagePath = path;
                        data.name = name;
                        this.updateSceneDisplayData(data, "innerScene", false);
                        // this.addInnerScene({ name: name, imagePath: path });
                    },
                }).render(true);
                break;
        }
    }

    activateListeners(html) {
        delete ui.windows[this.appId];
        // super.activateListeners(html);
        let windowContent = html.closest(".window-content");
        windowContent.off("click").on("click", "[data-action]", this._handleButtonClick.bind(this));
        this.handleChange();
    }

    handleChange() {
        $("select, input[type='checkbox'], input[type='text']").on("change", async function (event) {
            let { value, name, checked, type } = event.currentTarget;
            game.innerSceneDisplay.data[name] = type == "checkbox" ? checked : value;
            game.innerSceneDisplay.render(true, { renderData: game.innerSceneDisplay.data });
        });
    }

    async _updateObject(event, formData) {}
}

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
            relationships: [],
            linkedDocuments: [],
        };
    }
    let { name, char_full_body, thumbnail_image, description, linkedDocuments, relationships, tags } = data;

    let id;
    if (!data.id) {
        id = HelperFunctions.idGenerator();
    } else {
        id = data.id;
    }

    return {
        name,
        id,
        char_full_body,
        thumbnail_image,
        description,
        linkedDocuments,
        relationships,
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
    async showCharacterList() {
        let content = `<form>
  <label for="output-actorKey" style="vertical-align: top; margin-right: 10px;">Table Name:</label>
<br /><select name="output-actorKey" id="output-actorKey">
		</form>`;

        let characters = await game.settings.get("hud-and-trackers", "globalDisplayCharacters");
        characters = Object.values(characters); //Array.from(characters);
        console.log(characters);

        characters.forEach((character) => {
            content += `<option value='${character.id}' data-name='${character.name}'>${character.name}</option>`;
        });
        content += `</select>`;

        content += `<input list="relationship_types" name="relationship_type" id="relationship_type">
		<datalist id="relationship_types">
		<option value="Grandparent">
		<option value="Grandmother">
		<option value="Grandfather">
		<option value="Mother">
		<option value="Father">
		<option value="Parent">
		<option value="Child">
		<option value="Son">
		<option value="Daughter">
		<option value="Child">
		<option value="Sibling">
		<option value="Brother">
		<option value="Sister">
		<option value="Cousin">
		<option value="Pibling (NB Aunt/Uncle)">
		<option value="Uncle">
		<option value="Aunt">
		<option value="Nibling">
		<option value="Niece">
		<option value="Nephew">
		<option value="Family Member">
		<option value="Friend">
		<option value="Partner">
		<option value="Lover">
		<option value="Spouse">
		<option value="Mentor">
		<option value="Rival">
		</datalist>
		`;

        content += `</div><br/></form>`;

        new Dialog({
            title: `Select Character to add`,
            content: content,
            buttons: {
                yes: {
                    icon: "<i class='fas fa-check'></i>",
                    label: "Add Relationship",
                    callback: async (html) => {
                        let actorKey = html.find("select[name='output-actorKey']").val();
                        let type = html.find("input[name='relationship_type']").val();
                        //grab the character, so we can store their thumbnail & stuff
                        let newRelationshipData = {
                            id: actorKey,
                            type: type,
                        };
                        this.data.relationships = [...this.data.relationships, { id: actorKey, type: type }];

                        await updateCharacter(this.data.id, this.data);

                        //re-render the display
                        game.characterSceneDisplay.render(true);
                    },
                },
                no: {
                    icon: "<i class='fas fa-times'></i>",
                    label: "Cancel",
                },
            },
            default: "yes",
        }).render(true);
    }

    /**
     *
     * @param {String} id - the id of the character
     * @param {String} type - the type of relationship
     * @returns  - an object including the character's name and thumbnail image
     */
    async convertRelationshipData(id, type) {
        let character = await getCharacter(id);
        let returnData;
        if (character) {
            returnData = {
                name: character.name,
                type: type,
                img: character.thumbnail_image,
                id: id,
            };
        } else {
            returnData = {};
        }
        return returnData;
    }
    async getData() {
        let convertedRelationships = [];
        for (let rel of this.data.relationships) {
            convertedRelationships.push(await this.convertRelationshipData(rel.id, rel.type));
        }

        let convertedData = {
            ...this.data,
            relationships: convertedRelationships,
            pathName: "andynia-alimoux",
            imagePath: "/Idyllwild/Art/Characters/Alimoux/andynia.webp",
        };
        return convertedData;
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
            case "render-sheet":
                let collectionName = el.data().collection;
                let docId = el.data().id;
                let doc = game[collectionName].get(docId);
                if (doc.sheet && !doc.sheet.rendered) {
                    doc.sheet.render(true);
                }

                break;
            case "add-relationship":
                //render a relationship, or open as side-tab
                this.showCharacterList();
                break;
            case "show-relationship":
                let id = el.data().id;
                let character = await getCharacter(id);
                await openCharacterProfile(character);
                break;
            case "save-tags":
                //input text field should be previous element
                let tagInput = el.prev()[0].querySelector("#tag-input");
                //get the id of our character

                this.data.tags = Array.from(new Set([...this.data.tags, tagInput.value])); //set our data to include the new tags

                await addNewTag(tagInput.value);

                await updateCharacter(this.data.id, this.data);
                this.render(true);
                break;
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
            template: `modules/hud-and-trackers/templates/character-scene-display/iframe-display.hbs`,
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
            relationships: this.data.relationships,
            linkedDocuments: this.data.linkedDocuments,
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
            template: "modules/hud-and-trackers/templates/character-scene-display/config-partial.hbs",
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
        let content = `<form>
  <label for="output-actorKey" style="vertical-align: top; margin-right: 10px;">Table Name:</label>
<br /><select name="output-actorKey" id="output-actorKey">
		</form>`;

        const actors = Array.from(game.actors);

        actors.forEach((actor) => {
            content += `<option value='${actor.id}'>${actor.name}</option>`;
        });
        content += `</select>`;

        content += `</div><br/></form>`;

        new Dialog({
            title: `Select Actor to add`,
            content: content,
            buttons: {
                yes: {
                    icon: "<i class='fas fa-check'></i>",
                    label: "Add Actor",
                    callback: async (html) => {
                        let actorKey = html.find("select[name='output-actorKey']").val();
                        let actor = game.actors.get(actorKey);
                        let data = {
                            name: actor.name,
                            id: actor.id,
                            char_full_body: actor.img,
                            thumbnail_image: actor.thumbnail,
                            description: "",
                            relationships: [],
                            linkedDocuments: [
                                {
                                    name: actor.name,
                                    collectionName: actor.collectionName,
                                    documentId: actor.id,
                                },
                            ],
                            tags: {},
                        };
                        let newData = characterFactory(data);

                        //add new character
                        await addNewCharacter(newData);
                        //re-render the display
                        game.characterSceneDisplay.render(true);
                    },
                },
                no: {
                    icon: "<i class='fas fa-times'></i>",
                    label: "Cancel",
                },
            },
            default: "yes",
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

        if (typeof filterData !== "string" && Array.isArray(filterData) !== true) {
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
            game.characterSceneDisplay.data.currentSearch = $(this).val().toLowerCase();
            await game.characterSceneDisplay.applyFilters();
        });
    }
    /**
     * if a tag is clicked, we want to filter all the objects by it
     */
    async filterByTag(tagValue) {
        //we're going to filter by the tag
        //update the current filter tags
        this.data.currentFilterTags = Array.from(new Set([...this.data.currentFilterTags, tagValue]));
        await this.applyFilters();
        this.render(true); //Re-render here to apply new elements rather than just hide already-rendered ones
    }
    async applyFilters() {
        if (this.data.currentSearch || this.data.currentFilterTags.length > 0) {
            //if we have a current search or current tags
            let searchStrings = this.data.currentSearch;
            let filterData = [...searchStrings.split(" "), ...this.data.currentFilterTags];
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
        this.data.characters = await game.settings.get("hud-and-trackers", "globalDisplayCharacters");
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
                this.showActorList();
                break;
            case "add-unlinked":
                //add an unlinked character, for data without creating an actor
                game.characterProfileConfig = new CharacterProfileConfig().render(true);
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
                game.fullCharacterProfile = new FullProfile(currentCharacter).render(true);
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
                    game.characterProfileConfig = new CharacterProfileConfig(currentCharacter, true).render(true);
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
                    game.characterProfileConfig = new CharacterProfileConfig(currentCharacter).render(true);
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
    let allCharacters = await game.settings.get("hud-and-trackers", "globalDisplayCharacters");
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
        [id]: { ...characterUpdateData, tags: [...characterUpdateData.tags] },
        // newCharacter,
    });
}

/**
 *
 * @returns all tags saved in the game settings
 */
async function getAllTags() {
    let tags = await game.settings.get("hud-and-trackers", "displayTags");
    return tags;
}

/**
 *
 * @param {string} tagName - the tag string value to be added
 */
async function addNewTag(tagName) {
    let tags = getAllTags();
    let savedTags = new Set();
    savedTags.add(tags);
    savedTags.add(tagName);
    await game.settings.set("hud-and-trackers", "displayTags", [...savedTags]);
}
async function deleteTags() {}

async function openCharacterProfile(currentCharacter) {
    //  let currentCharacter = this.data.characters[id];
    game.fullCharacterProfile = new FullProfile(currentCharacter).render(true);
}
async function openCharacterSideTab() {}

async function renderDisplayToggleButton() {}
