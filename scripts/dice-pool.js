import * as HelperFunctions from "./helper-functions.js";

Hooks.on("ready", () => {
    // game.dicePool = new AmbientDicePool().render(true);
    game.ambientRollPrompt = new PromptAmbientRoll().render(true);
});

async function setUserRollMode(rollMode) {
    ui.notifications.notify(`Your roll mode is set to ${rollMode}`);
    await game.settings.set("core", "rollMode", rollMode);
}

Hooks.on("preCreateChatMessage", (msg, options, userId) => {});
Hooks.on("createChatMessage", (data, data1, data2) => {
    console.log(data, data1, data2);
});

//TODO: Make this check the previous rolls
function checkPreviousRolls() {
    const input = html.find("#diceFacesToCheck").val();
    const diceToCheck = input ? parseInt(input) : 20;
    const chatLog = game.messages;
    let rolls = 0;
    let total = 0;

    chatLog.forEach((entry) => {
        const { terms } = entry._roll;
        terms
            .filter((die) => die.faces === diceToCheck)
            .forEach((die) => {
                rolls = rolls + die.number;
                total = total + die.total;
            });
    });
}

/**
 * Define your class that extends FormApplication
 */
class PromptAmbientRoll extends FormApplication {
    constructor() {
        setUserRollMode("blindroll");
        super();
    }

    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            classes: ["form"],
            popOut: true,
            template: `modules/hud-and-trackers/templates/dice-pool/ambient-prompt.hbs`,
            id: "ambient-prompt",
            title: "Prompt Ambient Roll",
        });
    }

    getData() {
        return {};
    }

    activateListeners(html) {
        super.activateListeners(html);
        html.on("click", "[data-action]", this.handleButtonClick.bind(this));
    }

    async handleButtonClick(event) {
        let clickedElement = $(event.currentTarget); //this will return the form itself?
        let action = clickedElement.data().action;
        switch (action) {
            case "addBnB": {
                game.dicePool = new AmbientDicePool().render(true);
                break;
            }
            case "selectCharacter": {
                event.preventDefault();
                await HelperFunctions.selectMyCharacter();
                break;
            }
            case "swapCharacter": {
                event.preventDefault();
                await HelperFunctions.callMacro("Swap-Characters");
                break;
            }
            case "defaultAllInOne": {
                event.preventDefault();
                await HelperFunctions.callMacro("All-in-One Roll");
                break;
            }
            case "openSheet": {
                event.preventDefault();
                let actor = HelperFunctions.getActorFromUser(game.user);
                actor.sheet.render(true);
                break;
            }
        }
    }

    async _updateObject(event, formData) {
        console.log(formData.exampleInput);
    }
}

export class AmbientDicePool extends FormApplication {
    constructor(poolData = {}) {
        super(poolData);
        this.data = poolData;
        //if the object is empty, initialize it
        if (Object.keys(this.data).length == 0) {
            this.data = this.initializeData();
        }
    }

    initializeData() {
        setUserRollMode("roll");
        return {
            boonNumber: 0,
            baneNumber: 0,
            // rollValue: "0d6-0d6",
            boons: {
                approach: 0,
                bonds: 0,
                conditions: 0,
                tools: 0,
                environment: 0,
            },
            banes: {
                approach: 0,
                bonds: 0,
                conditions: 0,
                tools: 0,
                environment: 0,
            },
        };
    }

    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            classes: ["form"],
            popOut: true,
            template: `modules/hud-and-trackers/templates/dice-pool/dice-pool.hbs`,
            id: "ambient-dice-pool",
            title: "Ambient Dice Pool",
        });
    }

    getData() {
        // Send data to the template
        return {
            data: this.data,
        };
    }

    handleBoonBaneButtons(which) {
        $(`#ambient-dice-pool .${which}Div button[data-number]`).mousedown((event) => {
            event.preventDefault();
            let button = event.currentTarget;
            let changeBy = 1;
            if (event.which === 3) {
                //right mouse button subtract instead
                changeBy = -1;
            }
            let newNumber = this.data[`${which}s`][button.name];
            newNumber += changeBy;

            //make sure it doesn't go less than zero
            if (newNumber <= 0) {
                newNumber = 0;
            }
            this.data[`${which}s`][button.name] = newNumber;

            //make sure it doesn't go less than zero
            this.data[`${which}Number`] += changeBy;
            if (this.data[`${which}Number`] <= 0) {
                this.data[`${which}Number`] = 0;
            }

            button.dataset.number = newNumber.toString();
            this.render();
        });
    }
    handleBoonBaneNumbers(which) {
        for (let b in this.data[`${which}s`]) {
            let number = this.data[`${which}s`][b];
            let button = $(`#ambient-dice-pool .${which}Div button[name='${b}']`);
            button.data("number", number);
            if (number > 0) {
                button.before(`<div class="displayNumber">${number}</div>`);
            }
        }
    }

    activateListeners(html) {
        super.activateListeners(html);

        //find all boons and banes and update their data
        this.handleBoonBaneNumbers("boon");
        this.handleBoonBaneNumbers("bane");
        // for (let boon in this.data.boons) {
        //     let number = this.data.boons[boon];
        //     let button = $(`#ambient-dice-pool button[name='${boon}']`);
        //     button.data("number", number);
        //     if (number > 0) {
        //         button.before(`<div class="displayNumber">${number}</div>`);
        //     }
        // }
        this.handleBoonBaneButtons("boon");
        this.handleBoonBaneButtons("bane");
        html.on("click", "[data-action]", this.rollBoonsAndBanes.bind(this));
    }

    async rollBoonsAndBanes() {
        let rollValue = $("#ambient-dice-pool .rollValue").val();
        let roll = await new Roll(rollValue).evaluate({ async: true });
        // let chatData = await r
        //     .toMessage({ flavor: "Rolling Boons and Banes" }, { create: false })
        //     .then((_chatData) => {
        //         let result = parseInt(_chatData.content);
        //         let winMessage = "Boons win";
        //         if (result < 0) {
        //             winMessage = "Banes win";
        //         }

        //         _chatData.flavor = `${winMessage} Result:(${result})`;
        //         // r.evaluate();
        //         ChatMessage.create(_chatData);
        //     });
        let flavor = ``;
        roll.toMessage({
            flavor: flavor,
        });
    }

    async _updateObject(event, formData) {}
}

window.AmbientDicePool = AmbientDicePool;
