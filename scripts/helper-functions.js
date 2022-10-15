import { socket } from "./classes/sockets.js";

export const moduleName = "hud-and-trackers";
export const MODULE_ID = "hud-and-trackers";

export class HelperFunctions {
    static MODULE_ID = "hud-and-trackers";
    static stringToElement(html) {
        var template = document.createElement("template");
        html = html.trim(); // Never return a text node of whitespace as the result
        template.innerHTML = html;
        return template.content.firstChild; //.querySelector("img.card-img").getAttribute("src");
    }
    static createImagePopout(src, title = "Featured Image") {
        const ip = new ImagePopout(src, {
            title: title,
        });

        // Display the image popout
        ip.render(true);
    }
    static image;
    /**
     * }
     * pass in a string and capitalize each word in the string
     * @param {String} string - the string whose words we want to capitalize
     * @param {String} delimiter - a delimiter separating each word
     * @returns A string with each word capitalized and the same delimiters
     */
    static capitalizeEachWord(string, delimiter = " ", replaceWith = "") {
        let sentenceArray;
        let capitalizedString;

        if (!delimiter) {
            // if the delimiter is an empty string, split it by capital letters, as if camelCase
            sentenceArray = string.split(/(?=[A-Z])/).map((s) => s.toLowerCase());
            capitalizedString = sentenceArray.map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(" ");
        } else {
            sentenceArray = string.split(delimiter);

            capitalizedString = sentenceArray
                .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                .join(replaceWith ? replaceWith : delimiter);
        }
        return capitalizedString;
    }
    static async getSettingValue(settingName, nestedKey = "") {
        let settingData = await game.settings.get(HelperFunctions.MODULE_ID, settingName);
        if (settingData !== undefined && settingData !== null) {
            if (nestedKey) {
                let nestedSettingData = getProperty(settingData, nestedKey);

                return nestedSettingData;
            }
            return settingData;
        } else {
            console.error("Cannot find setting with name " + settingName);
        }
    }
    static async setFlagValue(document, flagName, updateData, nestedKey = "") {
        if (game.user.isGM) {
            await document.setFlag(MODULE_ID, flagName, updateData);
        } else {
            socket.executeAsGM("setFlagValue", document, flagName, updateData);
        }
    }
    /**
     * Get the value of a document's flag
     * @param {Object} document - the document whose flags we want to set (Scene, Actor, Item, etc)
     * @param {String} flagName - the name of the flag
     * @param {String} nestedKey - a string of nested properties separated by dot notation that we want to set
     * @param {*} returnIfEmpty - a value to return if the flag is undefined
     * @returns
     */
    static async getFlagValue(document, flagName, nestedKey = "", returnIfEmpty = []) {
        let flagData = await document.getFlag(MODULE_ID, flagName);
        if (!flagData) {
            flagData = returnIfEmpty;
        }
        return flagData;
    }

    /**
     *  Sets a value, using the "flattenObject" and "expandObject" utilities to reach a nested property
     * @param {String} settingName - the name of the setting
     * @param {*} updateData - the value you want to set a property to
     * @param {String} nestedKey - a string of dot-separated values to refer to a nested property
     */
    static async setSettingValue(settingName, updateData, nestedKey = "", isFormData = false) {
        if (isFormData) {
            let currentSettingData = game.settings.get(HelperFunctions.MODULE_ID, settingName);
            updateData = expandObject(updateData); //get expanded object version of formdata keys, which were strings in dot notation previously
            updateData = mergeObject(currentSettingData, updateData);
            // let updated = await game.settings.set(HelperFunctions.MODULE_ID, settingName, currentSettingData);
            // console.warn(updated);
        }
        if (nestedKey) {
            let settingData = game.settings.get(HelperFunctions.MODULE_ID, settingName);
            setProperty(settingData, nestedKey, updateData);
            await game.settings.set(HelperFunctions.MODULE_ID, settingName, settingData);
        } else {
            await game.settings.set(HelperFunctions.MODULE_ID, settingName, updateData);
        }
    }

    static async createDialog(title, templatePath, data) {
        const options = {
            width: 600,
            // height: 250,
            id: "JTCS-custom-dialog",
        };
        let renderedHTML = await renderTemplate(templatePath, data);
        let d = new Dialog(
            {
                title: title,
                content: renderedHTML,
                buttons: data.buttons,
            },
            options
        ).render(true);
    }
}
export function calculateAspectRatioFit(srcWidth, srcHeight, maxWidth, maxHeight) {
    var ratio = Math.min(maxWidth / srcWidth, maxHeight / srcHeight);
    return {
        width: srcWidth * ratio,
        height: srcHeight * ratio,
    };
}

export function selectMyCharacter() {
    let actor = getActorFromUser(game.user);
    let tokenDoc = getSceneTokenFromActor(actor);
    if (tokenDoc) {
        tokenDoc.object.control({ releaseOthers: true });
    } else {
        ui.notifications.warn(`${actor.name} does not have a token on this scene`);
        askIfPlayerWantsToAddToken(actor);
    }
}

export function togglePlayerList() {
    game.defaultPlayerList.element.toggleClass("hide-off-screen");
}

//convert PC items to another type of item if it's in the wrong category
export function convertItems(pc, html) {
    let items = pc.data.items; //all items on the pc
    let convertFrom = html.find(".convertFrom")[0].val();
    let convertTo = html.find(".convertTo")[0].val();
    let qualifier = html.find("qualifier")[0].val();

    //get only the items that match the type and qualifier
    items = items
        .filter((item) => {
            return item.type == convertFrom;
        })
        .filter((item) => {
            item.name.includes(qualifier);
        });

    //go through every item, and create a new item on the actor, w/ everything the same BUT the type, which will be "convertTo"'s value
    items.forEach((item) => {
        createItemOnActor(pc, item.name, convertTo, item.data);
    });
}

export function createItemOnActor(actor, itemName, itemType, itemData) {
    Item.create({ type: itemType, data: itemData, name: itemName }, { parent: actor });
}

/**
 * this turns array of object literals into objects, w/ the objects id property as the key
 * @param {array} array - the array we want to convert into an object
 * @returns an object with id keys and obj literal values
 */
export function convertArrayIntoObjectById(array) {
    let obj = array.reduce((obj, item) => ((obj[item.ourId] = item), obj), {});
    return obj;
}

// export function getClocksLinkedToScene(scene) {
// 	let viewedScene = game.scenes.viewed;

// }
/**
 *
 * @param {Array} prependMessage - an array of arguments to be passed
 * @param {String} textColor - the color of the text in the log
 * @param {String} bgColor - the color of the background in the log
 */
export function colorfulLog(prependMessage, variables = [], textColor = "cyan", bgColor = "transparent") {
    console.log(`%c${prependMessage}`, `color: ${textColor}; background-color: ${bgColor};`, ...variables);
}

export function getPCItemsOfType(pc, type) {
    return pc.data.items.map((item) => {
        return item.type === type;
    });
}
export function setInvisibleHeader(html, showIcon) {
    let windowHeader = html[0].querySelector(".window-header");
    if (windowHeader) {
        Array.from(windowHeader.children).forEach((element) => {
            element.style = "display: none";
        });
        windowHeader.classList.add("minimal-window-header");
        if (showIcon) {
            windowHeader.classList.add("invisible");
            if (!html[0].querySelector("#drag-handle")) {
                addDragHandle(html);
            }
        }
    }
}

export async function addDragHandle(html, ancestorElement = null, childElementSelector = ".window-content") {
    ancestorElement = ancestorElement || html[0].closest(".window-app");
    let handleDiv = document.createElement("div");
    handleDiv.setAttribute("id", "drag-handle");
    handleDiv.classList.add("draggable", "drag-handle");

    ancestorElement.querySelector(childElementSelector).prepend(handleDiv);
}
export async function handleDrag(drag) {
    //referenced SmallTime to figure this out
    drag._onDragMouseMove = function _newOnDragMouseMove(event) {
        event.preventDefault();
        // Limit dragging to 60 updates per second.
        const now = Date.now();
        if (now - this._moveTime < 1000 / 60) return;
        this._moveTime = now;

        this.app.setPosition({
            left: this.position.left + (event.clientX - this._initial.x),
            top: this.position.top + (event.clientY - this._initial.y),
        });
    };

    drag._onDragMouseUp = async function _newOnDragMouseUp(event) {
        event.preventDefault();

        window.removeEventListener(...this.handlers.dragMove);
        window.removeEventListener(...this.handlers.dragUp);
        // let windowPos = $("#smalltime-app").position();
        // let newPos = { top: windowPos.top, left: windowPos.left };
        // await game.settings.set("smalltime", "position", newPos);
        // await game.settings.set("smalltime", "pinned", false);
    };
}

/**
 * Search through all entities
 */
export async function getEntityFromAll(entityId) {}

/**
 *
 * @param {string} type - the entity type ("Actor", "Item", "JournalEntry", "Scene"), to determine where to look to call it
 * @param {string} id - the entity's id, which will be the identifier to find the entity in a particular Document collection
 * @returns entity -- returns the entity, or Document, we're looking for
 */
export async function getEntityById(type, id) {
    let ourEntity;
    switch (type) {
        case "JournalEntry":
            ourEntity = await game.journal.get(id);
            break;
        case "Actor":
            ourEntity = await game.actors.get(id);
            break;
        case "Scene":
            ourEntity = await game.scenes.get(id);
            break;
        case "Item":
            ourEntity = await game.items.get(id);
            break;
        default:
            break;
    }
    console.log("🚀 ~ file: helper-functions.js ~ line 43 ~ getEntityById ~ ourEntity", ourEntity);
    return ourEntity;
}

export async function setSetting(name, value) {
    await game.settings.set(moduleName, name, value);
}

export async function getSetting(name) {
    await game.settings.get(moduleName, name);
}

export function getCanvasToken(id) {
    return canvas.tokens.get(id);
}
export function getActorFromToken(ourToken) {
    return game.actors.get(ourToken.data.actorId);
}

export async function getAllUserActors(user) {
    let actors = game.actors.contents
        .filter((actor) => actor.type == "PC")
        .filter((actor) => actor.data.permission[user.id] == 3);
    return actors;
}

export async function getAllActorsInScene() {
    let sceneActors = canvas.scene.data.tokens.contents.map((token) => {
        return token.actor;
    });
    let uniqueSceneActors = [...new Set(sceneActors)];
    return uniqueSceneActors;
}

export function addTokensToScene() {
    canvas.scene.create;
}

export function getSceneTokenFromActor(actor) {
    return canvas.scene.data.tokens.contents.find((token) => token.data.actorId == actor.id);
}

export function getActorFromUser(user) {
    return user.character;
}

export function getActiveUsers() {
    return game.users.contents.filter((user) => {
        return user.active === true;
    });
}

export async function swapToCharacter(character) {
    await game.user.update({ character: character.id });
    ui.notifications.notify(`Your active character is now ${character.name}`);
}

/**
 * Check if scene has a token. If not, suggest adding one
 * OR look in previous scene for token
 * @param {*} actor
 */
export function checkIfSceneHasToken(actorId, tokenId, sceneId) {
    let actor = getEntityById("Actor", actorId);
    // console.log("Is our token here?", game.scenes.viewed.data.tokens.contents);
    let token = game.scenes.viewed.data.tokens.contents.find((token) => {
        return token.data.actorId == actorId;
    });
    if (token) {
        console.log("Found token new scene");
        //if we found the token, return it
        return token;
    } else {
        // askIfPlayerWantsToAddToken(actor);
        return null;
        //look in actor's initial scene for token
        // token = game.scenes.get(sceneId).data.tokens.get(tokenId);
        // if (token) {
        //     return token;
        // } else {
        //     //TODO: Add functionality for adding token, maybe to add all combatants without tokens
        //     //ask to create token from actor
        //     ui.notifications.warn(
        //         `${actor.name} doesn't have a token in this scene. Add one?`
        //     );
        // }
    }
}

export async function getType(actor) {
    return actor.type;
}

export async function createTokenFromImage(img) {
    if (tokenData.length == 0) {
        return;
    }

    let tokenDataArray = tokenData.map((data, index) => {
        let td = duplicate(data);
        td.x = Math.round(localPosition.x) + index * 100;
        td.y = Math.round(localPosition.y);
        return td;
    });
    await game.scenes.viewed.createEmbeddedDocuments("Token", tokenDataArray); // await Token.create(tk);
}
export async function createTokenFromTokenData(tokenData, localPosition) {
    if (tokenData.length == 0) {
        return;
    }
    let tokenDataArray = tokenData.map((data, index) => {
        let td = duplicate(data);
        td.x = Math.round(localPosition.x) + index * 100;
        td.y = Math.round(localPosition.y);
        return td;
    });
    await game.scenes.viewed.createEmbeddedDocuments("Token", tokenDataArray); // await Token.create(tk);
}

//https://stackoverflow.com/questions/9229645/remove-duplicate-values-from-js-array
/**
 *
 * @param {a} a - the array we're filtering
 * @param {key} key - the key by which we want to filter it
 * @returns
 */
export function uniqBy(a, key) {
    var seen = {};
    return a.filter(function (item) {
        var k = key(item);
        return seen.hasOwnProperty(k) ? false : (seen[k] = true);
    });
}

/**
 * this will create a token on the viewed scene
 * @param {ourActor} ourActor - the actor we want to get the token data from
 * @returns tokenObject - the actual object of the token
 */
export async function createTokenFromActor(ourActor, scene) {
    let tk = duplicate(ourActor.data.token);
    tk.x = 100;
    tk.y = 100;
    let tokenDoc = await scene.createEmbeddedDocuments("Token", [tk]); // await Token.create(tk);
    let tokenObject = tokenDoc[0]._object;
    return tokenObject;
}

/**
 *
 * @param {String} src - image source
 * @param {Actor} ourActor - actor object
 * @param {Scene} ourScene - secene object
 * @param {Object} options - extra options to configure
 * @param {String} options.name - the name of the token from the data
 * @param {String} options.src - the src of the token from the data
 */
export async function tokenFromExternalData(ourActor, ourScene, options = {}) {
    const { src, name } = options;
    if (!ourActor) ourActor = game.actors.getName("Blank");
    if (!ourActor) await Actor.create({ name: "Blank", type: "Token" });
    if (!ourScene) ourScene = game.scenes.viewed;

    const token = await createTokenFromActor(ourActor, ourScene);
    await ourScene.updateEmbeddedDocuments("Token", [
        {
            _id: token.id,
            img: src,
            name: name,
            x: ourScene.dimensions.sceneWidth / 2,
            y: ourScene.dimensions.sceneHeight / 2,
            displayName: CONST.TOKEN_DISPLAY_MODES.ALWAYS,
            displayBars: CONST.TOKEN_DISPLAY_MODES.OWNER,
            actor: {
                img: src,
            },
        },
    ]);
}

//https://stackoverflow.com/questions/6860853/generate-random-string-for-div-id/6860916
export function generateId() {
    var S4 = function () {
        return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
    };
    return "id" + S4() + S4() + "-" + S4() + "-" + S4() + "-" + S4() + "-" + S4() + S4() + S4();
}

export function getGameActorById(id) {
    return game.actors.get(id);
}
export function getGameActorByName(name) {
    return game.actors.getName(name);
}
export function findInFolder(folder, name) {
    return folder.content.find((actor) => {
        return actor.name == name;
    });
}

export function getFolderContents(folderName) {
    return game.folders.getName(folderName)?.content;
}

export async function callMacro(name) {
    let macro = game.macros.getName(name);
    if (macro) {
        await macro.execute();
    } else {
        ui.notifications.warn(`Couldn't find macro named ${name}`);
    }
}

/**
 * Creates a Dialog asking if the user would like to add a character's token
 * @param {Object} actor - for if user wants token
 */
export function askIfPlayerWantsToAddToken(actor, isCurrent = true) {
    let d = new Dialog({
        title: "Add Token",
        content: `${actor.name} doesn't have a token in this scene. Would you like to add their token?`,
        buttons: {
            yes: {
                icon: '<i class="fas fa-check"></i>',
                label: "Add Token",
                callback: () => {
                    createClickRequestDialog(actor.name);
                    //adding user's current actor character?
                    if (isCurrent) {
                        addActorsToScene("onePC");
                    }
                    //if not, we're adding a specific actor
                    else {
                        console.log("Actor?", actor);
                        addActorsToScene(actor);
                    }
                },
            },
            cancel: {
                label: "Cancel",
            },
        },
    }).render(true);
}

function createClickRequestDialog(name) {
    let d = new Dialog({
        title: "Example",
        content: `Click where you want to place ${name}`,
        buttons: {
            ok: {
                icon: '<i class="fas fa-check"></i>',
                label: "Ok",
            },
            cancel: {
                label: "Cancel",
                callback: () => {
                    cancelClickRequest();
                },
            },
        },
    }).render(true);
}

/**
 * Turn array of actors into token data
 * @param {array} actors - array of actors
 * @returns array of token data
 */
function actorsToTokenData(actors) {
    return actors.map((element) => {
        return element.data.token;
    });
}

function scopePreserver(actors) {}

function cancelClickRequest(callback) {
    canvas.app.stage.removeListener("pointerdown", callback);
    $("html, body").css("cursor", "auto");
}

function dropMultiplePCsAtClick(event) {
    let local = event.data.getLocalPosition(canvas.app.stage);
    let notInScene = getPCsNotInScene();
    createTokenFromTokenData(notInScene, local);
    cancelClickRequest(dropMultiplePCsAtClick); //TODO: Rename this to something like "Stop listening for clicks"
}
function dropSingleAtClick(event) {
    let local = event.data.getLocalPosition(canvas.app.stage);
    let actors = actorsToTokenData([getActorFromUser(game.user)]);
    createTokenFromTokenData(actors, local);
    cancelClickRequest(dropSingleAtClick);
}

function dropSpecificActorAtClick(event, actor) {
    let local = event.data.getLocalPosition(canvas.app.stage);
    let actors = actorsToTokenData([actor]);
    createTokenFromTokenData(actors, local);
    cancelClickRequest(dropSpecificActorAtClick);
}

export function addActorsToScene(type) {
    if (type == "allPCs") {
        requestClickOnCanvas(dropMultiplePCsAtClick);
    } else if (type == "onePC") {
        requestClickOnCanvas(dropSingleAtClick);
    } else {
        requestClickOnCanvas(dropSpecificActorAtClick, type);
    }
}
// turn cursor to crosshair wait for user to click on canvas (add event listener)
export function requestClickOnCanvas(callback, actor) {
    //TODO: Add some way to cancel this like if the user right clicks or clicks elsewhere
    $("html, body").css("cursor", "crosshair");
    //for if we have a specific actor who we want to pass
    console.log("Actor is", actor);
    if (actor) {
        canvas.app.stage.addListener("pointerdown", (event) => {
            callback(event, actor);
            canvas.app.stage.removeListener("pointerdown", this);
        });
    } else {
        canvas.app.stage.addListener("pointerdown", callback);
    }
}
//get PCs who are not in viewed scene
export function getPCsNotInScene() {
    let tokensInScene = Array.from(game.scenes.viewed.tokens);
    let tokenNamesInScene = tokensInScene.map((element) => {
        return element.name;
    });
    let PCs = getFolderContents("Main PCs");
    let pcTokens = PCs.map((element) => {
        return element.data.token;
    });
    if (PCs) {
        const notInScene = pcTokens.filter((element) => !tokenNamesInScene.includes(element.name));
        return notInScene;
        // createTokenFromTokenData(notInScene, localPosition);
    } else {
        ui.notifications.warn("Could not find Main PCs folder");
        return [];
    }
}
