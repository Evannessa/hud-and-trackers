import registerSettings from "./settings.js";
import * as HelperFunctions from "./helper-functions.js";
import { ActivationObject } from "./classes/ActivationObject.js";
let ourCombat;
let combatHud;
let inCombat = false;

let socket;

let slowPlayersStore;
let fastPlayersStore;
let enemiesStore;
let npcAlliesStore;

Handlebars.registerHelper("convertToSentence", function (strInputCode) {
    let result = strInputCode.replace(/([A-Z])/g, " $1");
    let finalResult = result.charAt(0).toUpperCase() + result.slice(1);
    return finalResult;
});

Hooks.once("socketlib.ready", () => {
    socket = socketlib.registerModule("hud-and-trackers");
});

Hooks.on("renderCombatHud", (app, html) => {
    console.log("Combat hud rendered");
    if (!game.combatHud.app) {
        game.combatHud.app = app;
    }
    if (!game.user.isGM) {
        socket.register("receiveDataAndUpdate", game.combatHud.app.receiveDataAndUpdate);
    }
});

Hooks.on("init", () => {
    game.combatHud = {};
    game.combatHud.startCombat = startCombat;
});

Hooks.on("ready", async () => {
    registerSettings();
    let savedCombat = await game.settings.get("hud-and-trackers", "savedCombat");
    if (savedCombat) {
        game.combatHud.app = new CombatHud(savedCombat).render(true);
    } else {
        game.combatHud.app = new CombatHud().render(true);
    }
    window.combatHud = game.combatHud.app;
    socket.register("receiveDataAndUpdate", game.combatHud.app.receiveDataAndUpdate);
    createRepresentativeActors();
});

const specialCombatStartID = Hooks.on("combatHudStartCombat", () => {
    registerCombatSockets();
    if (game.user.isGM) {
        console.log("THIS HAS BEEN CALLED ON COMBAT START");
    }
});

async function createRepresentativeActors() {
    let repTokens = game.folders.getName("RepTokens");
    if (!repTokens) {
        await Folder.create({
            name: "RepTokens",
            type: "Actor",
        }).then((parentFolder) => {
            Actor.create({
                name: "FastPlayer",
                type: "NPC",
                folder: parentFolder.id,
            });
            Actor.create({
                name: "SlowPlayer",
                type: "NPC",
                folder: parentFolder.id,
            });
            Actor.create({
                name: "NPCAllies",
                type: "NPC",
                folder: parentFolder.id,
            });
            Actor.create({
                name: "Enemies",
                type: "NPC",
                folder: parentFolder.id,
            });
        });
    }
}

async function startCombat() {
    console.log("How many times is this being called?");
    let data;
    if (!game.user.isGM) {
        return;
    }
    if (game.combat) {
        game.combat.endCombat();
    } else {
        if (canvas.tokens.controlled.length === 0) {
            let allTokens = game.canvas.tokens.placeables;
            allTokens = allTokens.filter((token) => {
                return (
                    token.actor.data.type == "PC" ||
                    token.actor.data.type == "NPC" ||
                    token.actor.data.type == "Companion"
                );
            });
            allTokens.forEach((item) => {
                item.control({
                    releaseOthers: false,
                });
            });
            startCombat();
        } else {
            var combat = ui.combat.combat;
            if (!combat) {
                if (game.user.isGM) {
                    combat = await game.combats.documentClass.create({
                        scene: null,
                        active: true,
                    });
                }
            } else {
                combat = game.combat;
            }
            await rollNonCombatInitiative(combat).then(() => {
                createRepTokens(combat).then(() => {
                    setRepTokenInitiative(combat).then(async () => {
                        await combat.startCombat();
                        game.combatHud.app.initOnCombatStart(combat);
                        game.combatHud.initialSceneId = game.scenes.viewed.id;
                        Hooks.call("combatHudStartCombat");
                    });
                });
            });
        }
    }
}

function registerCombatSockets() {
    if (game.combatHud.app && !game.user.isGM) {
        socket.register("requestSetTokenHasActed", game.combatHud.app.setTokenHasActed);
        socket.register("requestIfAllHaveActed", game.combatHud.app.checkIfAllHaveActed);
        console.log("Sockets registered");
    }
}

/**
 * We're rolling a "Fake" initiative to determine what category
 * the various combatants go into
 * @param {combat} combat - the specific combat that's just been started
 */
async function rollNonCombatInitiative(combat) {
    let tokens = game.canvas.tokens.controlled;
    let tokensWithInitiative = {};
    let justTokens = {};
    let fastPlayers = [];
    let slowPlayers = [];
    let enemies = [];
    let npcAllies = [];
    let unfilteredPlayers = {};

    // this will make sure there are no duplicate tokens w/ the same actor,
    // which CAN be a problem if not players.
    let npcTokens = tokens.filter(
        (token) => token.actor.type == "NPC" || token.actor.type == "Companion"
    );
    let playerTokens = tokens.filter((token) => token.actor.type == "PC");
    playerTokens = Array.from(new Set(tokens.map((token) => token.actor.name))).map(
        (actorName) => {
            return tokens.find((token) => token.actor.name == actorName);
        }
    );
    tokens = [...playerTokens, ...npcTokens];

    for (let token of tokens) {
        let actor = getActor(token);
        let initiative = 0;
        if (actor) {
            initiative = parseInt(actor.data.data.settings.initiative.initiativeBonus);
            if (actor.data.type == "PC") {
                //if this token id is not already in there
                //not working because tokens w/ same actor might have different id
                unfilteredPlayers[token.id] = token;
                let r = new Roll("1d20").evaluate("async=true").result;
                initiative += parseInt(r);
                tokensWithInitiative[token.id] = initiative;
            } else if (actor.data.type == "NPC" || actor.data.type == "Companion") {
                initiative = parseInt(actor.data.data.level) * 3 + (initiative - 0.5);
                tokensWithInitiative[token.id] = initiative;
            }
        }
        justTokens[token.id] = token;
    }
    //get the enemies by filtering the tokens by disposition
    enemies = npcTokens.filter((token) => {
        return token.data.disposition == -1;
    });
    npcAllies = npcTokens.filter((token) => {
        return token.data.disposition == 0 || token.data.disposition == 1;
    });

    //find the highest enemy initiative
    let highestEnemyInitiative = 0;
    for (let enemy of enemies) {
        let ini = tokensWithInitiative[enemy.id];
        if (ini > highestEnemyInitiative) {
            highestEnemyInitiative = ini;
        }
    }

    for (let tokenId in tokensWithInitiative) {
        //if the initiative is higher than the enemy
        if (tokensWithInitiative[tokenId] >= highestEnemyInitiative) {
            //push this particular token to the fast players
            if (tokenId in unfilteredPlayers) {
                fastPlayers.push(unfilteredPlayers[tokenId]);
            }
        } else if (tokensWithInitiative[tokenId] < highestEnemyInitiative) {
            if (tokenId in unfilteredPlayers) {
                slowPlayers.push(unfilteredPlayers[tokenId]);
            }
        }
    }

    slowPlayersStore = convertToArrayOfIDs(slowPlayers);
    fastPlayersStore = convertToArrayOfIDs(fastPlayers);
    npcAlliesStore = convertToArrayOfIDs(npcAllies);
    enemiesStore = convertToArrayOfIDs(enemies);
    let activeCategories = {
        slowPlayers: convertToArrayOfIDs(slowPlayers),
        fastPlayers: convertToArrayOfIDs(fastPlayers),
        npcAllies: convertToArrayOfIDs(npcAllies),
        enemies: convertToArrayOfIDs(enemies),
    };
}

/**
 *
 * @param {array} array an array of tokens we want to convert to an array of token ids
 * @returns an array of token ids from the tokens
 */
function convertToArrayOfIDs(array) {
    return array.map((item) => {
        return item.id;
    });
}
/**
 *
 * @param {array} array an array of token ids we want to convert to tokens
 * @returns an array of tokens
 */
function convertToArrayOfTokens(array) {
    if (!array) {
        return;
    }
    return array.map((id) => {
        return game.canvas.tokens.objects.children.find((token) => token.id == id);
    });
}

function getActor(ourToken) {
    //
    return game.actors.get(ourToken.data.actorId);
}

function getCanvasToken(id) {
    return canvas.tokens.get(id);
}

async function createToken(ourActor) {
    let tokenDoc = await Token.create(ourActor.data.token);
    let tokenObject = tokenDoc[0]._object;
    return tokenObject;
}
async function createTokenFromActor(ourActor, scene) {
    let tk = duplicate(ourActor.data.token);
    tk.x = 100;
    tk.y = 100;
    let tokenDoc = await scene.createEmbeddedDocuments("Token", tk);
    return tokenDoc;
}

async function createRepTokens(combat) {
    let repTokens = game.folders.getName("RepTokens");
    if (!repTokens) {
        await Folder.create({
            name: "RepTokens",
            type: "Actor",
        }).then((parentFolder) => {
            Actor.create({
                name: "FastPlayer",
                type: "NPC",
                folder: parentFolder.id,
            });
            Actor.create({
                name: "SlowPlayer",
                type: "NPC",
                folder: parentFolder.id,
            });
            Actor.create({
                name: "NPCAllies",
                type: "NPC",
                folder: parentFolder.id,
            });
            Actor.create({
                name: "Enemies",
                type: "NPC",
                folder: parentFolder.id,
            });
        });
    }
    let representativeTokens = [];
    let tokenData = [];

    let enemies = enemiesStore;
    let npcAllies = npcAlliesStore;
    let fastPlayers = fastPlayersStore;
    let slowPlayers = slowPlayersStore;

    console.log("Stored values", enemies, npcAllies, fastPlayers, slowPlayers);

    //create all the tokens representing the different "Sides"
    let scene = game.scenes.viewed;
    let tokenActors = repTokens.content;
    if (slowPlayers.length == 0) {
        tokenActors = tokenActors.filter((actor) => actor.name != "SlowPlayer");
    }
    if (fastPlayers.length == 0) {
        tokenActors = tokenActors.filter((actor) => actor.name != "FastPlayer");
    }
    if (npcAllies.length == 0) {
        tokenActors = tokenActors.filter((actor) => actor.name != "NPCAllies");
    }
    if (enemies.length == 0) {
        tokenActors = tokenActors.filter((actor) => actor.name != "Enemies");
    }
    console.log(tokenActors);
    tokenData = tokenActors.map((actor) => actor.data.token);
    console.log(tokenData);
    scene.createEmbeddedDocuments("Token", tokenData);
    //create all of the representative combatants
    await combat.createEmbeddedDocuments("Combatant", tokenData);
}

async function setRepTokenInitiative(combat) {
    for (let combatant of combat.turns) {
        console.log(combatant);
        if (combatant.data.name == "FastPlayer") {
            await combat.setInitiative(combatant.id, 30);
        }
        if (combatant.data.name == "Enemies") {
            await combat.setInitiative(combatant.id, 20);
        }
        if (combatant.data.name == "SlowPlayer") {
            await combat.setInitiative(combatant.id, 10);
        }
        if (combatant.data.name == "NPCAllies") {
            await combat.setInitiative(combatant.id, 3);
        }
    }
}

let refreshed = false;

Hooks.on("updateCombat", async (combat, roundData, diff) => {
    if (roundData.round) {
        //If not undefined, think this means it's a new round?
        game.combatHud.app.unhighlightAll(canvas.tokens.placeables);
    }
    ourCombat = combat;
    let round = combat.current.round;

    //if we're in combat but we haven't toggled inCombat to true
    if (combat.current.round > 0 && !inCombat) {
        inCombat = true;
    }

    if (round > 0) {
        game.combatHud.app.data.currentRound = round;

        //TODO: clean this up so that the names are the same
        let name = combat.combatant.name;
        if (name == "FastPlayer") {
            game.combatHud.app.data.currentPhase = "fastPlayersTurn";
        } else if (name == "Enemies") {
            game.combatHud.app.data.currentPhase = "enemiesTurn";
        } else if (name == "SlowPlayer") {
            game.combatHud.app.data.currentPhase = "slowPlayersTurn";
        } else if (name == "NPCAllies") {
            game.combatHud.app.data.currentPhase = "npcAlliesTurn";
        }
    }
});

Hooks.on("deleteCombat", async (combat) => {
    inCombat = false;

    if (game.user.isGM) {
        //here we're gonna delete the phase rep tokens
        let allTokens = game.canvas.tokens.placeables;
        let scene = game.scenes.viewed;
        let tokensToDelete = [];

        //find all tokens on canvas with names of the phase rep tokens
        allTokens.forEach((token) => {
            if (
                token.name == "Enemies" ||
                token.name == "FastPlayer" ||
                token.name == "NPCAllies" ||
                token.name == "SlowPlayer"
            ) {
                tokensToDelete.push(token.id);
            }
        });
        //delete the ones that match
        scene.deleteEmbeddedDocuments("Token", tokensToDelete);
    }
    game.combatHud.app.data.inCombat = false;
    game.combatHud.app.data.currentPhase = "fastPlayersTurn";
});

/**
 * Creates a PIXI.Container -- destroying previous one 1st if already exists--, adds sprite
 * or graphic to it depending on if token has acted or not.
 * @param {token} token - the token we're placing the marker upon
 * @param {*} hasActed - whether or not the token has acted or not
 */
function createMarkerOnToken(token, hasActed) {
    if (!token) {
        return;
    }

    let texturePath;
    let previousRotation = 0;
    if (token.marker) {
        if (token.marker.children.length > 0) {
            previousRotation = token.marker.children[0].rotation;
        }
        //destroy the marker PIXI Container stored on the token
        token.marker.destroy();

        //delete the property itself that was storing it
        delete token.marker;
    }

    if (hasActed) {
        texturePath = "modules/hud-and-trackers/images/check-mark.png";
    } else {
        texturePath = "modules/hud-and-trackers/images/convergence-target.png";
    }

    token.marker = token.addChildAt(
        new PIXI.Container(),
        token.getChildIndex(token.icon)
    );
    const sprite = PIXI.Sprite.from(texturePath);
    token.marker.addChild(sprite);
    sprite.zIndex = 2000;
    sprite.width = 200;
    sprite.height = 200;
    sprite.anchor.set(0.5, 0.5);
    sprite.position.set(token.w / 2, token.h / 2);

    //We only want it to rotate if has not acted
    if (!hasActed && sprite) {
        if (sprite != null) {
            sprite.rotation = previousRotation;
        }
        let rotateFunction = (delta) => {
            if (sprite != null) {
                sprite.rotation += 0.05;
            }
        };
        //store this on the scene
        if (!game.combatHud.functions) {
            game.combatHud.functions = {};
        }
        game.combatHud.functions[token.id] = rotateFunction;
        token.rotateMarkerFunction = rotateFunction;
        canvas.app.ticker.add(rotateFunction, token.id);
    }
}

function removeMarkerOnToken(token) {
    canvas.app.ticker.remove(token.rotateMarkerFunction, token.id);
    if (token.marker) {
        token.marker.destroy();
    }
}
Hooks.on("canvasReady", (canvas) => {
    if (game.combatHud.app && game.combatHud.initialSceneId) {
        if (canvas.scene.data._id == game.combatHud.initialSceneId) {
            console.log("Switching back to original scene");
            //back on the original scene, start to highlight everything again
            if (game.combatHud.app.element) {
                let combatantDivs = game.combatHud.app.element.find(".combatant-div");
                for (let combatantDiv of combatantDivs) {
                    if (!combatantDiv.classList.contains("activated")) {
                        game.combatHud.app.highlightTokenInGroup(
                            combatantDiv.dataset.id,
                            false
                        );
                    } else {
                        game.combatHud.app.highlightTokenInGroup(
                            combatantDiv.dataset.id,
                            true
                        );
                    }
                }
            }
        }
    }
});
Hooks.on("canvasInit", (canvas) => {
    //we're trying to get the scene where the combat started
    if (game.combatHud.app && game.combatHud.initialSceneId) {
        //if we've switched scenes from the initial combat scene
        if (canvas.scene.data._id != game.combatHud.initialSceneId) {
            console.log("Switching to different scene");
            //if we have the ticker functions
            if (game.combatHud.functions) {
                for (let tokenId in game.combatHud.functions) {
                    canvas.app.ticker.remove(game.combatHud.functions[tokenId], tokenId);
                }
            }
        }
        // if we're back on the original scene
    }
});

Hooks.on("renderCombatHud", async (app, newHtml) => {
    let windowApp = newHtml.closest(".window-app");
    //
    $(windowApp).css({
        height: "-moz-max-content",
        height: "fit-content",
        width: "-moz-max-content",
        width: "fit-content",
    });
});

Hooks.once("renderCombatHud", (app, html) => {
    HelperFunctions.setInvisibleHeader(html, false);
    let position = game.settings.get("hud-and-trackers", "combatHudPosition");
    if (Object.keys(position).length > 0) {
        app.setPosition({ top: position.top, left: position.left });
    } else {
        let windowHeight = $(document).height();
        let appHeight = app.position.height;
        let value = windowHeight - (appHeight + 200);
        app.setPosition({ top: value });
    }
});

function createUniqueCombatant(id, token) {}

/**
 * @param Combat!
 */
export default class CombatHud extends Application {
    async initOnCombatStart(combat) {
        console.log("INITIALIZING HUD ON COMBAT START");
        this.data.isGM = game.user.isGM;
        this.data.combatStarter = game.userId;
        this.data.ourCombat = combat;
        this.data.inCombat = true;
        this.data.initialized = true;

        let fastPlayers = convertToArrayOfTokens(fastPlayersStore);
        let slowPlayers = convertToArrayOfTokens(slowPlayersStore);
        let enemies = convertToArrayOfTokens(enemiesStore);
        let npcAllies = convertToArrayOfTokens(npcAlliesStore);
        this.data.currentRound = ourCombat.current.round;
        //if we have no fast players
        if (fastPlayers.length == 0) {
            //set the first turn to enemies
            this.data.currentPhase = "enemiesTurn";
        } else {
            //otherwise, if we have no enemies, we should always have fast players, as there were no enemies to compare to
            this.data.currentPhase = "fastPlayersTurn";
        }

        this.data.activationObject = new ActivationObject(
            {},
            fastPlayers,
            slowPlayers,
            enemies,
            npcAllies
        );
        game.combatHud.app.render(game.combatHud.app.position);
    }

    constructor(data = {}) {
        super();
        // super(combatData);
        this.data = data;

        // this.savedData = game.settings.get("hud-and-trackers", "savedCombat");
        if (Object.keys(data).length == 0) {
            //if we don't have any saved combat data
            this.data = this.initializeDefaultData();
        } else {
            //if we do have saved combat data
            //create a new activation object w/ this saved data of the map
            this.data.activationObject = new ActivationObject(
                this.data.activationObject.activationMap
            );
            //make the combat whatever combat's currently saved by the game
            this.data.ourCombat = game.combat;
        }
    }

    static phases = {
        FASTPC: "fastPlayers",
        SLOWPC: "slowPlayers",
        ENEMY: "enemies",
        NPC: "npcAllies",
    };

    static ID = "combat-hud";

    initializeDefaultData() {
        return {
            isGM: game.user.isGM,
            phases: {
                FASTPC: "fastPlayers",
                SLOWPC: "slowPlayers",
                ENEMY: "enemies",
                NPC: "npcAllies",
            },
            inCombat: false,
            currentRound: 1,
            currentPhase: "fastPlayersTurn",
            initialized: false,
            activationObject: new ActivationObject(),
        };
    }

    unhighlightAll(tokens) {
        if (game.user.isGM) {
            tokens.forEach((token) => {
                removeMarkerOnToken(token);
            });
        }
    }

    highlightTokenInGroup(tokenId, hasActed) {
        let token = game.canvas.tokens.placeables.find((token) => token.id == tokenId);
        if (game.user.isGM && token) {
            createMarkerOnToken(token, hasActed);
        }
    }

    setTokenHasActed(elementId, userId, hasActed) {
        if (!game.combatHud.app.checkIfUserIsTokenOwner(elementId, userId)) {
            return;
        }
        //find element in hud, and add class to show it has acted

        let element = game.combatHud.app.element[0].querySelector(
            `[data-id='${elementId}']`
        );
        if (hasActed) {
            $(element).addClass("activated");
        } else {
            $(element).removeClass("activated");
        }

        //update the activations in the activation object to keep track
        game.combatHud.app.data.activationObject.updateActivations(elementId, hasActed);

        game.combatHud.app.render(game.combatHud.app.position);
    }
    //each time an actor is clicked on, check if it's the last. IF so, re-render the thing.
    async checkIfAllHaveActed(elementId) {
        let element = game.combatHud.app.element[0].querySelector(
            `[data-id='${elementId}']`
        );
        let phaseName = element.dataset.phase;
        let map = game.combatHud.app.data.activationObject.getSpecificMap(phaseName);
        //go through the map, find which items are false.
        //if none are false, all of them have acted, so go to the next
        //turn and reset the activations
        //*maybe re-render the combat too?
        let allActed = true;
        for (let mapItem in map) {
            if (!map[mapItem]) {
                allActed = false;
            }
        }
        if (allActed) {
            await game.combatHud.app.data.ourCombat.nextTurn();
            game.combatHud.app.resetActivations();
            game.combatHud.app.unhighlightAll(game.canvas.tokens.placeables);
            game.combatHud.app.render(game.combatHud.app.position);
        }
    }

    getTokensInCurrentPhase() {
        return this.data.activationObject.getTokensInPhase(this.data.currentPhase);
    }

    resetActivations() {
        this.data.activationObject.resetActivations();
    }

    /** @override */
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            popOut: true,
            submitOnChange: false,
            closeOnSubmit: false,
            minimizable: false,
            background: "none",
            top: 600,
            left: 810,
            template: "modules/hud-and-trackers/templates/combat-hud.html",
            id: "combatHud",
            title: "combatHud",
            onSubmit: (e) => e.preventDefault(),
        });
    }

    getData() {
        //convert our activationMap ids to tokens
        let tokenMap = Object.values(this.data.activationObject.activationMap).map(
            (obj) => {
                return convertToArrayOfTokens(Object.keys(obj));
            }
        );
        let tokens = {
            fastPlayers: tokenMap[0],
            slowPlayers: tokenMap[1],
            enemies: tokenMap[2],
            npcAllies: tokenMap[3],
        };

        return {
            ...this.data,
            ...tokens,
            // isGM: game.user.isGM,
            // activationObject: this.activationObject,
            // combatActive: this.inCombat,
            // fastPlayers: convertToArrayOfTokens(
            //     Object.keys(this.returnObjectOrEmpty("fastPlayers"))
            // ),
            // slowPlayers: convertToArrayOfTokens(
            //     Object.keys(this.returnObjectOrEmpty("slowPlayers"))
            // ),
            // enemies: convertToArrayOfTokens(
            //     Object.keys(this.returnObjectOrEmpty("enemies"))
            // ),
            // npcAllies: convertToArrayOfTokens(
            //     Object.keys(this.returnObjectOrEmpty("npcAllies"))
            // ),
            // currentPhase: this.currentPhase,
            // currentRound: this.currentRound,
        };
        // } else {
        //     this.data = game.settings.get("hud-and-trackers", "savedCombat");
        //     this.inCombat = this.data.inCombat;
        //     if (this.inCombat) {
        //         this.ourCombat = game.combat;
        //     }
        //     this.currentPhase = this.data.currentPhase;
        //     this.currentRound = this.data.currentRound;
        //     this.activationObject = new ActivationObject(
        //         this.data.activationObject.activationMap
        //     );
        //     return {
        //         isGM: game.user.isGM,
        //         activationObject: this.activationObject,
        //         combatActive: this.inCombat,
        //         fastPlayers: convertToArrayOfTokens(
        //             Object.keys(this.returnObjectOrEmpty("fastPlayers"))
        //         ),
        //         slowPlayers: convertToArrayOfTokens(
        //             Object.keys(this.returnObjectOrEmpty("slowPlayers"))
        //         ),
        //         enemies: convertToArrayOfTokens(
        //             Object.keys(this.returnObjectOrEmpty("enemies"))
        //         ),
        //         npcAllies: convertToArrayOfTokens(
        //             Object.keys(this.returnObjectOrEmpty("npcAllies"))
        //         ),
        //         currentPhase: this.currentPhase,
        //         currentRound: this.currentRound,
        //     };
        // }
    }

    returnObjectOrEmpty(name) {
        let outerMap = this.activationObject.activationMap;
        if (outerMap == undefined) {
            return {};
        }
        let map = outerMap[name];
        if (map) {
            return map;
        } else {
            return {};
        }
    }

    convertToProperObject(object) {
        let oldObject = object;
        if (Object.keys(oldObject).length > 0) {
            this.activationObject = new ActivationObject(null, null, null, null, object);
        }
    }

    async _onHandleButtonClick(event) {
        let clickedElement = $(event.currentTarget);
        let action = clickedElement.data().action;

        switch (action) {
            case "endCombat":
                await this.data.ourCombat.endCombat();
                this.unhighlightAll(game.canvas.tokens.placeables);
                await game.settings.set(
                    "hud-and-trackers",
                    "savedCombat",
                    this.initializeDefaultData()
                );
                game.combatHud.app.render(game.combatHud.app.position);
                break;
            case "startCombat":
                startCombat();
                game.combatHud.app.render(game.combatHud.app.position);
                break;
            default:
                break;
        }
    }

    async activateListeners(html) {
        console.log("Activating listeners again");

        if (game.user.isGM && this.data.combatStarter === game.userId) {
            await game.settings.set("hud-and-trackers", "savedCombat", this.data);
        }

        //remove app from "ui.windows" to not let it close with the escape key
        delete ui.windows[this.appId];

        let windowContent = html.closest(".window-content");
        let combatantDivs = windowContent.find(".combatant-div");
        let scene = game.scenes.viewed;

        html.on("click", "[data-action]", this._onHandleButtonClick.bind(this));
        //check if in combat
        if (this.data.inCombat) {
            //find the in combat button, and allow only the GM to click it
            for (let combatantDiv of combatantDivs) {
                if (!combatantDiv.classList.contains("activated")) {
                    this.highlightTokenInGroup(combatantDiv.dataset.id, false);
                } else {
                    this.highlightTokenInGroup(combatantDiv.dataset.id, true);
                }
                let token = getCanvasToken(combatantDiv.dataset.id);

                $(combatantDiv).mouseenter((event) => {
                    this.tintMarkerOnToken(token, 0xff5733);
                });

                $(combatantDiv).mouseleave((event) => {
                    this.tintMarkerOnToken(token, 0xffffff);
                });

                $(combatantDiv).mousedown((event) => {
                    let elementId = event.currentTarget.dataset.id;
                    if (event.which == 3) {
                        //right click
                        if (!game.user.isGM) {
                            if (!event.altKey) {
                                socket.executeAsGM(
                                    "requestSetTokenHasActed",
                                    elementId,
                                    game.userId,
                                    true
                                );
                                socket.executeAsGM("requestIfAllHaveActed", elementId);
                            } else {
                                socket.executeAsGM(
                                    "requestSetTokenHasActed",
                                    elementId,
                                    game.userId,
                                    false
                                );
                            }
                        } else {
                            if (!event.altKey) {
                                this.setTokenHasActed(elementId, game.user.id, true);
                                this.checkIfAllHaveActed(elementId);
                            } else {
                                this.setTokenHasActed(elementId, game.user.id, false);
                            }
                        }
                    } else if (event.which == 1) {
                        if (game.user.isGM) {
                            let token = getCanvasToken(combatantDiv.dataset.id);
                            if (token) {
                                token.control({
                                    releaseOthers: true,
                                });
                            }
                        }
                    }
                });
                let map = this.data.activationObject.getSpecificMap(
                    combatantDiv.dataset.phase
                );
                for (let id in map) {
                    if (combatantDiv.dataset.id == id) {
                        if (map[id] == true) {
                            $(combatantDiv).addClass("activated");
                            this.highlightTokenInGroup(token.id, true);
                        }
                    }
                }
            }
        }

        //send the data once all the GM's stuff has been activated
        if (game.user.isGM && this.data.combatStarter === this.userId) {
            this.shareApp();
        }
    }

    tintMarkerOnToken(token, color) {
        if (token.marker) {
            token.marker.children.forEach((child) => (child.tint = color));
        }
    }

    getElementFromParent(element, elementSelector) {
        let windowContent = element.closest(".window-content");
        return windowContent.querySelector(elementSelector);
    }

    checkIfUserIsTokenOwner(tokenId, userId) {
        console.log(tokenId);
        let token = getCanvasToken(tokenId);
        console.log(token);
        let actor = getActor(token);
        let permission = actor.data.permission[userId];
        if (permission == 3) {
            return true;
        } else {
            return false;
        }
    }

    shareApp() {
        socket.executeForOthers("receiveDataAndUpdate", this.data);
    }

    updateApp(data) {
        this.data = data;
        game.combatHud.app.render(game.combatHud.app.position);
    }

    receiveDataAndUpdate(data) {
        //update the data
        game.combatHud.app.data = { ...data };
        //re-create the activation object
        game.combatHud.app.data.activationObject = new ActivationObject({
            ...data.activationObject.activationMap,
        });
        // game.combatHud.app.data.currentPhase = data.currentPhase;
        // game.combatHud.app.data.currentRound = data.currentRound;
        // game.combatHud.app.data.inCombat = data.inCombat;
        // game.combatHud.app.data.initialized = data.initialized;
        //re-render the app
        game.combatHud.app.render(game.combatHud.app.position);
    }
}
