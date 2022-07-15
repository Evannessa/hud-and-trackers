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
        this.data.isButtonList = false;

        this.edit = edit;
    }

    /**
     * Construct a description of what the generated button does out of the data in the selected fields
     * @param {Object} ourData - an object representing our data
     * @returns A sentence that describes what the button does
     */
    generateActionSentence(ourData) {
        let values = this.getFieldValuesArray(ourData, true);
        let type = values.typeSelect;
        let action = values.actionSelect;
        let folderName = game.folders.get(values.folderSelect)?.name; // will return id, so get name
        let documentName = game[`${type}s`]?.get(values.documentSelect)?.name; //will return id, so convert type to plural and get name
        let isList = values["isButtonList"];

        let sentenceString = isList ? `A list of buttons will be generated that will each ` : `This button will `;

        //if our type of document (macro, scene, actor, etc.) is selected, and we've selected an action for that document type
        if (type && action) {
            //make it singular or plural depending on if we're making single button or list
            //add action
            sentenceString +=
                documentName && !isList ? `${action} the ${type} <span>${documentName}</span>` : `${action} a ${type}`;
        } else {
            sentenceString += "...";
        }
        if (folderName) {
            sentenceString += ` from the <span>${folderName}</span> folder`;
        }

        return sentenceString;
    }

    /**
     * Take our data object's key-value pairs , and get the "value" property of the nested objects or the single value
     * @param {Object} ourData - the Object data we want to process
     * @param {boolean} isMap - whether or not we should return an Object including the key and values, or just an array with the values alone
     * @returns an object with the keys and values, or an array of our values alone
     */
    getFieldValuesArray(ourData, isMap = false) {
        let valuesToCheck = Object.keys(ourData).map((key) => {
            if (ourData[key].hasOwnProperty("value")) {
                //if it's an object, return its value property
                return isMap ? { [key]: ourData[key].value } : ourData[key].value;
            } else {
                //else if it's a string or a boolean, just return itself
                return isMap ? { [key]: ourData[key] } : ourData[key].toString();
            }
        });
        if (isMap) {
            valuesToCheck = valuesToCheck.reduce((obj, item) => {
                let key = Object.keys(item)[0];
                console.log(key);
                return Object.assign(obj, { [key]: item[key] });
            }, {});
        }
        return valuesToCheck;
    }
    isEveryFieldFilled(ourData) {
        return this.getFieldValuesArray(ourData).every((value) => value !== "");
    }
    getData() {
        let ourData = {
            name: this.data.name || "",
            actionSelect: {
                choices: {
                    ...(this.data.type === "macro" ? { execute: "Execute", edit: "Edit" } : {}), //if macro, we can execute or edit it
                    ...(this.data.type === "actor" ? { open: "Open" } : {}), //if actor, we can open sheet, maybe add to stage?
                    ...(this.data.type === "scene" ? { activate: "Activate", view: "View" } : {}),
                },
                value: this.data.action || "",
            },
            isButtonList: this.data.isButtonList,
            typeSelect: {
                choices: {
                    macro: "Macro",
                    scene: "Scene",
                    actor: "Actor",
                    showUrl: "Show URL",
                },
                value: this.data.type || "",
            },
            folderSelect: {
                choices: {},
                value: this.data.folderId || "",
            },
            documentSelect: {
                choices: {},
                value: this.data.documentId || "",
            },
        };

        let folders = [];
        let contents = [];
        switch (ourData.typeSelect.value) {
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
        if (folders.length > 0 && this.data.type) {
            ourData = populateSelectData(folders, ourData, "folderSelect");
        }
        if (folders.length > 0 && this.data.folderId) {
            contents = game.folders.get(ourData.folderSelect.value).contents;
            ourData = populateSelectData(contents, ourData, "documentSelect");
        }
        ourData.canSubmit = this.isEveryFieldFilled(ourData); // add a property which checks if all the appropriate fields are filled out, and lets us submit if so
        ourData.sentence = this.generateActionSentence(ourData);

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
        //if an input or select changes, update the data and re-render the config
        $("select, input[type='checkbox'], input[type='text']").on("change", async function (event) {
            // let selectedValue = event.currentTarget.value;
            let { value, name, checked, type } = event.currentTarget;
            game.hudButtonConfig.data[name] = type == "checkbox" ? checked : value;
            game.hudButtonConfig.render(true, { renderData: game.hudButtonConfig.data });
        });
    }

    resetData() {
        // this.data. =
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
        let docId = clickedElement.data().documentId;
        if (clickedElement.hasClass("custom-button") && !docId) {
            ui.notifications.warn("This button is broken. Perhaps its connected document was deleted. Try editing it.");
            return;
        }
        switch (action) {
            case "addNewButton":
                game.hudButtonConfig = new HudButtonConfig().render(true);
                break;
            case "showTownMap":
                game.scenes.getName("Town Map").view();
                break;
            case "open":
                game.actors.get(docId).sheet.render(true);
                break;
            case "view":
                game.scenes.get(docId).view();
                break;
            case "activate":
                if (game.user.isGM) {
                    game.scenes.get(docId).activate();
                }
            case "execute":
                game.macros.get(docId).execute();
                break;
            case "edit":
                game.macros.get(docId).sheet.render(true);
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
    let processedData = await processButtonData(newButtonData);
    console.log(processedData);
    await game.settings.set("hud-and-trackers", "hudButtons", [...currentButtons, { ...processedData }]);
}

async function processButtonData(data) {
    let processedData = {
        name: data.name,
        documentId: data.documentId,
        type: data.type,
        action: data.action,
        description: data.instructions,
    };
    let documentId = data.documentId;
    let type = data.type;

    //replace the image with the macro or scene image if one wasn't selected
    if (data.img == "icons/svg/dice-target.svg") {
        processedData.img = await getImage(documentId, type);
    }
    return processedData;
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
    console.log("ID is " + docId, "Type is " + type);
    console.log(game[`${type}s`].get(docId));
    return type == "scene" || type == "macro" ? game[`${type}s`].get(docId).thumbnail : game[`${type}s`].get(docId).img;
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

    if (!dataObject[key].value) {
        dataObject[key].value = "";
    }

    return dataObject;
}
