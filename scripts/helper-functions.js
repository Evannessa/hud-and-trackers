export const moduleName = "hud-and-trackers";

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
        if (showIcon) {
            let node = document.createElement("p");
            node.innerHTML = '<i class="fas fa-arrows-alt"></i>';
            windowHeader.appendChild(node);
        }
    }
}

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
    console.log(
        "🚀 ~ file: helper-functions.js ~ line 43 ~ getEntityById ~ ourEntity",
        ourEntity
    );
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
    return canvas.scene.data.tokens.contents.find((token) => token.name == actor.name);
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
export async function createTokenFromTokenData(tokenData, localPosition) {
    console.log("Token data", tokenData);
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
//https://stackoverflow.com/questions/6860853/generate-random-string-for-div-id/6860916
export function idGenerator() {
    var S4 = function () {
        return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
    };
    return (
        "id" +
        S4() +
        S4() +
        "-" +
        S4() +
        "-" +
        S4() +
        "-" +
        S4() +
        "-" +
        S4() +
        S4() +
        S4()
    );
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

function askIfPlayerWantsToAddToken(actor) {
    let d = new Dialog({
        title: "Add Token",
        content: `${actor.name} doesn't have a token in this scene. Would you like to add their token?`,
        buttons: {
            yes: {
                icon: '<i class="fas fa-check"></i>',
                label: "Add Token",
                callback: () => {
                    createClickRequestDialog();
                    addActorsToScene("onePC");
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

export function addActorsToScene(type) {
    if (type == "allPCs") {
        requestClickOnCanvas(dropMultiplePCsAtClick);
    } else if (type == "onePC") {
        requestClickOnCanvas(dropSingleAtClick);
    }
}
// turn cursor to crosshair wait for user to click on canvas (add event listener)
export function requestClickOnCanvas(callback) {
    //TODO: Add some way to cancel this like if the user right clicks or clicks elsewhere
    $("html, body").css("cursor", "crosshair");
    canvas.app.stage.addListener("pointerdown", callback);
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
        const notInScene = pcTokens.filter(
            (element) => !tokenNamesInScene.includes(element.name)
        );
        return notInScene;
        // createTokenFromTokenData(notInScene, localPosition);
    } else {
        ui.notifications.warn("Could not find Main PCs folder");
        return [];
    }
}
