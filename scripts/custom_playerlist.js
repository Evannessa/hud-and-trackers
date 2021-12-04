import * as HelperFunctions from "./helper-functions.js";

Hooks.on("ready", () => {
    game.customPlayerList = new CustomPlayerlist().render(true);
});

/** only toggle the hide class and set the player list stuff once */
Hooks.once("renderPlayerList", async (playerList, html) => {
    game.defaultPlayerList = playerList;
    playerList.element.addClass("visible");
    playerList.element.toggleClass("hide-off-screen");
});

//each time, prepend the hide button
Hooks.on("renderPlayerList", async (playerList, html) => {
    // game.defaultPlayerList = playerList;
    // playerList.element.toggleClass("hide-off-screen");
    playerList.element.prepend("<button data-action='hide'>Hide Player List</button>");
    html.on("click", "[data-action='hide']", (event) => {
        HelperFunctions.togglePlayerList();
    });
    document.body.style.setProperty("--playerlist-height", `${html.height()}px`);
    document.body.style.setProperty(
        "--playerlist-bottom",
        playerList.element.css("bottom")
    );
});

Hooks.on("controlToken", async (token, isControlled) => {
    let ourToken = token;
    if (game.customPlayerList) {
        game.customPlayerList.render(true);
    }
    // if (!isControlled) {
    //     if (game.canvas.tokens.controlled.length == 0) {
    //         setTimeout(() => {
    //             if (game.canvas.tokens.controlled.length == 0) {
    //                 if (game.customPlayerList) {
    //                     game.customPlayerList.render();
    //                 }
    //             }
    //         }, 250);
    //     }
    // } else if (isControlled) {
    //     //is current character controlled
    //     console.log(game.customPlayerList);
    //     if (game.customPlayerList) {
    //         game.customPlayerList.render();
    //     }
    //     if (game.canvas.tokens.controlled.length == 1) {
    //         //hud will only appear for the first token that was controlled
    //         // let tokenImg = game.canvas.tokens.controlled[0].actor.img;
    //     }
    // }
});
export class CustomPlayerlist extends Application {
    constructor(data = {}) {
        super();
        this.data = data;
    }

    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            resizeable: true,
            popOut: true,
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
            controlledCharacter = await HelperFunctions.getActorFromToken(
                game.canvas.tokens.controlled[0]
            );
        }

        //get all the users actors (ones they have permission to control basically)
        let otherCharacters = await HelperFunctions.getAllUserActors(user);
        //only get the secondary characters to store, filter out currentPC;
        otherCharacters = otherCharacters.filter((char) => {
            return char.id !== currentPC.id;
        });
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
                HelperFunctions.togglePlayerList();
                this.element.toggleClass("slide-up");
            // this.setPosition({"height": $(document).body.style.getProperty("--playerlist-height")});
            // console.log(this);
        }
    }

    activateListeners(html) {
        super.activateListeners(html);
        html.on("click", "img", async (event) => {
            event.preventDefault();
            event.stopPropagation();
            let element = $(event.currentTarget);
            let id = element.data().pcid;
            if (game.user.character.id != id) {
                await HelperFunctions.swapToCharacter(game.actors.get(id));
            } else {
                HelperFunctions.selectMyCharacter();
                //maybe like left click to open sheet, right click to
            }
            this.render();
        });
        html.on("click", "[data-action]", this._handleButtonClick.bind(this));
    }

    async _updateObject(event, formData) {}
}
