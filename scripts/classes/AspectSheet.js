import { MODULE_ID } from '../debug-mode.js'
import { HelperFunctions as HF } from '../helper-functions.js'


const aspectActions = {
    click: {
        addAspect: {
            handler: async (event, options = {}) => {

            }

        },
        changeRating: {
            handler: async (event, options = {}) => {
                let ratingName = currentTarget.dataset.name
                let type = currentTarget.dataset.type
                let outpostId = currentTarget.closest(".individual-outpost").getAttribute("id")
                let outpostData = await HF.getSettingValue("outpostData", `outposts.${outpostId}`)
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
            }

        }


    }



}

class AspectManager {

    static async getAspectValue(document, key) {
        await HF.getFlagValue(document, "aspects", key, {})
    }
    static async updateAspectValue(event, oldValue, document, key) {
        let changeBy = 1;
        if (event.which === 3) {
            //right mouse button subtract instead
            changeBy = -1;
        }
        let newValue = oldValue + changeBy

        await HF.setFlagValue(document, "aspects", newValue, key)
    }
}


/**
 * Description
 */
import { CypherActorSheetNPC } from "../../../../systems/cyphersystem/module/actor/npc-sheet.js";
export class AspectSheet extends CypherActorSheetNPC {
    get template() {
        return `modules/${MODULE_ID}/templates/aspects/AspectSheet.hbs`
    }


    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            classes: ['form'],
            popOut: true,
            resizable: true,
            minimizeable: true,
            template: `modules/${MODULE_ID}/templates/aspects/AspectSheet.hbs`,
            id: 'AspectSheet',
            title: ' Aspect Sheet',
        });
    }

    async getData() {
        // Send data to the template
        console.log(this)
        const aspects = await AspectManager.getAspectValue(this.actor)
        return { aspects };
    }

    async activateListeners(html) {
        super.activateListeners(html);
        await HF.addActionListeners(html, aspectActions);
    }



}

window.AspectSheet = AspectSheet;
