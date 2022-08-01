import * as HelperFunctions from "./helper-functions.js";

Hooks.on("ready", () => {
    game.customPlayerList = new CustomPlayerlist().render(true);
});

//on scene switch
Hooks.on("canvasReady", async (canvas) => {
    console.log(canvas);
    if (game.user.isGM) {
        if (!game.customPlayerList) {
            return;
        }
        game.customPlayerList.otherCharacters = await HelperFunctions.getAllActorsInScene();
        game.customPlayerList.render();
    }
});
/** only toggle the hide class and set the player list stuff once */
Hooks.on("renderPlayerList", async (playerList, html) => {
    game.defaultPlayerList = playerList;

    //hide the default list off screen
    playerList.element.addClass("hide-off-screen");

    //get the height of the player list
    let plHeight = playerList.element[0].clientHeight;
    let plBottom = window.getComputedStyle(game.defaultPlayerList.element[0]).marginBottom;
    //add CSS custom properties to the root element so that we can shift the custom player list upward and out of the way when we want to view the default one
    let rootElement = document.documentElement;
    rootElement.style.setProperty("--playerlist-height", plHeight + "px");
    rootElement.style.setProperty("--playerlist-bottom", plBottom);
});

Hooks.on("renderPlayerList", async (playerList, html) => {
    if (game.customPlayerList) {
        game.customPlayerList.render();
        // game.customPlayerList.element.addClass("draggable");
    }
});

Hooks.on("controlToken", async (token, isControlled) => {
    let ourToken = token;

    //if we're a player, highlight our selected token even if it's not our current PC
    //if it is current PC, highlight its portrait too
    highlightCharacterPortrait(token, isControlled);
    // if (!game.user.isGM) {
    //     highlightCharacterPortrait(token, isControlled);
    // } else {
    //     showSelectedToken(token, isControlled);
    // }
});
function showSelectedToken(token, isControlled) {}
function showTokensInScene(token, isControlled) {}
function highlightCharacterPortrait(token, isControlled) {
    if (!game.customPlayerList) {
        return;
    }
    let playerList = game.customPlayerList.element;
    let currentPCArea = playerList.find(".current-character");
    if (token.actor.id === $(".current-character img").data().pcid && isControlled) {
        currentPCArea.addClass("selected");
    } else {
        currentPCArea.removeClass("selected");
        //if we selected one of our secondaries, add the selected class to them
        //or remove it if "isControlled" is false
        let secondaryCharacterString = `.current-character .otherCharacters .secondary-character[data-pcid="${token.actor.id}"]`;
        if (isControlled) {
            $(secondaryCharacterString).addClass("selected");
        } else {
            $(secondaryCharacterString).removeClass("selected");
        }
    }
}
export class CustomPlayerlist extends Application {
    constructor(data = {}) {
        super();
        this.data = data;
    }

    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            classes: ["hud-and-trackers"],
            resizeable: false,
            popOut: false,
            template: `modules/hud-and-trackers/templates/party-overview/custom_playerlist.hbs`,
            id: "custom_playerlist",
            title: "Custom Playerlist",
        });
    }

    async getData() {
        let user = game.user;
        let activeUsers = await HelperFunctions.getActiveUsers();
        let currentPC = user.character;

        //if there is a character token that's controlled, get its actor to store in controlled character
        //making this dummy object for situations in which no controlled token but still want to compare controlled char to something else
        let controlledCharacter = { id: "", name: "null" };
        if (game.canvas.tokens.controlled[0]) {
            controlledCharacter = await HelperFunctions.getActorFromToken(game.canvas.tokens.controlled[0]);
        }

        let otherCharacters;
        if (!game.user.isGM) {
            //get all the users actors (ones they have permission to control basically)
            otherCharacters = await HelperFunctions.getAllUserActors(user);
            //only get the secondary characters to store, filter out currentPC;
            otherCharacters = otherCharacters.filter((char) => {
                return char.id !== currentPC.id;
            });
        } else {
            //for the GM, have the other characters be the NPCs in the scene
            otherCharacters = await HelperFunctions.getAllActorsInScene();
            otherCharacters = otherCharacters
                .filter((char) => {
                    //filter out the PCs
                    return char.type == "NPC" || char.type == "Companion";
                })
                .filter((char) => {
                    //filter out current selected
                    return char.id !== currentPC.id;
                });
        }

        return {
            user: game.user,
            currentPC: currentPC,
            activeUsers: activeUsers,
            controlledCharacter: controlledCharacter,
            otherCharacters: otherCharacters,
            isGM: game.user.isGM,
        };
    }

    async _handleButtonClick(event) {
        let el = $(event.currentTarget);
        let action = el.data().action;
        switch (action) {
            case "toggle-player-list":
                if (game.defaultPlayerList.element.hasClass("bring-on-screen")) {
                    game.defaultPlayerList.element.removeClass("bring-on-screen");
                    game.customPlayerList.element.removeClass("slide-up");
                } else {
                    game.defaultPlayerList.element.addClass("bring-on-screen");
                    game.customPlayerList.element.addClass("slide-up");
                }
        }
    }

    activateListeners(html) {
        //remove app from "ui.windows" to not let it close with the escape key
        delete ui.windows[this.appId];
        super.activateListeners(html);
        html.on("click", "img", async (event) => {
            event.preventDefault();
            event.stopPropagation();
            let element = $(event.currentTarget);
            let id = element.data().pcid;
            if (game.user.character.id != id) {
                //TODO: update CSS on click
                await HelperFunctions.swapToCharacter(game.actors.get(id));
                this.render();
            } else {
                HelperFunctions.selectMyCharacter();
                //maybe like left click to open sheet, right click to
            }
            // this.render();
        });
        html.on("contextmenu", "img", async (event) => {
            event.preventDefault();
            event.stopPropagation();
            let element = $(event.currentTarget);
            let id = element.data().pcid;
            game.actors.get(id).sheet.render(true);
        });
        html.on("click", "[data-action]", this._handleButtonClick.bind(this));
    }

    async _updateObject(event, formData) {}
}
