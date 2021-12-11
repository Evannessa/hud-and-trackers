export const moduleName = "hud-and-trackers";

export function selectMyCharacter() {
    let actor = getActorFromUser(game.user);
    let tokenDoc = getSceneTokenFromActor(actor);
    if (tokenDoc) {
        tokenDoc.object.control({ releaseOthers: true });
    } else {
        ui.notifications.warn(`${actor.name} does not have a token on this scene`);
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
    console.log(uniqueSceneActors);
    return uniqueSceneActors;
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

export async function createTokenFromTokenData(tokenData) {
    const td = duplicate(tokenData);
    td.x = 100;
    td.y = 100;
    await game.scenes.viewed.createEmbbededDocuments("Token", td); // await Token.create(tk);
    // await Token.create(td);
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
    console.log(scene);
    let tk = duplicate(ourActor.data.token);
    tk.x = 100;
    tk.y = 100;
    let tokenDoc = await scene.createEmbbededDocuments("Token", tk); // await Token.create(tk);
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

export function addPCsToScene() {
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
        notInScene.forEach((element) => {
            createTokenFromTokenData(element);
        });
    } else {
        ui.notifications.warn("Could not find Main PCs folder");
    }
}
