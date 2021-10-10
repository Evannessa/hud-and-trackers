/**
 *
 */
class CombatHudObject {
    static phases = ["fastPlayers", "slowPlayers", "enemies", "npcAllies"];

    //**This will return a big list of ALL the combatants */
    static get allActivations() {
        const allActivations =
            ((accumulator, phaseName) => {
                const phaseActivations = this.getActivationsFromPhase(phaseName);

                return {
                    ...accumulator,
                    ...phaseActivations,
                };
            },
            {});
        return allActivations;
    }

    /**
     * This will get the combatants depending on what phase they're in
     */
    static getActivationsFromPhase(phaseName) {
        return activationObject[phaseName];
        //
    }

    static retrieveCombatData() {
        return game.settings.get("hud-and-trackers", "savedCombat");
    }
    static setCombatData(data) {
        return game.settings.set("hud-and-trackers", "savedCombat", data);
    }
    static setTokenHasActed(token, hasActed) {
        //update the activation object
        const relevantActivation = this.allActivations[token.id];

        const update = {
            [tokenId]: hasActed,
        };

        let savedCombat = game.settings.get("hud-and-trackers", "savedCombat");
        // let updatedCombat = {
        // 	...savedCombat,
        // 	activationObject: {
        // 		...savedCombat.activationObject,
        // 		[token.id]:
        // 	}
        // }
        let activationObject = game.settings.get(
            "hud-and-trackers",
            "savedCombat"
        ).activationObject;
        // let updatedActivationObject = object.

        return game.settings.set("hud-and-trackers", "savedCombat");
    }

    static addNewCombatant(token) {
        //add new combatant
        const newCombatant = {
            id: token.id,
        };
        const updatedCombatants = {
            [newCombatant.id]: newCombatant,
        };
        return game.settings.set("hud-and-trackers", "savedCombat", updatedCombatants);
    }

    static returnType(token) {
        if (token.actor.type == "PC") {
            return "slowPlayers";
        } else {
            if (token.data.disposition == -1) {
                return "enemies";
            } else if (token.data.disposition == 1) {
                return "NPCAllies";
            }
        }
    }

    static resetCombat() {
        //reset to default data
    }

    static ID = "hud-and-trackers";
    static FLAGS = {
        COMBATHUD: "combathud",
    };
    static TEMPLATES = {
        COMBATHUDTEMPLATE: `modules/${this.ID}/templates/combat-hud.html`,
    };
}
Hooks.once("devModeReady", ({ registerPackageDebugFlag }) => {
    registerPackageDebugFlag(ToDoList.ID);
});
