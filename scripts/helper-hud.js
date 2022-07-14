import * as HelperFunctions from "./helper-functions.js";

Hooks.on("canvasReady", () => {
    if (!game.helperHud) {
        game.helperHud = new HelperHud().render(true);
    }
});

Hooks.once("renderHelperHud", (app, html) => {
    let position = game.settings.get("hud-and-trackers", "helperHudPosition");
    if (Object.keys(position).length > 0) {
        app.setPosition({ top: position.top, left: position.left });
    }
});
Hooks.on("renderHelperHud", (app, html) => {
    HelperFunctions.setInvisibleHeader(html, true);
});
export class HudButtonConfig extends FormApplication {
    constructor(data = {}, edit = false) {
        super(data);
        this.data = { ...data };

        this.edit = edit;
    }
    getData() {
        let ourData = {
            actionSelect: {
                view: "View",
                activate: "Activate",
                execute: "Execute",
                open: "Open",
            },
            buttonTypeSelect: {
                choices: {
                    macro: "Macro",
                    scene: "Scene",
                    actor: "Actor",
                    showUrl: "Show URL",
                },
                value: this.data["button-type"] || "",
            },
            folderSelect: {
                choices: {},
                value: this.data["folder-list"] || "",
            },
            documentSelect: {
                choices: {},
                value: this.data["document-list"] || "",
            },
        };

        console.log(ourData);
        let folders = [];
        let contents = [];
        switch (ourData.buttonTypeSelect.value) {
            case "macro":
                folders = getFoldersByType("Macro");
                break;
            case "scene":
                folders = getFoldersByType("Scene");
                break;
            case "actor":
                folders = getFoldersByType("Actor");
                break;
            default:
                break;
        }
        // if(ourData.folderSelect.value){
        // 	contents = getDocumentsFromFolder(ourData.folderSelect.value);
        // }

        if (folders.length > 0) {
            console.log(populateSelectData(folders, ourData, "folderSelect"));
            ourData = populateSelectData(folders, ourData, "folderSelect");
            contents = game.folders.get(ourData.folderSelect.value).contents;
            // ourData.folderSelect.value = Object.keys(ourData.folderSelect.choices)[0]
        }
        if (folders.length > 0 && ourData.folderSelect.value) {
            ourData = populateSelectData(contents, ourData, "documentSelect");
        }

        return { ...ourData };
    }

    async _updateObject(event, formData) {
        const buttonData = {
            ...formData,
        };

        //if we're creating a new button
        if (!this.edit) {
            let newButton = buttonData;
            await addNewButton(newButton);
        } else {
            //else if  we're just editing the same button
            await updateButton(buttonData.id, buttonData);
        }
        //re-render the display
        game.helperHud.render(true);
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

    handleChange(event) {
        $("select").on("change", async function (event) {
            // let selectedValue = event.currentTarget.value;
            let { value, name } = event.currentTarget;
            game.hudButtonConfig.data[name] = value;
            game.hudButtonConfig.render(true, { renderData: game.hudButtonConfig.data });
        });
    }
    activateListeners(html) {
        // html.off("click", ["data-action"]);
        html.on("click", ["data-action"], this._handleButtonClick.bind(this));
        this.handleChange();
        super.activateListeners(html);
        let windowContent = html.closest(".window-content");
    }
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            popOut: true,
            template: "modules/hud-and-trackers/templates/hud-config.hbs",
            id: "hud-button-config",
            title: "Hud Button Config",
            // onSubmit: (e) => e.preventDefault(),
        });
    }
}
export class HelperHud extends Application {
    constructor() {
        super();
        this.isGM = game.user.isGM;
        this.customButtons = game.settings.get("hud-and-trackers", "hudButtons");
        this.townLocations = game.folders.getName("Town").content.map((location) => {
            return { id: location.data._id, name: location.data.name, img: location.thumbnail };
        });
        this.currentScene = game.scenes.viewed;
    }
    /** @override */
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            popOut: true,
            submitOnChange: false,
            closeOnSubmit: false,
            minimizable: false,
            resizable: false,
            top: 500,
            left: 10,
            background: "none",
            template: "modules/hud-and-trackers/templates/helper-hud.html",
            id: "helperHud",
            title: "helperHud",
            onSubmit: (e) => e.preventDefault(),
        });
    }

    async getData() {
        if (!this.townLocations) {
            this.townLocations = game.folders.getName("Town").content.map((location) => {
                return { id: location.data._id, name: location.data.name, img: location.thumbnail };
            });
        }
        if (!this.customButtons) {
            this.customButtons = await getAllButtons();
            setAllButtonImages(this.customButtons);
        }

        if (!this.sceneContextButtons) {
            this.sceneContextButtons = {
                tavern: {},
                blacksmith: {},
                observatory: {},
            };
        }

        return {
            isGM: this.isGM,
            townLocations: this.townLocations,
            currentScene: this.currentScene,
            customButtons: this.customButtons,
        };
    }

    async handleButtonClick(event) {
        let clickedElement = $(event.currentTarget);
        let action = clickedElement.data().action;
        let actor;
        switch (action) {
            case "addNewButton":
                game.hudButtonConfig = new HudButtonConfig().render(true);
                break;
            case "showTownMap":
                game.scenes.getName("Town Map").view();
                break;
            case "navigate":
                let sceneId = clickedElement.data().sceneId;
                game.scenes.get(sceneId).view();
                break;
            case "link":
                //show link of url to players

                break;
            case "toggle":
                clickedElement.toggleClass("holdOpen");
                break;
            case "openPartyOverview":
                let data = await game.user.getFlag("hud-and-trackers", "partyOverviewData");
                game.partyOverview = new PartyOverview.PartyOverview(data).render(true);
                break;
            case "addPCs":
                HelperFunctions.addActorsToScene("allPCs");
                break;
            case "changeDisposition":
                HelperFunctions.callMacro("Change Disposition");
                break;
            case "addAttacks":
                HelperFunctions.callMacro("[Token] Toggle Attacks in Inventory of non-PC Actors");
                break;
            case "swapCharacter":
                await HelperFunctions.callMacro("Swap-Characters");
                break;
            case "selectCharacter":
                HelperHud.selectMyCharacter();
                break;
            case "openCheatSheet":
                HelperFunctions.callMacro("Open Cheat Sheet PDF");
                break;
            case "openCharacterSheet":
                actor = HelperFunctions.getActorFromUser(game.user);
                actor.sheet.render(true);
                break;
            case "openLootSheet":
                actor = HelperFunctions.getGameActorByName("Party Loot Box");
                actor.sheet.render(true);
                break;
            case "addClock":
                new ClockConfig().render(true);
                break;
            case "showClocks":
                new ClockViewer().render(true);
                break;
            case "savePos":
                let combatHudPosition = game.combatHud.app.position;
                let helperHudPosition = game.helperHud.position;
                let tokenHudPosition = game.abilityHud.position;
                game.settings.set("hud-and-trackers", "combatHudPosition", combatHudPosition);
                game.settings.set("hud-and-trackers", "tokenHudPosition", tokenHudPosition);
                game.settings.set("hud-and-trackers", "helperHudPosition", helperHudPosition);
                ui.notifications.notify("App positions saved");
                break;
            default:
                break;
        }
    }

    activateListeners(html) {
        let windowContent = html.closest(".window-content");
        windowContent.on("click", "[data-action]", this.handleButtonClick.bind(this));
    }

    static selectMyCharacter() {
        let actor = HelperFunctions.getActorFromUser(game.user);
        let tokenDoc = HelperFunctions.getSceneTokenFromActor(actor);
        if (tokenDoc) {
            tokenDoc.object.control({ releaseOthers: true });
        } else {
            ui.notifications.warn(`${actor.name} does not have a token on this scene`);
        }
    }
}
async function updateButton(id, buttonUpdateData) {
    let currentButtons = await getAllButtons();
    await game.settings.set("hud-and-trackers", "hudButtons", [
        ...currentButtons,
        { ...buttonUpdateData },
        // newButton,
    ]);
}

/**
 * C - Create in Crud
 * @param {Object} newButtonData - the data of a button we're going to add
 */
async function addNewButton(newButtonData) {
    //get current buttons from
    let currentButtons = await getAllButtons();

    await game.settings.set("hud-and-trackers", "hudButtons", [...currentButtons, { ...newButtonData }]);
}
/**
 * R - Read - the R in Crud
 * @param {string} id  - the id of the button we're looking for
 * @returns object containing the button data
 */
async function getButton(id) {
    let allButtons = await getAllButtons();
    let ourButton = allButtons[id];
    return ourButton;
}

async function getAllButtons() {
    let allButtons = await game.settings.get("hud-and-trackers", "hudButtons");
    return allButtons;
}

function getFoldersByType(type) {
    return game.folders.contents.filter((folder) => folder.type === type);
}
export async function getDocumentsFromFolder(folderName, type) {
    return game.folders.getName(folderName).content.map((doc) => {
        return {
            id: doc.data._id,
            name: doc.data.name,
            img: type == "scene" || type == "macro" ? doc.thumbnail : doc.img,
        };
    });
}

/**
 *
 * @param {String} docId -- the id of the document
 * @param {String} type -- the type of the document
 * @returns the string path of the image
 */
export async function getImage(docId, type) {
    return type == "scene" || type == "macro" ? game.scenes.get(docId).thumbnail : game.scenes.get(docId).img;
}

function setAllButtonImages(buttons) {
    buttons.forEach((button) => {
        if (!button.img) {
            button.img = getImage(button.docId, button.type);
        }
    });
}

/**
 *  Map objects containing name and id for each selected folder or document
 * @param {Array} array - the array we're populating from
 * @param {Object} dataObject - the data object being added to
 */
function populateSelectData(array, dataObject, key) {
    array.forEach((item) => {
        dataObject[key].choices[item.id] = item.name;
    });
    console.log(key + " Populated with", Object.keys(dataObject[key].choices));
    dataObject[key].value = Object.keys(dataObject[key].choices)[0];
    return dataObject;
}
