"use strict";

import ClockConfig from "./clock.js"
import * as HelperFunctions from "./helper-functions.js"

let hud;
let lastTab = "attacks";
let controlled = false;
let inCombat = false;
let whoseTurn = "fastPlayerTurn";

let initializationStarted = false;
let addedRepTokens = false;
let initializedRepTokens = false;
let turnReset = false;




Handlebars.registerHelper("firstChar", function (strInputCode) {
	return strInputCode.charAt(0);
});

Handlebars.registerHelper("clean", function (strInputCode) {
	if (!strInputCode) {
		return
	}
	let cleanText = strInputCode.replace(/<\/?[^>]+(>|$)/g, "");
	cleanText = cleanText.replace("&quot;", "\"");

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
	game.abilityHud = {}
	game.helperFunctions = HelperFunctions;
})
Hooks.on("canvasReady", () => {
	game.helperHud = new HelperHud().render(true);
})

Hooks.on("controlToken", async (token, isControlled) => {

	console.log("We're handling this many tokens", game.canvas.tokens.controlled.length)
	let ourToken = token;
	if (!isControlled) {
		if (game.canvas.tokens.controlled.length == 0) {
			//** So this will close regardless, as it'll be zero
			//before being set to one 
			//as previous control of the tokens is released
			//if we're controlling zero tokens, close the hud
			// hud.close();
			// hud = null;
		}
	} else if (isControlled) {
		//if we're controlling the token, render a new token hud
		console.log("We're handling this many tokens", game.canvas.tokens.controlled.length)
		if (game.canvas.tokens.controlled.length == 1) {
			//hud will only appear for the first token that was controlled
			if (hud) {
				//if the hud exists, update it's data
				hud.updateData(ourToken);
			} else {
				//create a new hud
				hud = new Hud(ourToken).render(true);
			}
		}
	}
})

function itemRollMacro(actor, itemID, pool, skill, assets, effort1, effort2, additionalSteps, additionalCost, damage, effort3, damagePerLOE, teen, stepModifier, noRoll) {
	// Find actor based on item ID
	const owner = game.actors.find(actor => actor.items.get(itemID));

	// Check for actor that owns the item
	if (!actor || actor.data.type != "PC") return ui.notifications.warn(game.i18n.format("CYPHERSYSTEM.MacroOnlyUsedBy", {
		name: owner.name
	}));

	// Determine the item based on item ID
	const item = actor.items.get(itemID);

	// Check whether the item still exists on the actor
	if (item == null) return ui.notifications.warn(game.i18n.format("CYPHERSYSTEM.MacroOnlyUsedBy", {
		name: owner.name
	}));

	// Check for AiO dialog
	let skipDialog = true;
	if ((game.settings.get("cyphersystem", "itemMacrosUseAllInOne") && !event.altKey) || (!game.settings.get("cyphersystem", "itemMacrosUseAllInOne") && event.altKey)) {
		skipDialog = false;
	};

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
	if (!assets) assets = item.data.data.rollButton.assets;;
	if (!effort1) effort1 = item.data.data.rollButton.effort1;
	if (!effort2) effort2 = item.data.data.rollButton.effort2;
	if (!effort3) effort3 = item.data.data.rollButton.effort3;
	if (!additionalCost) {
		if (item.type == "ability" || item.type == "teen Ability") {
			let checkPlus = item.data.data.costPoints.slice(-1)
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
			stepModifier = (additionalSteps < 0) ? "hindered" : "eased";
		}
	}
	if (!teen) teen = (actor.data.data.settings.gameMode.currentSheet == "Teen") ? true : false;

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

	game.cyphersystem.allInOneRollDialog(actor, pool, skill, assets, effort1, effort2, additionalCost, Math.abs(additionalSteps), stepModifier, itemType + item.name, damage, effort3, damagePerLOE, teen, skipDialog, noRoll, itemID);
	// Parse data to All-in-One Dialog
}

export class HelperHud extends Application {
	constructor() {
		super();
		this.isGM = game.user.isGM;
	}
	/** @override */
	static get defaultOptions() {
		return mergeObject(super.defaultOptions, {
			popOut: true,
			submitOnChange: false,
			closeOnSubmit: false,
			minimizable: false,
			resizable: false,
			background: "none",
			template: 'modules/hud-and-trackers/templates/helper-hud.html',
			id: 'helperHud',
			title: 'helperHud',
			onSubmit: (e) => e.preventDefault(),
		});
	}

	getData() {
		return {
			isGM: this.isGM,
		}
	}

	activateListeners(html) {
		let windowContent = html.closest(".window-content");
		let openCheatSheet = windowContent.find(".openCheatSheet")[0];
		let openLootSheet = windowContent.find(".openLootSheet")[0];


		$(openCheatSheet).click((event)=>{
			HelperFunctions.callMacro("Open Cheat Sheet PDF");
		});
		openLootSheet.addEventListener("click", (event) => {
				let actor = HelperFunctions.getGameActorByName("Party Loot Box")
				actor.sheet.render(true);
			})
		if (this.isGM) {
			//utility stuff
			let changeDisposition = windowContent.find(".changeDisposition")[0];
			let addAttacks = windowContent.find(".addAttacks")[0];
			let addPCs = windowContent.find(".addPCs")[0];
			let addClock = windowContent.find(".addClock")[0];

			addPCs.addEventListener("click", (event) => {
				HelperFunctions.addPCsToScene();
			})
			changeDisposition.addEventListener("click", (event) => {
				HelperFunctions.callMacro("Change Disposition");
			})
			addAttacks.addEventListener("click", (event) => {
				HelperFunctions.callMacro("[Token] Toggle Attacks in Inventory of non-PC Actors")
			})
			addClock.addEventListener("click", (event) => {
				new ClockConfig().render();
			});
		}
		else{
			let selectCharacter = windowContent.find(".selectCharacter")[0];
			let openCharacterSheet = windowContent.find(".openCharacterSheet")[0];
			let swapCharacter = windowContent.find(".swapCharacter")[0];
			selectCharacter.addEventListener("click", (event) => {
				HelperHud.selectMyCharacter();
			})
			swapCharacter.addEventListener("click", async (event) => {
				await HelperFunctions.callMacro("Swap-Characters")
			})
			openCharacterSheet.addEventListener("click", (event) => {
				let actor = HelperFunctions.getActorFromUser(game.user);
				actor.sheet.render(true);
			})
		
		}
	}

	static selectMyCharacter(){
		let actor = HelperFunctions.getActorFromUser(game.user);
		let tokenDoc = HelperFunctions.getSceneTokenFromActor(actor);
		if(tokenDoc){
			tokenDoc.object.control({releaseOthers: true});
		}
		else{
			ui.notifications.warn(`${actor.name} does not have a token on this scene`)
		}
	}

}

export class Hud extends Application {
	updateData(object) {
		this.setFields(object)
		this.render();
	}

	setFields(object) {
		this.isGM = game.user.isGM;
		this.ourToken = object;
		this.ourActor = this.getActor(this.ourToken);
		this.attacks = this.getStuffFromSheet(this.ourToken, "attack")
		this.abilities = this.getStuffFromSheet(this.ourToken, "ability")
		this.skills = this.getStuffFromSheet(this.ourToken, "skill")
		if (!this.ourToken.getFlag("hud-and-trackers", "showTab")) {
			this.showTab = "abilities";
		} else {
			this.showTab = this.ourToken.getFlag("hud-and-trackers", "showTab");
		}
		if (!this.ourToken.getFlag("hud-and-trackers", "pinnedTab")) {
			this.pinnedTab = "none";
		} else {
			this.pinnedTab = this.ourToken.getFlag("hud-and-trackers", "pinnedTab");
		}
		if(!this.ourActor.getFlag("hud-and-trackers", "pinnedAbilities")){
			this.pinnedAbilites = [];
		}
		else{
			this.pinnedAbilites = this.ourActor.getFlag("hud-and-trackers", "pinnedAbilities")
		}
		this.combatActive = inCombat;
	}

	constructor(object) {
		super();
		this.setFields(object);
	}
	/** @override */
	static get defaultOptions() {
		return mergeObject(super.defaultOptions, {
			popOut: true,
			submitOnChange: false,
			closeOnSubmit: false,
			minimizable: false,
			resizable: false,
			background: "none",
			template: 'modules/hud-and-trackers/templates/hud.html',
			id: 'tokenHud',
			title: 'tokenHud',
			onSubmit: (e) => e.preventDefault(),
		});
	}
	async _updateObject(event, formData) {

		console.log(formData);
		this.render();
	}

	async getData() {
		console.log(this.pinnedAbilites);
		console.log(this.ourActor.getFlag("hud-and-trackers", "pinnedAbilities"));
		return {
			ourToken: this.ourToken,
			isGM: this.isGM,
			ourActor: this.ourActor,
			attacks: this.attacks,
			skills: this.skills,
			abilities: this.abilities,
			pinnedAbilites: this.pinnedAbilites,
			showTab: this.ourToken.getFlag("hud-and-trackers", "showTab"),
			combatActive: this.combatActive
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
			sibling = sibling.nextSibling
		}

		return siblings;

	};

	static setActive(element) {
		let siblings = Hud.getSiblings(element);
		siblings.forEach(sibling => {
			if (sibling.classList.contains("active")) {
				$(sibling).removeClass("active")
			}
		});
		$(element).addClass("active");
	}

	static setPinned(element) {
		let siblings = Hud.getSiblings(element);
		siblings.forEach(sibling => {
			if (sibling.classList.contains("pinned")) {
				$(sibling).removeClass("pinned")
			}
		});
		$(element).addClass("pinned");
	}

	static callMacro(name) {
		let macro = game.macros.getName(name);
		if (macro) {
			macro.execute();
		} else {
			ui.notifications.info(`Couldn't find macro named ${name}`)
		}
	}




	activateListeners(html) {
		game.abilityHud = this;

		let windowContent = html.closest(".window-content");
		let buttonWrapper = windowContent.find(".button-wrapper")[0];
		let buttons = buttonWrapper.children;

		windowContent[0].addEventListener("mouseleave", async (event) => {
			if (this.showTab == "none" || this.pinnedTab != "none") {
				//if we are already not showing a tab, 
				//or we have a tab pinned, return
				return;
			}
			this.showTab = "none";
			await this.ourToken.setFlag("hud-and-trackers", "showTab", "none")
			lastTab = "none";
			this.render(true);
		});

		Array.from(buttons).forEach(button => {
			let type = button.dataset.type;
			if (this.showTab == type) {
				$(button).addClass("active");
			}
			if (this.pinnedTab == type) {
				$(button).addClass("pinned");
			}
			button.addEventListener("mouseenter", async (event) => {
				if (this.showTab == type) {
					return;
				}
				if (this.pinnedTab != "none") {
					return;
				}
				let element = event.currentTarget;
				Hud.setActive(element);
				this.showTab = type;
				await this.ourToken.setFlag("hud-and-trackers", "showTab", type)
				lastTab = type;
				this.render(true);
			})
			button.addEventListener("click", async (event) => {
				//so we want to click to pin, click again to unpin
				if (this.pinnedTab == type) {
					//if already pinned, unpin, and re-render
					this.pinnedTab = "none";
					await this.ourToken.setFlag("hud-and-trackers", "pinnedTab", "none")
					this.render(true);
				} else {
					//if not pinned, pin, and re-render
					let element = event.currentTarget;
					Hud.setPinned(element)
					this.pinnedTab = type;
					await this.ourToken.setFlag("hud-and-trackers", "pinnedTab", type)
					this.render(true);
				}
			})
		})
		let hudItems = windowContent.find(".hud-item");

		for (let hudItem of hudItems) {
			//if we have an actor connected, get it
			let actor = this.getActor(this.ourToken);

			if (actor) {
				if (actor.data.type == "PC") {
					hudItem.addEventListener("click", (event) => {
						event.preventDefault();
						let item = actor.data.items.find(i => i.id === event.currentTarget.id);
						this.rollAllInOne(item, actor);
					})
				} else if (actor.data.type == "NPC") {
					hudItem.addEventListener("click", (event) => {
						event.preventDefault();
						let item = actor.data.items.find(i => i.id === event.currentTarget.id);
						item.sheet.render(true);
					})
				}
				hudItem.addEventListener("mousedown", async(event)=> {
					console.log("IS THIS HAPPENING");
					if(event.which == 3){
						//TODO: We want to pin enabler
						//this should unpin enabler
						let element = event.currentTarget;
						if(element.classList.contains("pinned")){
							console.log("Clicking on pinned")
							this.pinnedAbilites = this.pinnedAbilites.filter(item => item.id == element.id);
							await this.ourActor.setFlag("hud-and-trackers", "pinnedAbilities", this.pinnedAbilites);
							console.log(this.ourActor.getFlag("hud-and-trackers", "pinnedAbilities"));
							this.render(true)
						}
						else{
							console.log("Clicking on NOT PINNEd")
							//this should pin enabler, but only if it's not already in the pinned abilities
							let pinned = (this.ourActor.getFlag("hud-and-trackers", "pinnedAbilities"));
							let alreadyPinned = pinned.find(pinnedItem => pinnedItem.id === event.currentTarget.id);
							if(!alreadyPinned){
								let item = this.ourActor.data.items.find(i => i.id === event.currentTarget.id);
								this.pinnedAbilites.push(item);
								await this.ourActor.setFlag("hud-and-trackers", "pinnedAbilities", this.pinnedAbilites);
								console.log(this.pinnedAbilites);
								this.render(true)
							}
						}
					}
				})
			}
		}


	}



	rollAllInOne(foundItem, actor) {
		itemRollMacro(actor, foundItem.id, "", "", "", "", "", "", "", "", "", "", "", "", false);
	}

	getActor(ourToken) {
		return game.actors.get(ourToken.data.actorId);
	}

	getStuffFromSheet(ourToken, type) {
		let actor = this.getActor(ourToken)
		let items = actor.data.items.contents.filter((item) => {
			return item.data.type === type;
		});
		return items.sort();
	}

	// getAttacks(ourToken) {
	// 	if (ourToken.data.actorLink) {
	// 		let actor = game.actors.get(ourToken.data.actorId);
	// 		let attacks = actor.data.items.contents.filter((item) => {
	// 			return item.data.type === "attack";
	// 		});
	// 		return attacks.sort();
	// 	}
	// }
	// getSkills(ourToken) {
	// 	if (ourToken.data.actorLink) {
	// 		let actor = game.actors.get(ourToken.data.actorId);
	// 		let skills = actor.data.items.contents.filter((item) => {
	// 			return item.data.type === "skill";
	// 		});
	// 		return skills.sort();
	// 	}
	// }
	// getAbilities(ourToken) {
	// 	if (ourToken.data.actorLink) {
	// 		let actor = game.actors.get(ourToken.data.actorId);
	// 		let abilities = actor.data.items.contents.filter((item) => {
	// 			return item.data.type === "ability";
	// 		});
	// 		return abilities.sort();
	// 	}
	// }
}
window.hud = hud;