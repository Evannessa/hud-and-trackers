/**
 * Define your class that extends FormApplication
 */
Hooks.on("ready", () => {
    game.dicePool = new AmbientDicePool().render(true);
});
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
        console.log(`#ambient-dice-pool .${which}Div button[data-number]`);
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
    }

    async _updateObject(event, formData) {
        console.log(formData.exampleInput);
    }
}

window.AmbientDicePool = AmbientDicePool;
