import * as HelperFunctions from "./helper-functions.js";

Hooks.on("ready", () => {
    // game.dicePool = new AmbientDicePool().render(true);
    // game.ambientRollPrompt = new PromptAmbientRoll().render(true);
    // var originalAllInOne = game.cyphersystem.allInOneRollMacro;
    // game.cyphersystem.allInOneRollDialog = function(actor, title, info, cost, pool, modifier, teen){
});

Hooks.on("renderDialog", (app, html) => {
    if (app.data.title === "All-in-One Roll") {
        let button = $("<button style='width: 30%'>Ambient Roll</button>");
        button.click((event) => {
            game.ambientRollPrompt = new PromptAmbientRoll().render(true);
        });
        app._element.find(".dialog-content").prepend(button);
        app._element.height("max-content");
    }
});

async function setUserRollMode(rollMode) {
    ui.notifications.notify(`Your roll mode is set to ${rollMode}`);
    await game.settings.set("core", "rollMode", rollMode);
}
Hooks.on("renderSidebarTab", (app, html) => {
    if (app.options.id == "chat") {
        let button = $("<button style='margin-bottom: 10px'>Ambient Roll</button>");
        button.click((event) => {
            game.ambientRollPrompt = new PromptAmbientRoll().render(true);
        });
        html.find("#chat-controls").prepend(button);
    }
});

Hooks.on("preCreateChatMessage", (msg, options, userId) => {});
Hooks.on("createChatMessage", (data, data1, data2) => {
    // data._element.find(".ambient-div");
});

//TODO: Make this check the previous rolls
function checkPreviousRolls() {
    let diceToCheck = 20;
    let chatLog = game.messages;

    //TODO: maybe only consider the ones from specific user too
    //turn chatLog into an array, and only consider the last 10 rolls
    chatLog = Array.from(chatLog).slice(-10);

    let rolls = 0;
    let total = 0;
    chatLog = chatLog.filter((entry) => {
        return entry.data.blind == true;
    });

    //? How to handle rerolls?
    let lastEntry = chatLog.pop();
    return lastEntry;
}

Hooks.on("closeApplication", (app, html) => {
    if (app.id === "ambient-prompt") {
        console.log("closing ambient prompt!");
        //set the roll mode back to normal
        setUserRollMode("roll");
    }
});

/**
 * Define your class that extends FormApplication
 */
export class PromptAmbientRoll extends FormApplication {
    constructor() {
        setUserRollMode("blindroll");
        super();
    }

    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            classes: ["form", "hud-and-trackers"],
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

    async _updateObject(event, formData) {}
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
            boonNumber: 1,
            baneNumber: 1,
            appliedBoons: [],
            appliedBanes: [],
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
            classes: ["form", "hud-and-trackers"],
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
            //add the new number that's going to show for the boon and bane number
            let newNumber = this.data[`${which}s`][button.name];
            newNumber += changeBy;

            //make sure it doesn't go less than 0
            if (newNumber <= 0) {
                newNumber = 0;
            }

            //add the new number that's going to show above the boon and bane category
            this.data[`${which}s`][button.name] = newNumber;

            //make sure it doesn't go less than zero
            this.data[`${which}Number`] += changeBy;
            if (this.data[`${which}Number`] <= 1) {
                this.data[`${which}Number`] = 1;
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
                button.append(`<div class="displayNumber">${number}</div>`);
            }
        }
    }
    getBoonBaneTotals(which) {
        let string = ``;
        for (let b in this.data[`${which}s`]) {
            let number = this.data[`${which}s`][b];
            if (number > 0) {
                string += `<li> ${number} ${which}(s) from ${b}</li>`;
            }
        }
        return string;
    }

    activateListeners(html) {
        super.activateListeners(html);

        //find all boons and banes and update their data
        this.handleBoonBaneNumbers("boon");
        this.handleBoonBaneNumbers("bane");

        this.handleBoonBaneButtons("boon");
        this.handleBoonBaneButtons("bane");
        html.on("click", "[data-action]", this.rollBoonsAndBanes.bind(this));
    }

    async rollBoonsAndBanes() {
        let boonString = this.getBoonBaneTotals("boon");
        let baneString = this.getBoonBaneTotals("bane");

        let rollValue = $("#ambient-dice-pool .rollValue").val();
        let ambientRoll = await new Roll(rollValue).evaluate({ async: true });

        // console.log(ambientRoll);
        // console.log(ambientRoll.dice.map((dice) => dice.results));

        //add strings for the individual rolls for the boons and banes
        let boonBaneResultString = "<span class='boonSpan'> Boons: ";
        ambientRoll.terms.forEach((term) => {
            if (term.number) {
                boonBaneResultString += "<span class='boonBane'>" + term.number + "</span>";
                // for (let o of term.results) {
                //     boonBaneResultString +=
                //         "<span class='boonBane'>" + o.result + "</span>";
                // }
            }
            if (term.operator) {
                boonBaneResultString += "</span> " + term.operator + " <span class='baneSpan'>Banes: ";
            }
        });
        boonBaneResultString += "</span>";
        let skillRoll = checkPreviousRolls();
        let ambientResult = ambientRoll._total;

        let flavor = skillRoll.flavor;
        flavor += `<div class="ambient-div"><h3 style='font-weight: bold'>Boons & Banes Result</h3>
		<div style='font-size: 0.85rem; margin-bottom: 0.25rem'>${
            boonString + baneString
        }<li style="margin-top: 0.2rem">${boonBaneResultString}</li>
		<li style='margin-top: 0.2rem'><span style='font-weight: bold' class='ambientTotal'>Ambient Roll Total</span>: <span class='ambientResult'>${ambientResult} </span></li></div>`;

        if (ambientResult <= 0) {
            flavor +=
                "<div style='font-size: 1rem'><span style='color: #fe4a49'>Banes win.</span> Mixed Success or Failure</div>";
        } else {
            flavor +=
                "<div style='font-size: 1rem'><span style='color:turquoise'>Boons win!</span> Triumph or Mercy</div>";
        }
        flavor += `</div>`;
        console.log(skillRoll);

        skillRoll.rolls[0].toMessage({
            flavor: flavor,
        });
    }

    async _updateObject(event, formData) {}
}

window.AmbientDicePool = AmbientDicePool;
