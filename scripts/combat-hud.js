import registerSettings from "./settings.js";
import * as HelperFunctions from "./helper-functions.js";
import { ActivationObject } from "./classes/ActivationObject.js";
let ourCombat;
let combatHud;
let inCombat = false;
let phases = ["fastPlayers", "enemies", "slowPlayers", "npcAllies"];
let phasesWithInitiative = {
    fastPlayers: 30,
    enemies: 20,
    slowPlayers: 10,
    npcAllies: 2,
};
let phasesWithActorIDs = {};
let socket;

let slowPlayersStore;
let fastPlayersStore;
let enemiesStore;
let npcAlliesStore;

Hooks.once("socketlib.ready", () => {
    socket = socketlib.registerModule("hud-and-trackers");
});

Hooks.on("renderCombatHud", (app, html) => {
    if (!game.combatHud.app) {
        game.combatHud.app = app;
    }
    // if (!game.user.isGM) {
    //     socket.register("receiveDataAndUpdate", game.combatHud.app.receiveDataAndUpdate);
    // }
});

Hooks.on("init", () => {
    game.combatHud = {};
    game.combatHud.startCombat = startCombat;
});

Hooks.on("ready", async () => {
    registerSettings();

    //if we have a saved combat, render the combat app with details
    //from our saved combat
    //otherwise, render it blank
    let savedCombat = await game.settings.get("hud-and-trackers", "savedCombat");
    if (savedCombat) {
        game.combatHud.app = new CombatHud(savedCombat).render(true);
        registerCombatSockets();
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
// // As a combatant is created, store original scene ID in a flag
// Hooks.on("preCreateCombatant", (combatant, data, options, userID) => {
//     // If combatant's token has MLT flags, it's most likely a clone so do not create a combatant
//     const token = (data.tokenId, data.actorId);
//     if (token.data.flags["multilevel-tokens"]) return false;

//     if (combatant.parent.data.scene) return;
//     const sceneID = token.parent.data._id;
//     combatant.data.update({ "flags.floating-combat-toolbox.sceneID": sceneID });
// });

async function createRepresentativeActors() {
    let repTokens = game.folders.getName("RepTokens");
    if (!repTokens) {
        await Folder.create({
            name: "RepTokens",
            type: "Actor",
        }).then((parentFolder) => {
            phases.forEach((phase) => {
                Actor.create({
                    name: [phase],
                    type: "NPC",
                    folder: parentFolder.id,
                });
            });
        });
    }
}

/**
 * This method:
 * 1. controls all tokens,
 * 2. starts a combat, or fetches one if it already exists,
 * 3. waits for the initiatives to be rolled
 * 4. then when the promise is returned, starts the true Foundry base combat
 * 5. And updates and displays the "fake" combat in the combat hud
 * @returns nothing if the user is not the GM
 */
async function startCombat() {
    let data;
    if (!game.user.isGM) {
        return;
    }

    //if we have a combat, end it
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
    if (game.combatHud.app) {
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

    //TODO: At some point, add a way to configure these categories

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
    let tokensByPhase = [fastPlayers, enemies, slowPlayers, npcAllies];
    let index = 0;
    for (let tokenGroup of tokensByPhase) {
        phasesWithActorIDs[phases[index]] = tokenGroup.map((token) => {
            return token.actor.id;
        });
        index++;
    }
    console.log("Phases with actors are", phasesWithActorIDs);
    // slowPlayersStore = slowPlayers.map((token) => {
    //     return token.actor.id;
    // });
    // fastPlayersStore = fastPlayers.map((token) => {
    //     return token.actor.id;
    // });

    // // slowPlayersStore = convertToArrayOfIDs(slowPlayers);
    // // fastPlayersStore = convertToArrayOfIDs(fastPlayers);
    // // npcAlliesStore = convertToArrayOfIDs(npcAllies);
    // // enemiesStore = convertToArrayOfIDs(enemies);
    // let phasesWithActors = {
    //     slowPlayers: convertToArrayOfIDs(slowPlayers),
    //     fastPlayers: convertToArrayOfIDs(fastPlayers),
    //     npcAllies: convertToArrayOfIDs(npcAllies),
    //     enemies: convertToArrayOfIDs(enemies),
    // };
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
    if (HelperFunctions.checkIfSceneHasToken(game.scenes.viewed))
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

/**
 * 1. create the representative actors  & their folder if it doesn't exist
 * 2. If it does exist, get all the tokens we've stored as being in the combat in each category
 * 3. filter them out if a category has no tokens in it
 * @param {combat} combat - the currently running 'official' combat
 */
async function createRepTokens(combat) {
    let repTokens = game.folders.getName("RepTokens");
    if (!repTokens) {
        await Folder.create({
            name: "RepTokens",
            type: "Actor",
        }).then((parentFolder) => {
            phases.forEach((phase) => {
                Actor.create({
                    name: [phase],
                    type: "NPC",
                    folder: parentFolder.id,
                });
            });
        });
    }

    let representativeTokens = [];
    let tokenData = [];

    let enemies = enemiesStore;
    let npcAllies = npcAlliesStore;
    let fastPlayers = fastPlayersStore;
    let slowPlayers = slowPlayersStore;

    //create all the tokens representing the different "Sides"
    let scene = game.scenes.viewed;
    let tokenActors = repTokens.content;
    //but first check if there are characters in that category
    for (let phase in phasesWithActorIDs) {
        if (phasesWithActorIDs[phase].length == 0) {
            tokenActors = tokenActors.filter((actor) => actor.name != phase);
        }
    }
    // if (slowPlayers.length == 0) {
    //     tokenActors = tokenActors.filter((actor) => actor.name != "slowPlayers");
    // }
    // if (fastPlayers.length == 0) {
    //     tokenActors = tokenActors.filter((actor) => actor.name != "fastPlayers");
    // }
    // if (npcAllies.length == 0) {
    //     tokenActors = tokenActors.filter((actor) => actor.name != "npcAllies");
    // }
    // if (enemies.length == 0) {
    //     tokenActors = tokenActors.filter((actor) => actor.name != "enemies");
    // }
    tokenData = tokenActors.map((actor) => actor.data.token);
    //create all of the tokens in the scene, then add them as combatants

    await addRepCombatant(combat, tokenData);
}

async function addRepCombatant(combat, tokenData) {
    game.scenes.viewed.createEmbeddedDocuments("Token", tokenData);
    let combatants = await combat.createEmbeddedDocuments("Combatant", tokenData);
    return combatants;
}
async function removeRepCombatant(combat, tokenData) {
    game.scenes.viewed.deleteEmbeddedDocuments("Token", tokenData);
    await combat.deleteEmbeddedDocuments("Combatant", tokenData);
}

async function setRepTokenInitiative(combat) {
    //set initiative to preset initiative
    for (let combatant of combat.turns) {
        await combat.setInitiative(
            combatant.id,
            phasesWithInitiative[combatant.data.name]
        );
    }
}

let refreshed = false;

Hooks.on("updateCombat", async (combat, roundData, diff) => {
    if (combat.current.round > combat.previous.round) {
        //if it's a new round
        game.combatHud.app.resetActivations();
    }
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
        let name = combat.combatant.name;
        game.combatHud.app.data.currentPhase = `${name}`;
        // if (name == "FastPlayer") {
        //     game.combatHud.app.data.currentPhase = "fastPlayersTurn";
        // } else if (name == "Enemies") {
        //     game.combatHud.app.data.currentPhase = "enemiesTurn";
        // } else if (name == "SlowPlayer") {
        //     game.combatHud.app.data.currentPhase = "slowPlayersTurn";
        // } else if (name == "NPCAllies") {
        //     game.combatHud.app.data.currentPhase = "npcAlliesTurn";
        // }
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
                token.name == "enemies" ||
                token.name == "fastPlayers" ||
                token.name == "npcAllies" ||
                token.name == "slowPlayers"
            ) {
                tokensToDelete.push(token.id);
            }
        });
        //delete the ones that match
        scene.deleteEmbeddedDocuments("Token", tokensToDelete);
    }
    game.combatHud.app.data.inCombat = false;
    game.combatHud.app.data.currentPhase = "fastPlayers";
});

/**
 * Creates a PIXI.Container -- destroying previous one 1st if already exists--, adds sprite
 * or graphic to it depending on if token has acted or not.
 * @param {token} token - the token we're placing the marker upon
 * @param {*} hasActed - whether or not the token has acted or not
 */
function createMarkerOnToken(token, hasActed) {
    console.log("Trying to create marker on", token);
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

    console.log("Pixi stuff:", token, token.icon);
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
    if (game.combatHud.app) {
        //re-render combat hud when switching scenes
        game.combatHud.app.render(true);
    }
    if (game.combatHud.app && game.combatHud.initialSceneId) {
        //re-render combat hud when switching scenes to account for markers
        // game.combatHud.app.render(true);
        //TODO: put back in after markers are fixed
        // if (canvas.scene.data._id == game.combatHud.initialSceneId) {
        //     console.log("Switching back to original scene");
        //     //back on the original scene, start to highlight everything again
        //     if (game.combatHud.app.element) {
        //         let combatantDivs = game.combatHud.app.element.find(".combatant-div");
        //         for (let combatantDiv of combatantDivs) {
        //             if (!combatantDiv.classList.contains("activated")) {
        //                 createMarkerOnToken(combatantDiv.dataset.id, false);
        //             } else {
        //                 createMarkerOnToken(combatantDiv.dataset.id, true);
        //             }
        //         }
        //     }
        // }
    }
});
Hooks.on("canvasInit", (canvas) => {
    //we're trying to get the scene where the combat started
    //TODO: Put back in after marker is fixed
    // if (game.combatHud.app && game.combatHud.initialSceneId) {
    //     //if we've switched scenes from the initial combat scene
    //     if (canvas.scene.data._id != game.combatHud.initialSceneId) {
    //         console.log("Switching to different scene");
    //         //if we have the ticker functions
    //         if (game.combatHud.functions) {
    //             for (let tokenId in game.combatHud.functions) {
    //                 canvas.app.ticker.remove(game.combatHud.functions[tokenId], tokenId);
    //             }
    //         }
    //     }
    //     // if we're back on the original scene
    // }
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

function convertToArrayOfActors(array) {
    if (!array) {
        return;
    }
    return array.map((actorId) => {
        return game.actors.get(actorId);
    });
}
/**
 * @param Combat!
 */
export default class CombatHud extends Application {
    async initOnCombatStart(combat) {
        this.data.isGM = game.user.isGM;
        this.data.combatStarter = game.userId;
        this.data.ourCombat = combat;
        this.data.inCombat = true;
        this.data.initialized = true;

        let phasesWithActors = {};
        this.data.initialTokens = new Map();
        this.data.initialScenes = new Map();

        //convert all the stored IDs into actors
        for (let phase in phasesWithActorIDs) {
            phasesWithActors[phase] = convertToArrayOfActors(phasesWithActorIDs[phase]);
        }
        const allActorsInCombat = Object.values(phasesWithActors).flat();

        //set initial scene and initial token of each actor
        for (let actor of allActorsInCombat) {
            this.setInitialTokenAndScene(actor);
        }
        this.data.initialTokens = Object.fromEntries(this.data.initialTokens);
        this.data.initialScenes = Object.fromEntries(this.data.initialScenes);

        this.data.currentRound = ourCombat.current.round;
        //if we have no fast players
        if (phasesWithActors.fastPlayers?.length == 0) {
            //set the first turn to enemies
            this.data.currentPhase = "enemies";
        } else {
            //otherwise, if we have no enemies, we should always have fast players, as there were no enemies to compare to
            this.data.currentPhase = "fastPlayers";
        }

        this.data.activationObject = new ActivationObject(
            {},
            phasesWithActors.fastPlayers,
            phasesWithActors.slowPlayers,
            phasesWithActors.enemies,
            phasesWithActors.npcAllies
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

    setInitialTokenAndScene(actor) {
        //initial tokens needs to be set to the initial token on this scene
        this.data.initialTokens.set(
            actor.id,
            HelperFunctions.getSceneTokenFromActor(actor).id
        );
        //initial scenes needs to be set to the initial scene
        this.data.initialScenes.set(actor.id, game.scenes.viewed.id);
    }

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
            currentPhase: "fastPlayers",
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
        // createMarkerOnToken(token)
        let token = game.canvas.tokens.placeables.find((token) => token.id == tokenId);
        if (game.user.isGM && token) {
            createMarkerOnToken(token, hasActed);
        }
    }

    setTokenHasActed(elementId, userId, hasActed) {
        if (!game.combatHud.app.checkIfUserIsActorOwner(elementId, userId)) {
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
        //*maybe re-render the combat too?
        let allActed = true;
        for (let mapItem in map) {
            if (!map[mapItem]) {
                allActed = false;
            }
        }
        //if none are false, all of them have acted, so go to the next
        //turn and reset the activations
        if (allActed) {
            //switch to the next turn, reset all the activations, unhighlight all of the tokens, and re-render the hud
            await game.combatHud.app.data.ourCombat.nextTurn();
            //TODO: Maybe put this back in
            // game.combatHud.app.resetActivations();
            //TODO: put this back in after you've fixed markers
            // game.combatHud.app.unhighlightAll(game.canvas.tokens.placeables);
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
                return convertToArrayOfActors(Object.keys(obj));
            }
        );
        let allCombatActors = tokenMap.flat();
        console.log("Combat actors are", allCombatActors);
        for (let actor of allCombatActors) {
        }

        let tokens = {
            fastPlayers: tokenMap[0],
            slowPlayers: tokenMap[1],
            enemies: tokenMap[2],
            npcAllies: tokenMap[3],
        };

        return {
            ...this.data,
            tokens: tokens,
            // ...tokens,
        };
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
        event.preventDefault();
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
            case "nextTurn":
                await this.data.ourCombat.nextTurn();
                game.combatHud.app.render(game.combatHud.app.position);
                break;
            case "previousTurn":
                await this.data.ourCombat.previousTurn();
                game.combatHud.app.render(game.combatHud.app.position);
                break;
            case "addCombatant":
                let tokens = game.canvas.tokens.controlled;
                let newPhases = [];
                //nothing selected
                //TODO: maybe gray it out and only show it when token is selected
                if (tokens.length == 0) {
                    return;
                }
                tokens.forEach((token) => {
                    console.log("adding token to combat " + token.name);
                    let newPhase = this.addCombatant(token);
                    if (!newPhases.includes(newPhase)) {
                        newPhases.push(newPhase);
                    }
                });
                //if we don't have a token or combatant in the combat representing this,
                //create one
                //map the names of the current combatants
                let combatantNames = this.data.ourCombat.combatants.map((combatant) => {
                    return combatant.data.name;
                });

                let tokenData = [];

                for (let phase of newPhases) {
                    //if our added phases aren't already on the tracker
                    if (!combatantNames.includes(phase)) {
                        //so the combatant wants token data
                        //so we want to get the representative actor associated with this phase
                        let actor = game.folders
                            .getName("RepTokens")
                            .content.find((actor) => actor.name === phase);
                        //push it to an array of token data
                        tokenData.push(actor.data.token);
                    }
                }
                //add all the token data to the combat
                if (tokenData.length > 0) {
                    let combatants = await addRepCombatant(
                        this.data.ourCombat,
                        tokenData
                    );
                    //set their initiative
                    for (let combatant of combatants) {
                        this.data.ourCombat.setInitiative(
                            combatant.id,
                            phasesWithInitiative[combatant.data.name]
                        );
                    }
                    this.render(true);
                }
                break;
            default:
                break;
        }
    }

    async activateListeners(html) {
        if (game.user.isGM && this.data.combatStarter === game.userId) {
            await game.settings.set("hud-and-trackers", "savedCombat", this.data);
        }

        //remove app from "ui.windows" to not let it close with the escape key
        delete ui.windows[this.appId];

        let windowContent = html.closest(".window-content");
        let combatantDivs = windowContent.find(".combatant-div");
        let scene = game.scenes.viewed;

        windowContent.off("click", "[data-action]");
        windowContent.on("click", "[data-action]", this._onHandleButtonClick.bind(this));

        //check if in combat
        if (this.data.inCombat) {
            //store the initial token and scene ids on the combatant div
            for (let key in this.data.initialTokens) {
                let value = this.data.initialTokens[key];
                $(`[data-id=${key}]`).attr("data-initial-token-id", value);
            }
            for (let key in this.data.initialScenes) {
                let value = this.data.initialScenes[key];
                $(`[data-id=${key}]`).attr("data-initial-scene-id", value);
            }

            for (let combatantDiv of combatantDivs) {
                //get the token, either on the current scene,
                //or the initial scene where the token was created
                let token = HelperFunctions.checkIfSceneHasToken(
                    combatantDiv.dataset.id,
                    combatantDiv.dataset.initialTokenId,
                    combatantDiv.dataset.initialSceneId
                );

                if (token) {
                    //TODO: put this back in after you get it working
                    //TODO: maybe make separate branch
                    //?token document and token object are different
                    // if (!combatantDiv.classList.contains("activated")) {
                    //     // this.highlightTokenInGroup(token.id, false);
                    //     createMarkerOnToken(token.object, false);
                    // } else {
                    //     createMarkerOnToken(token.object, true);
                    //     // this.highlightTokenInGroup(token.id, true);
                    // }
                    //TODO: put this back in
                    // $(combatantDiv).mouseenter((event) => {
                    //     this.tintMarkerOnToken(token.object, 0xff5733);
                    // });
                    // $(combatantDiv).mouseleave((event) => {
                    //     this.tintMarkerOnToken(token.object, 0xffffff);
                    // });
                }

                $(combatantDiv).mousedown((event) => {
                    let elementId = event.currentTarget.dataset.id;
                    let tokenId = event.currentTarget.dataset.tokenId;
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
                            let token = HelperFunctions.checkIfSceneHasToken(
                                combatantDiv.dataset.id,
                                combatantDiv.dataset.initialTokenId,
                                combatantDiv.dataset.initialSceneId
                            );
                            console.log("Trying to control ", token);
                            if (token) {
                                token.object.control({
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
                            //TODO: take this out until fixed, maybe make branch to test
                            // createMarkerOnToken(token.object, true);
                        }
                    }
                }
            }
        }

        //send the data once all the GM's stuff has been activated
        if (game.user.isGM && this.data.combatStarter === game.userId) {
            this.shareApp();
        }
    }

    /**
     * Adds a selected token to the combat. Maybe add other ways later.
     * @param {Token} token - the selected token we're adding to the combat
     */
    addCombatant(token) {
        let type = token.actor.type;
        let disposition = token.data.disposition;
        // let id = token.actor.id; //TODO: Using actor id might be best in the long run anyway
        let id = token.actor.id;
        let phase = "enemies";
        switch (type) {
            case "NPC":
            case "Companion":
                if (disposition == 0 || disposition == 1) {
                    phase = "npcAllies";
                } else {
                    phase = "enemies";
                }
                break;
            case "PC":
                phase = "slowPlayers";
                break;
        }
        this.data.activationObject.activationMap[`${phase}`][id] = false;
        return phase;
    }
    removeCombatant(token) {}

    addRepCombatant(phase) {
        this.data.ourCombat.createCombatant(phase);
    }
    isPhaseEmpty(phase) {
        if (Object.keys(phase).length == 0) {
            return true;
        }
        return false;
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

    checkIfUserIsActorOwner(actorId, userId) {
        let actor = game.actors.get(actorId);
        let permission = actor.data.permission[userId];
        if (permission == 3) {
            return true;
        } else {
            return false;
        }
    }

    shareApp() {
        console.log("Should be sharing app");
        socket.executeForOthers("receiveDataAndUpdate", this.data);
    }

    updateApp(data) {
        this.data = data;
        game.combatHud.app.render(game.combatHud.app.position);
    }

    receiveDataAndUpdate(data) {
        console.log("Should be receiving data");
        //update the data
        game.combatHud.app.data = { ...data };
        //re-create the activation object
        game.combatHud.app.data.activationObject = new ActivationObject({
            ...data.activationObject.activationMap,
        });

        //re-render the app
        game.combatHud.app.render(game.combatHud.app.position);
    }
}
