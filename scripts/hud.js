"use strict";

import * as ClockApp from "./clock.js";
import registerSettings from "./settings.js";
import { ClockViewer } from "./ClockViewer.js";
import { ClockConfig } from "./ClockConfig.js";
import * as PartyOverview from "./party-overview.js";
import * as HelperFunctions from "./helper-functions.js";

Hooks.on("renderHotbar", async (hotbar, html, data) => {
    let defaultHotbar = html;
    //get the height of the player list
    let plHeight = defaultHotbar[0].clientHeight;
    let plBottom = window.getComputedStyle(defaultHotbar[0]).marginBottom;
    //add CSS custom properties to the root element so that we can shift the custom player list upward and out of the way when we want to view the default one
    let rootElement = document.documentElement;
    rootElement.style.setProperty("--default-hotbar-height", plHeight + "px");
    rootElement.style.setProperty("--default-hotbar-bottom", plBottom);
});
let hud;
let lastTab = "attacks";

Handlebars.registerHelper("firstChar", function (strInputCode) {
    return strInputCode.charAt(0);
});

Handlebars.registerHelper("clean", function (strInputCode) {
    if (!strInputCode) {
        return;
    }
    let cleanText = strInputCode.replace(/<\/?[^>]+(>|$)/g, "");
    cleanText = cleanText.replace("&quot;", '"');

    cleanText = cleanText.replace("&amp;", "&");

    cleanText = cleanText.replace("&rsquo;", "’");
    cleanText = cleanText.replace("&nbsp;", " ");

    return cleanText;
});

/**
 * @param token - the token we've selected
 * @param isControlled - if the token is controlled or we've stopped
 * controlling it
 */

Hooks.on("init", () => {
    game.abilityHud = {};
    game.helperFunctions = HelperFunctions;
    registerSettings();
});

Hooks.on("renderSidebarTab", (app, html) => {
    if (app.options.id == "chat") {
        //get the parent of the chat message box
        let chatForm = html.find("#chat-form");
        chatForm.css("position", "relative");

        //add our token image div into it, and fill it
        chatForm.append("<div class='chatTokenImg'></div>");
        let chatArea = html.find(".chatTokenImg")[0];

        //save it as a variable on the game
        game.chatArea = chatArea;
        if (canvas.tokens) {
            let tokens = canvas.tokens.controlled;
            let tokenImg;
            if (tokens.length > 0) {
                tokenImg = token.actor.img;
            }
            if (tokenImg) {
                setTokenImage(tokenImg);
            }
        }
    }
});

/**
 * This shows an image of your selected token in the chat box
 * @param {String} tokenImg - the path to the image of the token we want to show in the chat
 */
function setTokenImage(tokenImg) {
    let chatArea = $(game.chatArea);
    let img = chatArea.find(".tokenImg");
    chatArea.removeClass("hide");
    if (img.length == 0) {
        img = chatArea.append(`<img class="tokenImg" src=${tokenImg}></img>`);
    } else {
        img.attr("src", tokenImg);
    }
    img.css("object-fit", "contain");
}

Hooks.on("updateActor", (actor, data, diff, actorId) => {
    let token = game.canvas.tokens.controlled[0];
    if (token) {
        if (token.actor == actor) {
            //if this is the same actor as our controlled token
            hud.updateData(game.canvas.tokens.controlled[0]);
            hud.render(true);
        }
    }
});

Hooks.on("createItem", (data, data2, data3) => {
    let token = game.canvas.tokens.controlled[0];
    if (token) {
        if (game.canvas.tokens.controlled[0].actor.id === data.parent.id) {
            hud.updateData(game.canvas.tokens.controlled[0]);
            hud.render(true);
        }
    }
});
Hooks.on("updateItem", (data, data2, data3) => {
    let token = game.canvas.tokens.controlled[0];
    if (token) {
        if (game.canvas.tokens.controlled[0].actor.id === data.parent.id) {
            hud.updateData(game.canvas.tokens.controlled[0]);
            hud.render(true);
        }
    }
});

Hooks.on("controlToken", async (token, isControlled) => {
    let ourToken = token;
    if (!isControlled) {
        if (game.canvas.tokens.controlled.length == 0) {
            //** So this will close regardless, as it'll be zero
            //before being set to one
            //as previous control of the tokens is released
            setTimeout(() => {
                if (game.canvas.tokens.controlled.length == 0) {
                    hud.close();
                    //set the chat area's css to none
                    $(game.chatArea).addClass("hide");
                    // $(game.chatArea).css({
                    //     "background-image": "none",
                    // });
                }
            }, 250);
            // hud = null;
        }
    } else if (isControlled) {
        //if we're controlling the token, render a new token hud
        if (game.canvas.tokens.controlled.length == 1) {
            //hud will only appear for the first token that was controlled
            if (hud) {
                //if the hud exists, update it's data
                hud.updateData(ourToken);
                hud.render(true);
            } else {
                //create a new hud
                hud = new Hud(ourToken).render(true);
                game.abilityHud = hud;
            }
            //TODO: Add way to swap token image here
            let tokenImg = game.canvas.tokens.controlled[0].actor.img;
            // game.chatArea.style.backgroundImage = `url(${tokenImg})`;
            setTokenImage(tokenImg);
            // $(game.chatArea).removeClass("hide");
            // if (!$(game.chatArea.find(".tokenImg"))) {
            //     $(game.chatArea).append(`<img src="${tokenImg}">`);
            // } else {
            //     $(game.chatArea).find(".tokenImg").attr("src", tokenImg);
            // }
            // $(game.chatArea).css({
            //     "background-image": `url(${tokenImg})`,
            //     "background-size": "contain",
            //     "background-repeat": "no-repeat",
            // });
        }
    }
});

function itemRollMacro(
    actor,
    itemID,
    pool,
    skill,
    assets,
    effort1,
    effort2,
    additionalSteps,
    additionalCost,
    damage,
    effort3,
    damagePerLOE,
    teen,
    stepModifier,
    noRoll
) {
    // Find actor based on item ID
    const owner = game.actors.find((actor) => actor.items.get(itemID));

    // Check for actor that owns the item
    if (!actor || actor.data.type != "PC")
        return ui.notifications.warn(
            game.i18n.format("CYPHERSYSTEM.MacroOnlyUsedBy", {
                name: owner.name,
            })
        );

    // Determine the item based on item ID
    const item = actor.items.get(itemID);

    // Check whether the item still exists on the actor
    if (item == null)
        return ui.notifications.warn(
            game.i18n.format("CYPHERSYSTEM.MacroOnlyUsedBy", {
                name: owner.name,
            })
        );

    // Check for AiO dialog
    let skipDialog = true;
    if (
        (game.settings.get("cyphersystem", "itemMacrosUseAllInOne") && !event.altKey) ||
        (!game.settings.get("cyphersystem", "itemMacrosUseAllInOne") && event.altKey)
    ) {
        skipDialog = false;
    }

    // Check for noRoll
    if (!noRoll) noRoll = false;

    // Prepare data
    // Prepare defaults in case none are set by users in the macro
    if (!skill) {
        if (item.type == "skill" || item.type == "teen Skill") {
            skill = item.data.data.skillLevel;
        } else if (item.type == "attack" || item.type == "teen Attack") {
            skill = item.data.data.skillRating;
        } else {
            skill = item.data.data.rollButton.skill;
        }
    }
    if (!assets) assets = item.data.data.rollButton.assets;
    if (!effort1) effort1 = item.data.data.rollButton.effort1;
    if (!effort2) effort2 = item.data.data.rollButton.effort2;
    if (!effort3) effort3 = item.data.data.rollButton.effort3;
    if (!additionalCost) {
        if (item.type == "ability" || item.type == "teen Ability") {
            let checkPlus = item.data.data.costPoints.slice(-1);
            if (checkPlus == "+") {
                let cost = item.data.data.costPoints.slice(0, -1);
                additionalCost = parseInt(cost);
            } else {
                let cost = item.data.data.costPoints;
                additionalCost = parseInt(cost);
            }
        } else {
            additionalCost = item.data.data.rollButton.additionalCost;
        }
    }
    if (!additionalSteps) {
        if (item.type == "power Shift") {
            additionalSteps = item.data.data.powerShiftValue;
        } else if (item.type == "attack" || item.type == "teen Attack") {
            additionalSteps = item.data.data.modifiedBy;
        } else {
            additionalSteps = item.data.data.rollButton.additionalSteps;
        }
    }
    if (!damage) {
        if (item.type == "attack" || item.type == "teen Attack") {
            damage = item.data.data.damage;
        } else {
            damage = item.data.data.rollButton.damage;
        }
    }
    if (!pool) {
        if (item.type == "ability" || item.type == "teen Ability") {
            pool = item.data.data.costPool;
        } else {
            pool = item.data.data.rollButton.pool;
        }
    }
    if (!damagePerLOE) damagePerLOE = item.data.data.rollButton.damagePerLOE;
    if (!stepModifier) {
        if (item.type == "attack" || item.type == "teen Attack") {
            stepModifier = item.data.data.modified;
        } else {
            stepModifier = additionalSteps < 0 ? "hindered" : "eased";
        }
    }
    if (!teen) teen = actor.data.data.settings.gameMode.currentSheet == "Teen" ? true : false;

    // Create item type
    let itemType = "";
    if (item.type == "ability" && item.data.data.spell) {
        itemType = game.i18n.localize("CYPHERSYSTEM.Spell") + ": ";
    } else if ((item.type == "ability" || item.type == "teen Ability") && !item.data.data.spell) {
        itemType = game.i18n.localize("ITEM.TypeAbility") + ": ";
    } else if (item.type == "attack" || item.type == "teen Attack") {
        itemType = game.i18n.localize("ITEM.TypeAttack") + ": ";
    } else if (item.type == "skill" || item.type == "teen Skill") {
        itemType = game.i18n.localize("ITEM.TypeSkill") + ": ";
    }

    game.cyphersystem.allInOneRollDialog(
        actor,
        pool,
        skill,
        assets,
        effort1,
        effort2,
        additionalCost,
        Math.abs(additionalSteps),
        stepModifier,
        itemType + item.name,
        damage,
        effort3,
        damagePerLOE,
        teen,
        skipDialog,
        noRoll,
        itemID
    );
    // Parse data to All-in-One Dialog
}

Hooks.once("renderHud", (app, html) => {
    // let position = game.settings.get("hud-and-trackers", "tokenHudPosition");
    // if (Object.keys(position).length > 0) {
    //     app.setPosition({ top: position.top, left: position.left });
    // }
});

Hooks.on("renderHud", (app, html) => {
    HelperFunctions.setInvisibleHeader(html, true);
});

export class Hud extends Application {
    updateData(object) {
        this.setFields(object);
        this.render();
    }

    async showTooltip(event) {
        let element = event.currentTarget;
        console.log(element, element.nextElementSibling);
        let tooltipData = element.querySelector(".hud-item__description")?.innerHTML;
        console.log(tooltipData);
        var rect = element.getBoundingClientRect();
        console.log(rect.top, rect.right, rect.bottom, rect.left);
        const template = "/modules/hud-and-trackers/templates/tooltip/tooltip.hbs";
        const data = {
            // title: title,
            description: tooltipData,
        };
        const tooltipHtml = await renderTemplate(template, { data: data });
        $(element.closest(".window-app")).append(tooltipHtml);
        tooltipHtml.setAttribute("position", "absolute");
        tooltipHtml.setAttribute("left", rect.left);
        tooltipHtml.setAttribute("top", rect.top);
    }
    async setFields(object) {
        this.isGM = game.user.isGM;
        this.ourToken = object;
        this.ourActor = this.ourToken.actor; //this.getActor(this.ourToken);
        this.tabTypes = ["attacks", "cyphers", "artifacts"];
        if (this.ourActor.type === "PC") {
            let pcExclusiveTypes = ["abilities", "skills"];
            this.tabTypes = [...this.tabTypes, ...pcExclusiveTypes];
        }
        this.attacks = this.getStuffFromSheet(this.ourActor, "attack");
        this.abilities = this.getStuffFromSheet(this.ourActor, "ability");
        this.skills = this.getStuffFromSheet(this.ourActor, "skill");
        this.cyphers = this.getStuffFromSheet(this.ourActor, "cypher");
        this.artifacts = this.getStuffFromSheet(this.ourActor, "artifact");
        if (!this.ourActor.getFlag("hud-and-trackers", "showTab")) {
            this.showTab = "abilities";
        } else {
            this.showTab = this.ourActor.getFlag("hud-and-trackers", "showTab");
        }
        if (!this.ourActor.getFlag("hud-and-trackers", "pinnedTab")) {
            this.pinnedTab = "none";
        } else {
            this.pinnedTab = this.ourActor.getFlag("hud-and-trackers", "pinnedTab");
        }
        //pinned items will be an object that holds an array of each pinned type
        if (!this.ourActor.getFlag("hud-and-trackers", "pinnedItems")) {
            this.pinnedItems = {
                ability: [],
                skill: [],
                attack: [],
                cypher: [],
                artifact: [],
            };
            this.ourActor.setFlag("hud-and-trackers", "pinnedItems", this.pinnedItems);
        } else {
            this.pinnedItems = this.ourActor.getFlag("hud-and-trackers", "pinnedItems");
        }

        if (!this.ourActor.getFlag("hud-and-trackers", "pinnedAbilities")) {
            this.pinnedAbilities = [];
            this.ourActor.setFlag("hud-and-trackers", "pinnedAbilities", this.pinnedAbilities);
        } else {
            this.pinnedAbilities = this.ourActor.getFlag("hud-and-trackers", "pinnedAbilities");
        }
    }

    constructor(object) {
        super();
        this.setFields(object);
    }
    /** @override */
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            classes: ["hud-and-trackers"],
            popOut: true,
            submitOnChange: false,
            closeOnSubmit: false,
            minimizable: false,
            resizable: false,
            bottom: 63,
            left: 220,
            template: "modules/hud-and-trackers/templates/hud.hbs",
            id: "tokenHud",
            title: "tokenHud",
            onSubmit: (e) => e.preventDefault(),
        });
    }
    async _updateObject(event, formData) {
        this.render();
    }

    async getData() {
        this.pinnedItems = this.ourActor.getFlag("hud-and-trackers", "pinnedItems");
        for (let key in this.pinnedItems) {
            let array = this.pinnedItems[key];
            array = array.map((pin) => {
                if (pin.hasOwnProperty("name")) {
                    return new Item(pin);
                } else {
                    return new Item(pin.data);
                }
            });
            this.pinnedItems[key] = array;
        }
        let allItems = {
            attacks: this.attacks,
            skills: this.skills,
            abilities: this.abilities,
            cyphers: this.cyphers,
            artifacts: this.artifacts,
        };
        let currentItemArray = allItems[this.showTab];
        let currentPinnedItemsArray = this.pinnedItems[this.showTab];

        return {
            ourToken: this.ourToken,
            isGM: this.isGM,
            tabTypes: this.tabTypes,
            type: this.ourActor.type,
            ourActor: this.ourActor,
            items: currentItemArray,
            // attacks: this.attacks,
            // skills: this.skills,
            // abilities: this.abilities,
            // cyphers: this.cyphers,
            // artifacts: this.artifacts,
            pinnedItems: currentPinnedItemsArray,
            pinnedAbilities: this.pinnedAbilities, //this.ourActor.getFlag("hud-and-trackers", "pinnedAbilities"),
            showTab: this.showTab,
            combatActive: this.combatActive,
        };
    }
    static getSiblings(elem) {
        // Setup siblings array and get the first sibling
        var siblings = [];
        var sibling = elem.parentNode.firstChild;

        // Loop through each sibling and push to the array
        while (sibling) {
            if (sibling.nodeType === 1 && sibling !== elem) {
                siblings.push(sibling);
            }
            sibling = sibling.nextSibling;
        }

        return siblings;
    }

    static setActive(element) {
        // let parent = element.parentNode;
        // parent.addClass("active");
        let siblings = Hud.getSiblings(element);
        siblings.forEach((sibling) => {
            if (sibling.classList.contains("active")) {
                $(sibling).removeClass("active");
            }
        });
        $(element).addClass("active");
    }

    static setPinned(element) {
        this.setActive(element); //make the pinned one active first
        //to remove active state from its siblings
        let siblings = Hud.getSiblings(element);
        siblings.forEach((sibling) => {
            if (sibling.classList.contains("pinned")) {
                $(sibling).removeClass("pinned");
            }
            if (sibling.classList.contains("active")) {
                $(sibling).removeClass("pinned");
            }
        });
        $(element).addClass("pinned");
        $(element).addClass("active");
    }

    static callMacro(name) {
        let macro = game.macros.getName(name);
        if (macro) {
            macro.execute();
        } else {
            ui.notifications.info(`Couldn't find macro named ${name}`);
        }
    }

    activateListeners(html) {
        game.abilityHud = this;

        let windowContent = html.closest(".window-content");
        let buttonWrapper = windowContent.find(".button-wrapper")[0];
        let buttons = buttonWrapper.querySelectorAll("button");

        windowContent[0].addEventListener("mouseleave", async (event) => {
            if (this.showTab == "none" || this.pinnedTab != "none") {
                //if we are already not showing a tab,
                //or we have a tab pinned, return
                return;
            }
            this.showTab = "none";
            await this.ourActor.setFlag("hud-and-trackers", "showTab", "none");
            lastTab = "none";
            this.render();
        });
        let tabs = Array.from(buttons);
        tabs = tabs.filter((btn) => {
            if (btn.classList.contains("show")) {
                return btn;
            }
        });
        let damage = buttonWrapper.querySelector(".damage");
        if (damage) {
            $(damage).click((event) => {
                HelperFunctions.callMacro("Apply Damage to Selected Tokens");
            });
        }
        let effort = buttonWrapper.querySelector(".effort");
        if (effort) {
            $(effort).click((event) => {
                HelperFunctions.callMacro("NPC Effort");
            });
        }
        //go through the tabs,, and add the active class if our show tab
        //shows it as the active class, or pinned class
        tabs.forEach((tab) => {
            let type = tab.dataset.type;
            if (this.showTab == type) {
                $(tab).addClass("active");
            }
            if (this.pinnedTab == type) {
                $(tab).addClass("pinned");
            }
            tab.addEventListener("mouseenter", async (event) => {
                if (this.showTab == type) {
                    return;
                }
                if (this.pinnedTab != "none") {
                    return;
                }
                let element = event.currentTarget;
                Hud.setActive(element);
                this.showTab = type;
                await this.ourActor.setFlag("hud-and-trackers", "showTab", type);
                lastTab = type;
                this.render();
            });
            tab.addEventListener("click", async (event) => {
                //so we want to click to pin, click again to unpin
                if (this.pinnedTab == type) {
                    //if already pinned, unpin, and re-render
                    this.pinnedTab = "none";
                    await this.ourActor.setFlag("hud-and-trackers", "pinnedTab", "none");
                    this.render();
                } else {
                    //if not pinned, pin, and re-render
                    let element = event.currentTarget;
                    Hud.setPinned(element);
                    Hud.setActive(element);
                    this.pinnedTab = type;
                    await this.ourActor.setFlag("hud-and-trackers", "pinnedTab", type);
                    this.render();
                }
            });
        });
        let hudItems = windowContent.find(".hud-item");

        for (let hudItem of hudItems) {
            //if we have an actor connected, get it
            let actor = this.ourActor;

            if (actor) {
                if (actor.data.type == "PC") {
                    hudItem.addEventListener("click", (event) => {
                        event.preventDefault();
                        let item = actor.data.items.find((i) => i.id === event.currentTarget.id);
                        if (event.altKey) {
                            item.sheet.render(true);
                        } else {
                            this.rollAllInOne(item, actor);
                        }
                    });
                } else if (actor.data.type == "NPC") {
                    hudItem.addEventListener("click", (event) => {
                        event.preventDefault();
                        let item = actor.data.items.find((i) => i.id === event.currentTarget.id);
                        item.sheet.render(true);
                    });
                }
                hudItem.addEventListener("mousedown", async (event) => {
                    if (event.which == 3) {
                        //this should unpin enabler
                        let element = event.currentTarget;
                        if (element.parentNode.classList.contains("pinnedDiv")) {
                            let array = this.pinnedItems[element.dataset.type].map((item) => {
                                if (item.hasOwnProperty("name")) {
                                    return new Item(item);
                                } else {
                                    return new Item(item.data);
                                }
                            });
                            array = array.filter((item) => item.id != element.id);
                            this.pinnedItems[element.dataset.type] = array;
                            await this.ourActor.setFlag("hud-and-trackers", "pinnedItems", this.pinnedItems);
                            this.render();
                        } else {
                            //this should pin enabler, but only if it's not already in the pinned abilities
                            let array = this.pinnedItems[element.dataset.type].map((item) => {
                                if (item.hasOwnProperty("name")) {
                                    return new Item(item);
                                } else {
                                    return new Item(item.data);
                                }
                            });
                            let alreadyPinned = array.find((item) => item.id == element.id);
                            if (!alreadyPinned) {
                                let item = this.ourActor.data.items.find((i) => i.id === element.id);
                                array.push(item);
                                this.pinnedItems[element.dataset.type] = array;
                                // this.pinnedAbilities.push(item);
                                await this.ourActor.setFlag("hud-and-trackers", "pinnedItems", this.pinnedItems);
                                this.render();
                            }
                        }
                    }
                });
                //TODO: complete this implementation
                // hudItem.addEventListener("mouseenter", async (event) => {
                //     this.showTooltip(event);
                // });
            }
        }
    }

    rollAllInOne(foundItem, actor) {
        itemRollMacro(actor, foundItem.id, "", "", "", "", "", "", "", "", "", "", "", "", false);
    }

    async getActor(ourToken) {
        return game.actors.get(ourToken.data.actorId);
    }

    getStuffFromSheet(ourActor, type) {
        let items = ourActor.data.items.contents.filter((item) => {
            return item.data.type === type;
        });
        return items.sort().map((item) => this.organizeData(item));
    }
    organizeData(item) {
        let name = item.data.name;
        let id = item.data._id;
        let data = item.data.data;
        let type = data.type;
        let summaryInfo = "";
        let fullInfo = [data.type];
        if (data.notes) {
            fullInfo.push({ name: "Notes", value: data.notes });
        }
        if (data.range) {
            fullInfo.push({ name: "Range", value: data.range });
        }
        let level = data.level || " ";
        let damage = data.damage || " ";
        let costPoints = data.costPoints || " ";
        let costPool = data.costPool || " ";
        let skillRating = data.skillRating || " ";
        switch (type) {
            case "attack":
                summaryInfo += `${damage} dmg`;
                fullInfo.push({ name: "Damage", value: damage });
                break;
            case "ability":
                summaryInfo += `${costPoints}${costPool.charAt(0)}`;
                fullInfo.push({ name: "Cost", value: `${costPoints}${costPool}` });
                break;
            case "skill":
                summaryInfo += `${skillRating?.charAt(0)}`;
                fullInfo.push({ name: "", value: skillRating });
                break;
            case "cypher":
                summaryInfo += `Lvl ${level}`;
                fullInfo.push({ name: "Level", value: level });
                break;
            case "artifact":
                summaryInfo += `Lvl ${level}`;
                fullInfo.push({ name: "Level", value: level });
                break;
        }

        let organized = {
            name: name,
            id: id,
            description: data.description,
            summaryInfo: summaryInfo,
            fullInfo: fullInfo,
        };
        return organized;
    }
}
window.hud = hud;
