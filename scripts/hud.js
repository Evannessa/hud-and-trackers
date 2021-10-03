"use strict";

let hud;
let lastTab = "attacks";
let controlled = false;
let inCombat = false;
let whoseTurn = "fastPlayerTurn";

let initializationStarted = false;
let addedRepTokens = false;
let initializedRepTokens = false;
let turnReset = false;





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



export class Hud extends Application {
	updateData(object) {
		this.ourToken = object;
		this.ourActor = this.getActor(this.ourToken);
		this.attacks = this.getAttacks(this.ourToken);
		this.skills = this.getSkills(this.ourToken);
		this.abilities = this.getAbilities(this.ourToken);
		if (!this.ourToken.getFlag("hud-and-trackers", "showTab")) {
			this.showTab = "abilities";
		} else {
			this.showTab = this.ourToken.getFlag("hud-and-trackers", "showTab");
		}
		this.combatActive = inCombat;
		this.render();
	}
	constructor(object) {
		super();
		this.ourToken = object;
		this.ourActor = this.getActor(this.ourToken);
		this.attacks = this.getAttacks(this.ourToken);
		this.skills = this.getSkills(this.ourToken);
		this.abilities = this.getAbilities(this.ourToken);
		if (!this.ourToken.getFlag("hud-and-trackers", "showTab")) {
			this.showTab = "abilities";
		} else {
			this.showTab = this.ourToken.getFlag("hud-and-trackers", "showTab");
		}
		this.combatActive = inCombat;
	}
	/** @override */
	static get defaultOptions() {
		return mergeObject(super.defaultOptions, {
			popOut: true,
			submitOnChange: false,
			closeOnSubmit: false,
			minimizable: false,
			resizable: true,
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

	getData() {
		return {
			ourToken: this.ourToken,
			ourActor: this.ourActor,
			attacks: this.attacks,
			skills: this.skills,
			abilities: this.abilities,
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

	static setActive(element){
			console.log(element);
			let siblings = Hud.getSiblings(element);
			siblings.forEach(sibling => {
				if (sibling.classList.contains("active")) {
					$(sibling).removeClass("active")
				}
			});
			$(element).addClass("active");
	}


	activateListeners(html) {
		game.abilityHud = this;

		console.log("Our current tab is", this.showTab)
		let windowContent = html.closest(".window-content");
		let buttonWrapper = windowContent.find(".button-wrapper")[0];
		let buttons = buttonWrapper.children;
		windowContent[0].addEventListener("mouseleave", async (event)=> {
			if(this.showTab == "none"){
					return;
			}
			this.showTab = "none";
			await this.ourToken.setFlag("hud-and-trackers", "showTab", "none")
			lastTab = "none";
			this.render(true);
		});
		Array.from(buttons).forEach(button => {
			let type = button.dataset.type;
			if(this.showTab == type){
				$(button).addClass("active");
			}
			button.addEventListener("mouseenter", async (event)=>{
				if(this.showTab == type){
					return;
				}
				let element = event.currentTarget;
				Hud.setActive(element);
				this.showTab = type;
				await this.ourToken.setFlag("hud-and-trackers", "showTab", type)
				lastTab = type;
				this.render(true);
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
						console.log(event.currentTarget.id);
						let item = actor.data.items.find(i => i.id === event.currentTarget.id);
						item.sheet.render(true);
					})
				}
			}
		}
	}

	rollAllInOne(foundItem, actor) {
		itemRollMacro(actor, foundItem.id, "", "", "", "", "", "", "", "", "", "", "", "", false);
	}

	getActor(ourToken) {
		return game.actors.get(ourToken.data.actorId);
	}

	getAttacks(ourToken) {
		if (ourToken.data.actorLink) {
			let actor = game.actors.get(ourToken.data.actorId);
			let attacks = actor.data.items.contents.filter((item) => {
				return item.data.type === "attack";
			});
			return attacks.sort();
		}
	}
	getSkills(ourToken) {
		if (ourToken.data.actorLink) {
			let actor = game.actors.get(ourToken.data.actorId);
			let skills = actor.data.items.contents.filter((item) => {
				return item.data.type === "skill";
			});
			return skills.sort();
		}
	}
	getAbilities(ourToken) {
		if (ourToken.data.actorLink) {
			let actor = game.actors.get(ourToken.data.actorId);
			let abilities = actor.data.items.contents.filter((item) => {
				return item.data.type === "ability";
			});
			return abilities.sort();
		}
	}
}
window.hud = hud;