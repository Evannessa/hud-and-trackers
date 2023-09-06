import { HelperFunctions as HF } from "./helper-functions.js";

const phaseActions = {
    change: {
        changePhase: {
            handler: async (event, currentTarget, options = {}) => {
                const PM = PhaseManager
                const phase = currentTarget.value
                await PM.changePhase(phase)
                await game.phaseHandlerApp.render(true) //TODO: re-render this using sockets
            },
            type: ["global"]
        }

    }
}
const phases = {
    downtime: {
        name: "Downtime"
    },
    expedition: {
        name: "Expedition"
    },
    freeplay: {
        name: "Freeplay"
    }

}
export class PhaseHandlerApp extends Application {
    constructor(data) {
        super();
        this.data = data;
    }

    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            classes: ['form'],
            popOut: true,
            resizable: true,
            minimizeable: true,
            width: "600",
            template: `modules/hud-and-trackers/templates/outpost-sheet/phase-app.hbs`,
            id: 'phase-app',
            title: 'Game Phase',
        });
    }

    async getData() {
        const PM = PhaseManager
        // Send data to the template
        const currentPhase = await PM.getPhase()



        return {
            phases: phases,
            currentPhase: currentPhase,
            isGM: game.user.isGM,
        }
    }

    async activateListeners(html) {
        super.activateListeners(html);
        await HF.addActionListeners(html, phaseActions)

    }




}
export class PhaseManager {

    static async changePhase(phase) {
        await HF.setSettingValue("gamePhase", phase, "currentPhase")
    }
    static async getPhase() {
        const phase = await HF.getSettingValue("gamePhase", "currentPhase")
        return phase
    }



}
const expeditionTypes = {
    trek: {
        name: "Trek",
        description: "Get From Point A to Point B"
    },
    dungeonCrawl: {
        name: "Dungeon Crawl",
        description: "Explore caves, monster lairs, etc."
    },
    largeScale: {
        name: "Large Scale Conflict",
        subTypes: [
            "Defense",
            "Siege",
            "Trial",
            "Pit Fight",
            "Sports",
        ]

    },
    intrigue: {
        name: "Intrigue and Investigation",
        subTypes: [
            "Infiltrations",
            "Extractions",
            "Masquerades",
            "Hunts",
            "Chases",
            "Negotiations"
        ]
    }



}
