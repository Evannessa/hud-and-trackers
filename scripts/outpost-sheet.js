import { HelperFunctions as HF } from "./helper-functions.js";
const outpostActions = {
    click: {
        addNewOutpost: {
            handler: (event, currentTarget, options = {}) => {

            }
        },
        updateRating: {
            handler: (event, currentTarget, options = {}) => {
                const ratingInput = currentTarget


            }
        },
        rollOne: {
            handler: async (event, currentTarget, options = {}) => {
                console.log("Rolling one")
                const rating = currentTarget.closest(".rating-label").querySelector("input[type='number']")
                //create dice pool with dice equal to rating
                let total = await HF.createRoll(rating.value, rating.name)


            }
        },
        rollEach: {
            handler: async (event, currentTarget, options = {}) => {
                console.log("Rolling each")
                const ratings = Array.from(currentTarget.closest(".ratings-wrapper").querySelectorAll(".rating"))
                const totals = []
                for (let rating of ratings) {
                    if (rating.value >= 3) {
                        //create a roll for each of these, with relevant output
                        let total = await HF.createRoll(rating.value, rating.name)
                        totals.push({ name: rating.name, total: total })
                    }
                }
                let max = HF.getMaxOrMin(totals, "max")
                let min = HF.getMaxOrMin(totals, "min")
                console.log("Our totals", totals, max, min)


            }

        }
    }
}
Hooks.on("ready", () => {
    game.outpostSheet = new OutpostSheet().render()
});

const allOutposts = [
    outpostFactory("one"),
    outpostFactory("two"),
    outpostFactory("three"),
]

function outpostFactory(name) {
    return {
        name: name,
        pointPool: 9,
        ratings: {
            comfort: 0,
            destruction: 0,
            "defense/support": 3,
            "data processing/automation": 6,
            "resource processing": 0,
        }
    }

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
        "Creation": {
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
        "Acquisition": {
            hunting: {
                requires: "Nearby area with potential for beasts"
            },
            "harvesting/foraging": {
                requires: "Nearby area with potential for vegetation"

            },
            scavenging: {

                requires: "Nearby area with potential for salvage"

            },
        },
        "Recovery": {
            healing: {

            },
            repairing: {

            },
            relaxing: {

            }
        },
    }
}



export const phases = {
    "Action Phase": `Here, the outpost does the active duties and processes you have geared it toward.
For each rating greater than or equal to 3, the Outpost will roll a number of dice equal to that rating.
`,
    "Event Phase": `The Event Phase represents the Abyss reacting to your Outpost's presence,
    or your Outpost reacting to the strangeness of the Abyss.`,
    "Reaction Phase": `Here, roll the appropriate rating to see how well the outpost withstands any events, be they environmental or internal, that occur, or defends against any negative attention its processes may have attracted.
If the outpost has no points in a particular rating, roll 2d6 and take the lowest result.`,
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
    "Instructions": `Whenever an Outpost makes a ratings roll and receives a Conflict (5, 4 as highest result) or a Disaster (3, 2, 1 as highest result), the GM might advance one of the few "Consequence" clocks below.
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
            value: 0,
        },
        "Destabilization/Calamity": {
            description: ` For each Outpost Action taken that used sheer destructive force and energy to destroy or irreversibly alter part of the surrounding environment or the ecosystem within (be it a large group of creatures or a single large creature), add a Bane, representing the havoc and resulting unintended consequences such actions can cause. (Triggers Environmental Hazards)`,
            value: 0
        },
        "Power Surge": {
            description: `Triggers station malfunctions, which could lead to things like failed defenses or containment breaches, or loss of data)`,
            value: 0
        },
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
            template: `modules/hud-and-trackers/templates/outpost-sheet/outpost-sheet.html`,
            id: 'outpost-sheet',
            title: 'outpost-sheet',
        });
    }

    getData() {
        // Send data to the template
        return { outposts: allOutposts, clocks: consequenceClocks }
    }

    activateListeners(html) {
        super.activateListeners(html);
        HF.addActionListeners(html, outpostActions)
        // html.off("click").on("click", "[data-click-action]", (event) => handleAction(event, "clickAction"));
    }

    // handleAction(event, actionType = "click") {
    //     const actionKey = actionType += "Action"
    //     const action = event.currentTarget.dataset[actionKey]
    //     event.preventDefault()
    //     HF.handleAction(event, actionType, action, outpostActions);

    // }





    async _updateObject(event, formData) {
        console.log(formData.exampleInput);
    }
}

