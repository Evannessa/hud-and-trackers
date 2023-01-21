import { HelperFunctions as HF } from "./helper-functions.js";
const outpostActions = {
    click: {
        addNewOutpost: {
            handler: (event, currentTarget, options = {}) => {
                outpostFactory("New Outpost")


            }
        },
        deleteOutpost: {
            handler: async (event, currentTarget, options = {}) => {

            }

        },
        sendChatMessage:
        {
            handler: async () => {
                await HF.createChatMessage(
                    {
                        content: "Hello [[RollTable.zKQV3n1BuxQuhKXp]]"
                    }
                )
            }
        },
        changeRating: {
            handler: async (event, currentTarget, options = {}) => {

                let ratingName = currentTarget.dataset.name//currentTarget.closest(".wrapper").dataset.name;
                let type = currentTarget.dataset.type
                // let poolName = currentTarget.closest(".wrapper").dataset.poolName;
                let outpostId = currentTarget.closest(".individual-outpost").getAttribute("id")
                // let _outpostData = await HF.getSettingValue("outpostData")
                let outpostData = await HF.getSettingValue("outpostData", `outposts.${outpostId}`)
                // let poolData = await HF.getSettingValue("outpostData", `outposts.${poolName}`)
                let changeBy = 1;
                if (event.which === 3) {
                    //right mouse button subtract instead
                    changeBy = -1;
                }
                let oldValue = type === "rating" ? outpostData.ratings[ratingName].value : outpostData.consequenceClocks[ratingName].value
                let newValue = oldValue + changeBy

                if (newValue < 0 || newValue > 9) {
                    return
                }
                let updateData = {}

                if (type === "rating") {
                    let newPoolValue = outpostData.pointPool - changeBy
                    if (newPoolValue < 0 || newPoolValue > 9) {
                        return
                    }
                    updateData = {
                        ...outpostData,
                        pointPool: newPoolValue,
                        ratings: {
                            ...outpostData.ratings,
                            [ratingName]: {
                                ...outpostData.ratings[ratingName],
                                value: newValue
                            }
                        }

                    }
                } else if (type === "clock") {

                    updateData = {
                        ...outpostData,
                        consequenceClocks: {
                            ...outpostData.consequenceClocks,
                            [ratingName]: {
                                ...outpostData.consequenceClocks[ratingName],
                                value: newValue
                            }
                        }

                    }
                }
                await HF.setSettingValue("outpostData", updateData, `outposts.${outpostId}`)

                await game.outpostSheet.render(true)


            }
        },
        rollRating: {
            handler: async (event, currentTarget, options = {}) => {
                const label = currentTarget.closest(".rating-container").querySelector("label")
                const rating = currentTarget.closest(".rating-container").querySelector("input[type='number']")
                let total = await HF.createRoll(rating.value, label.textContent)



            }
        },
        rollEach: {
            handler: async (event, currentTarget, options = {}) => {
                const OM = OutpostManager
                const ratings = Array.from(currentTarget.closest(".ratings-wrapper").querySelectorAll(".rating"))
                console.log(ratings)
                let minimumValue = 3, findHighest = false;
                if (currentTarget.dataset.type === "clock") {
                    minimumValue = 1
                    findHighest = true
                }

                const totals = await OM.rollRatings(ratings, minimumValue, findHighest)
                console.log(totals)
                if (totals.max) {
                    //TODO: Create private message to GM with maximum roll
                    let tableText = await OM.getRollTable(totals.max.name)
                    await OM.sendChatMessage({ content: `${totals.max.name} Rolled Highest. ${tableText}` })
                }
                // for (let rating of ratings) {
                //     const label = rating.closest(".wrapper").querySelector("label")
                //     if (rating.value >= 3) {
                //         //create a roll for each of these, with relevant output
                //         let total = await HF.createRoll(rating.value, label.textContent)
                //         totals.push({ name: rating.name, total: total })
                //     }
                // }

                // let max = HF.getMaxOrMin(totals, "max")
                // let min = HF.getMaxOrMin(totals, "min")
                // console.log("Our totals", totals, max, min)



            }

        },
        openSheet: {
            handler: async (event, currentTarget, options = {}) => {
                const actorId = currentTarget.dataset.actorId
                await game.actors.get(actorId).sheet.render(true)
            }
        }
    },
    change: {
        changePhase: {
            handler: async (event, currentTarget, options = {}) => {
                if (currentTarget.checked) {
                    await HF.setSettingValue("outpostData", currentTarget.value, `currentPhase`)
                    await game.outpostSheet.render(true)
                }

            }
        },
        selectOutpostSheet: {
            handler: async (event, currentTarget, options = {}) => {
                let outpostID = currentTarget.closest(".individual-outpost").getAttribute("id")
                let sheetID = currentTarget.value
                await HF.setSettingValue("outpostData", sheetID, `outposts.${outpostID}.linkedActorID`)
                await game.outpostSheet.render(true)





            }
        },
        changePool: {
            handler: (event, currentTarget, options = {}) => {
                let pool = currentTarget.closest(".outpost-container").querySelector("#pointPool")


            },
        }
    }
}
Hooks.on("ready", async () => {
    game.outpostSheet = new OutpostSheet()
    await game.outpostSheet.render()
    game.outpostManager = OutpostManager

    // game.downtimeSheet = new DowntimeSheet()
    // await game.downtimeSheet.render(true)
});

class OutpostManager {


    /**
     * Create dice pool with dice = to point in each rating & roll
     * @param {Array} ratingElements - an array of rating elements
     * @param {int} minimumValue - the minimal value in a rating for which we will roll
     * @param {boolean} findHighest - return highest roll
     */
    static async rollRatings(ratingElements, minimumValue = 3, findHighest = false) {
        const totals = []
        for (let rating of ratingElements) {
            const label = rating.closest(".wrapper").querySelector("label")
            if (rating.value >= minimumValue) {
                //create a roll for each of these, with relevant output
                // let total = await HF.createRoll(rating.value, label.textContent)
                let total = await OutpostManager.rollRating(rating.value, label.textContent)
                totals.push({ name: rating.name, total: total })
            }
        }
        let object = { totals }
        if (findHighest) {
            let max = HF.getMaxOrMin(totals, "max")
            object = { ...object, max }
        }
        return object
    }
    static async rollRating(value, flavor = "") {
        let total = await HF.createRoll(value, flavor)
        return total;
    }
    static async createNewOutpost() {
        const innerData = outpostFactory("New Outpost")
        const newID = foundry.utils.randomID()
        const outposts = await HF.getSettingValue("outpostData", "outposts")
        const updateData = {
            ...outposts,
            [newID]: innerData
        }
        await HF.setSettingValue("outpostData", updateData, "outposts")
    }
    static async deleteOutpost(id) {
        const outposts = await HF.getSettingValue("outpostData", "outposts")
        delete outposts[id]
        await HF.setSettingValue("outpostData", outposts, "outposts")
    }
    static async getRollTable(name) {
        const table = await game.tables.getName(`${name}Encounters`)
        const id = table.id
        return `@UUID[RollTable.${id}]{${name} Table}`
    }
    static async sendChatMessage(data) {
        await HF.createChatMessage(
            {
                content: data.content
            }
        )
    }
}
export const allOutposts = [
    outpostFactory("one"),
    outpostFactory("two"),
    outpostFactory("three"),
]
const defaultData = {
    one: {
        name: "one",
        pointPool: 9,
        ratings: {
            comfort: {
                value: 0, name: "Comfort"
            },
            destruction: { value: 0, name: "Destruction" },
            defenseSupport: { value: 3, name: "Defense/Support" },
            dataProcessing: { value: 6, name: "Data Processing & Automation" },
            resourceProcessing: { value: 0, name: "Resource Processing" },
        }
    },
    two: {
        name: "two",
        pointPool: 9,
        ratings: {
            comfort: {
                value: 0, name: "Comfort"
            },
            destruction: { value: 0, name: "Destruction" },
            defenseSupport: { value: 3, name: "Defense/Support" },
            dataProcessing: { value: 6, name: "Data Processing & Automation" },
            resourceProcessing: { value: 0, name: "Resource Processing" },
        }
    },
    three: {
        name: "three",
        pointPool: 9,
        ratings: {
            comfort: {
                value: 0, name: "Comfort"
            },
            destruction: { value: 0, name: "Destruction" },
            defenseSupport: { value: 3, name: "Defense/Support" },
            dataProcessing: { value: 6, name: "Data Processing & Automation" },
            resourceProcessing: { value: 0, name: "Resource Processing" },
        }
    },
}
export function outpostFactory(name) {
    return {
        name: name,
        pointPool: 9,
        ratings: {
            comfort: {
                value: 0,
                name: "Comfort",
                icon: `<i class="fas fa-loveseat"></i>`
            },
            destruction: {
                value: 0,
                name: "Destruction",
                icon: `<i class="fas fa-raygun"></i>`
            },
            defenseSupport: {
                value: 0,
                name: "Defense/Support",
                icon: `<i class="fas fa-shield"></i>`
            },
            dataProcessing: {
                value: 0,
                name: "Data Processing & Automation",
                icon: `<i class="fas fa-radar"></i>`
            },
            resourceProcessing: {
                value: 0,
                name: "Resource Processing",
                icon: `<i class="fas fa-industry-alt"></i>`
            },
        },
        consequenceClocks: {
            pollution: {
                name: "Tumult/Pollution",
                value: 0,
                symbol: "🧪️"
            },
            destabilization: {
                name: "Destabilization/Calamity",
                value: 0,
                symbol: "💥"
            },
            powerSurge: {
                name: "Power Surge",
                value: 0,
                symbol: "⚡"
            },
        },
        linkedActorID: "",
    }

}
const ratingIcons = {
    comfort: "😊",
    destruction: "💣",
    defenseSupport: "🛡️",
    dataProcessing: "🌐",
    resourceProcessing: "⛏️"
}

const Outpost = {
    name: "",
    createNewOutpost: {

    },
    "pointPool": 9,
    "comfort": 0,
    "destruction": 0,
    "defense/support": 0,
    "data processing/automation": 0,
    "resource processing": 0,
}


const downtimeData = {
    locations: {
        "Safe Town": "",
        "Abyssal Outpost": {
            amplifyCardTask: {
                description: `Creation, Acquisition, Recovery and Discovery Tasks taken on by PCs within an appropriately-specialized outpost while leveraging that outpost's facilities will get more bang for their buck on successes.
At a rating of 3, they'll Acquire double resources, fill Creation, Discovery or Recovery Clocks with Increased Impact instead of normal (increased impact fills an extra section on each clock), or use fewer resources.
Commandeering an action like this will replace the normal Active Phase Ratings Roll for that particular rating, and only one PC can do so per downtime.
but does not replace the potential for a Consequence Roll. You instead risk whatever consequences occur applying to you/your person/your project.`,
                cost: 1,
                ratingRequirement: 3,
                tasks: {
                    "Creation": `Treat Impact on Ambition Clocks for a crafting projects as massive, while using the facilities of an outpost geared toward Processing (Resources) (Massive Impact fills an entire clock)`,
                    "Acquisition": `a Hunting or Foraging Roll Result that would net you 1 specimens, will instead net 10 specimens.`,
                    "Discovery": `Dedicating all of the facility's Processing (Data) powers, a progress clock for your Ambition to translating an Ancient Text might be fully filled on a success.`
                }
            },
            reallocatePoints: {
                name: "Reallocate Outposts Rating Points",
                description: `
                    (Must be taken at END of Downtime)
                    Reallocate the points in the Outpost's Pools.
                    Any installations who require a higher rating than the outpost can provide, will be deactivated, and can either be broken down for parts to free up space, reactivated if the rating meets the requirement once again, or, with a high enough Processing (Resources) Rating, be transported to another nearby Outpost.
Outpost Pool Points cannot be reallocated again until the next Downtime.
                `,
                cost: 1,
            },
            putOutFires: {
                name: "Put Out Fires",
                cost: 1,
                description: "Spend 1 Task and roll to attempt to reduce one of the Consequence Clocks"
            },
            installStation: {

            },
            jailbreak: {
                cost: 1,
                description: `Certain advanced rooms/stations can only be unlocked if the related categories are above a certain ratio.
You can make a series of rolls to 'Jailbreak' these requirements when installing a new module, needing to meet a difficulty equal to the level of the module. But doing so is difficult and has consequences even on a success.
Base Consequence: each Jailbroken Installation will add an automatic, unremovable point to the "Downside Tracker" related to its function.
Each consecutive 'Jailbreak' will add an additional required success, and failures will force a roll on the Numenera Malfunction table.
`
            }
        },
        "Camp": "",
        "During Expedition": ""
    },
    tasks: {
        creation: {
            crafting: {
                requires: "2 salvage"
            },
            cooking: {

                requires: "2 specimens"
            },
            concocting: {
                requires: "2 resources"
            }
        },
        acquisition: {
            hunting: {
                requires: "Nearby area with potential for beasts"
            },
            foraging: {
                name: "Harvesting/Foraging",
                requires: "Nearby area with potential for vegetation"

            },
            scavenging: {

                requires: "Nearby area with potential for salvage"

            },
        },
        recovery: {
            healing: {

            },
            repairing: {

            },
            relaxing: {

            }
        },
        discovery: {

        }
    }
}



export const phases = {
    actionPhase: {
        name: "Action Phase", description: `Here, the outpost does the active duties and processes you have geared it toward.
For each rating greater than or equal to 3, the Outpost will roll a number of dice equal to that rating.
`},
    eventPhase: {
        name: "Event Phase", description: `The Event Phase represents the Abyss reacting to your Outpost's presence,
    or your Outpost reacting to the strangeness of the Abyss.`,
    },
    reactionPhase: {
        name: "Reaction Phase", description: `Here, roll the appropriate rating to see how well the outpost withstands any events, be they environmental or internal, that occur, or defends against any negative attention its processes may have attracted.
If the outpost has no points in a particular rating, roll 2d6 and take the lowest result.`,
    }
}
const tooltipText = {
    rollConsequences: {
        actionPhase: `Consequences can only be rolled during the event phase. Current phase is 'Action'.`,
        eventPhase: `Roll consequences to determine what event will occur`,
        reactionPhase: `Consequences can only be rolled during the event phase. Current phase is 'Reaction'.`,
    },
    rollAllRatings: {
        actionPhase: ``,
        eventPhase: `Ratings cannot be rolled during the Event Phase.`,
        reactionPhase: `Roll a single rating in reaction to an Event that occurred.`,
    },
    rollSingleRating: {
        actionPhase: `Utilize this Outpost's specialization to manually aid in a downtime action`,
        eventPhase: `Ratings cannot be rolled during the Event Phase.`,
        reactionPhase: `Roll a single rating in reaction to an Event that occurred.`,
    }


}
export const outpostData = {
    "Comfort": {
        value: 0,
        description: `accommodations and entertainment, making the outpost feel like home.
. Roll this rating to determine how comfortable a living environment the outpost is as a living environment for anyone living within it for at least a week.`,
        activePhase: {
            examples: ``
        },
        reactivePhase: {
            examples: ``
        },
        ratingBonus: {
            3: "",
            6: "the Outpost is so comfortable and reminds you of home, you no longer need to roll at to stave off mire -- however, if you choose to do so anyway and receive a Triumphant Major Effect on this roll (Boons Win + Nat 20), you may also clear a point of Mire.",
            9: "choose to Indulge your Vice to clear a point of Mire as you would back in town."
        }
    },
    "Defense/Support": {
        description: "Roll this rating for situations to defend the outpost against attack with shields or deterring blasts, to provide urgent medical treatment for multiple individuals, or if the outpost must endure dangerous environmental conditions",
        activePhase: "",
        reactivePhase: "",
        ratingBonus: {
            3: `Depending on the nature of the Installations installed , a Defense/Support rating above 3 will cause Cut to your Comfort Rating Rolls.
This is to represent how constant security checks, barriers, lack of windows, bulkheads, airlocks, etc. restricting movement, flexibility and general ease will act as a constant reminder that you're in a dangerous environment that needs to be 'bunkered' against, rather than in a safe, cozy place like home)`

        },
        value: 0
    },
    "Destruction": {
        description: `weapons to fight creatures and destructive tools to carve or blast through environments
Roll this rating for situations where the outpost uses offensive weaponry and devices, be that to attack a living creature, remove an environmental obstruction, or attempt to explosively break down a massive vein of raw resources.`,
        value: 0,
        activePhase: {
            examples: `Hunt and kill a rare creature for its meat or blood.
Remove a nearby environmental obstruction to allow individuals or vehicles to pass through
Explosively break down a massive vein of raw resources, reducing them into smaller pieces for further processing
`,
        },
        reactivePhase: {
            examples: `Attempt to kill or deter a creature through sheer force before it can attack the outpost.
Destroy or blast a way out of an environmental threat bearing down on the outpost, like a collapsing cliffside or quantum island collision (before it collides)
Reactive Destruction Tasks can be defensive in nature, however if they fail and your Outpost does not have Defense/Support capabilities, the damage could potentially be astronomical. Risk/Reward.
`
        }
    },
    "Data Processing/Automation": {
        description: `technological tools for observing, recording, and processing knowledge, including the room and power requirements for the necessary hardware, and automating installations. Roll this to receive, store, and process information, and provide limited automation to the actions of ratings.
`,
        activePhase: {
            examples: `Once per phase as part of a downtime Action, you can
Ask a question of the datasphere and receive an answer
Map a particularly difficult to access area, receiving details about the local environmental conditions/terrain/etc.
Receive information about Dimensional Anomalies and fluctuations
Receive information from other outposts #wip/🟧 .
`,

        },
        reactivePhase: {
            examples: `Scan and record information about an intruder to determine the most useful kinds of defenses.
Research knowledge about an unknown illness that is spreading through town/the outpost.
`
        },
        value: 0
    },
    "Resource Processing": {
        description: `tools for processing and containing resources inside the outpost, like workbenches, transports, and appropriate storage. ability
        Roll this to successfully process or contain things like minerals, plant specimens, exotic animals, etc.
        `,
        activePhase: {
            examples: `Refine large masses of raw materials to potentially sift veins of out more rare materials like iotum.
Transport salvage or specimens to another Outpost, or perhaps back to Copper Grove.`
        },
        reactivePhase: {
            examples: `Successfully contain an wild animal that sought to breach its containment inside of the outpost.`
        },
        value: 0
    }
}

const consequenceClocks = {
    instructions: `Whenever an Outpost makes a ratings roll and receives a Conflict (5, 4 as highest result) or a Disaster (3, 2, 1 as highest result), the GM might advance one of the few "Consequence" clocks below.
   For each clock that has a section marked, the GM will roll a dice pool with a number of dice equal to number of filled segments.
Whichever roll is highest will influence the event that occurs.
If a clock ever hits maximum on its own, the GM will not roll, but a relevant encounter will immediately occur.
    `,
    clocks: {
        "Tumult/Pollution": {
            description: `Represents the extreme energy-draw when using destructive Numenera,
        the processing power to process materials, the creation of industrial waste leftover from processing materials,
        that may output a lot of noise (machinery running from music), heat (output from machines or information processing),
        fumes, radiation, exhaust, odor, etc., smell (from storing creatures), blood (from slaughtering creatures),
        and attract unwanted attention. (Attracts Creatures/Infestations/Disease)`,
            value: 3,
            symbol: "🧪️" //"🏭"// ️

        },
        "Destabilization/Calamity": {
            description: `For each Outpost Action taken that used sheer destructive force and energy to destroy or irreversibly alter part of the surrounding environment or the ecosystem within (be it a large group of creatures or a single large creature), add a tick to the clock representing the havoc and resulting unintended consequences such actions can cause. (Triggers Environmental Hazards)`,
            value: 2,
            symbol: "💥"
        },
        "Power Surge": {
            description: `Triggers station malfunctions, which could lead to things like failed defenses or containment breaches, or loss of data)`,
            value: 4,
            symbol: "⚡"
        },
    }
}

const downtimeActions = {
    click: {
        toggleDowntimeActive: {
            handler: async (event, currentTarget, options = {}) => {
                let active = await HF.getSettingValue("downtimeData", "downtimeActive")
                active = !active
                await HF.setSettingValue("downtimeData", active, "downtimeActive")
            }


        }
    }

}
export class DowntimeSheet extends Application {
    constructor(data = {}) {
        super()
        this.data = data
    }
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            classes: ['form'],
            popOut: true,
            resizable: true,
            minimizeable: true,
            height: "800",
            width: "600",
            template: `modules/hud-and-trackers/templates/outpost-sheet/downtime-sheet.html`,
            id: 'downtime-sheet',
            title: 'Downtime Sheet',
        });
    }
    async getData() {
        // Send data to the template
        let { downtimeActive, actions } = await HF.getSettingValue("downtimeData")
        let PCs = game.users.contents.map((user) => user.character).filter((character) => character && character.type === "pc")
        return { downtimeActive, PCs, downtimeActions: downtimeData.tasks }

    }
    activateListeners(html) {
        super.activateListeners(html);
        HF.addActionListeners(html, downtimeActions)
    }
}
export class OutpostSheet extends Application {
    /**
     * Description
     */
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
            template: `modules/hud-and-trackers/templates/outpost-sheet/outpost-sheet.html`,
            id: 'outpost-sheet',
            title: 'outpost-sheet',
            dragDrop: [{ dragSelector: ".entity", dropSelector: ".station-wrapper" }],
        });
    }

    async getData() {
        // Send data to the template
        let { outposts, currentPhase } = await HF.getSettingValue("outpostData")
        // let outposts = await HF.getSettingValue("outpostData", "outposts")
        for (let key in outposts) {
            const linkedActorID = outposts[key].linkedActorID
            outposts[key].linkedActorSheet = game.actors.get(linkedActorID)
        }

        let outpostSheets = game.folders.getName("Outposts").contents
        if (!currentPhase) currentPhase = "actionPhase"
        return { outposts: outposts, phases: phases, currentPhase: currentPhase, isGM: game.user.isGM, outpostSheets: outpostSheets, ratingIcons: ratingIcons }
    }

    activateListeners(html) {
        super.activateListeners(html);
        HF.addActionListeners(html, outpostActions)
    }
    async _onDrop(event) {
        event.preventDefault();
        let data;
        try {
            data = JSON.parse(event.dataTransfer.getData("text/plain"));
        } catch (err) {
            return;
        }

        this.linkEntity(data);
        //get drop target
    }

    //link an entity that's dragged onto here
    async linkEntity(data) {
        //set this as a flag on the entity
        let ourEntity;
        await HelperFunctions.getEntityById(data.type, data.id).then((value) => (ourEntity = value));

        if (ourEntity) {
            //save the linked entity on our clock
            //save this entity a linked entity on our clock
            let entityData = {
                name: ourEntity.name,
                entity: ourEntity.documentName,
            };
            //get our linked entities, and find the id of this entity, and add the linked entities to this data
            this.data.linkedEntities[data.id] = entityData;

            this.render(true);
        }
    }
    async unlinkEntity(entityData) {
        //delete the entity from linkedEntities, and refresh the entity
        delete this.data.linkedEntities[entityData.id];

        //was accessing "ourId" instead of "id"
        // refreshSpecificEntity(entityData, this.data.ourId);
        const keyDeletion = {
            [`-=${entityData.id}`]: null,
        };
        //add the key deletion thing so it'll be deleted properly in the users' saved flags as well
        this.data.linkedEntities[`-=${entityData.id}`] = null;
        this.saveAndRenderApp();
    }

}

