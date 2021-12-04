import * as HelperFunctions from "./helper-functions.js";

Hooks.on("ready", () => {
    game.customPlayerList = new CustomPlayerlist().render(true);
});
Hooks.on("renderPlayerList", async (playerList, html) => {
    // const loggedInUserListItem = html.find(`[data-user-id="${game.userId}"]`);
    // const tpl = "modules/hud-and-trackers/templates/party-overview/pc-playerlist.hbs";
    // let actors = await HelperFunctions.getAllUserActors(game.user);
    // let data = {
    //     isGM: game.user.isGM,
    //     PCs: actors,
    //     currentPC: game.user.character.id,
    // };
    // const myHtml = await renderTemplate(tpl, data);
    // loggedInUserListItem.append(myHtml);
    // //when clicked, get the id of the clicked portrait, and the character
    // //then swap them
    // html.on('click')
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
        console.log(controlledCharacter.id);
        console.log(controlledCharacter.name + " is controlled");

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
    }

    async _updateObject(event, formData) {}
}
