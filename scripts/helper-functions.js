export const moduleName = "hud-and-trackers";

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

export function getSceneTokenFromActor(actor) {
    return canvas.scene.data.tokens.contents.find((token) => token.name == actor.name);
}

export function getActorFromUser(user) {
    return user.character;
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
