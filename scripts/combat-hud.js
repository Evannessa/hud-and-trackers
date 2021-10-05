import registerSettings from './settings.js'
import * as HelperFunctions from "./helper-functions.js"
import {
	ActivationObject
} from './classes/ActivationObject.js'
let ourCombat;
let combatHud;
let inCombat = false;
let whoseTurn = "fastPlayersTurn";

let initializationStarted = false;
let addedRepTokens = false;
let initializedRepTokens = false;
let turnReset = false;
let socket;

let slowPlayersStore;
let fastPlayersStore;
let enemiesStore;
let npcAlliesStore;

Handlebars.registerHelper("convertToSentence", function (strInputCode) {
	let result = strInputCode.replace(/([A-Z])/g, " $1");
	let finalResult = result.charAt(0).toUpperCase() + result.slice(1);
	return finalResult;
});

Hooks.once("socketlib.ready", () => {
	socket = socketlib.registerModule("hud-and-trackers");
	socket.register("receiveDataAndUpdate", _receiveDataAndUpdate)
	socket.register("requestSetTokenHasActed", CombatHud.requestSetTokenHasActed);
	socket.register("requestIfAllHaveActed", CombatHud.requestIfAllHaveActed);
})

Hooks.on("init", () => {
	game.combatHud = {};
	game.combatHud.startCombat = startCombat;
})

Hooks.on("ready", () => {
	registerSettings();
	combatHud = new CombatHud(combat).render(true);
	game.combatHud.app = combatHud;
})





Hooks.on("ready", () => {

	// if (game.combat && game.user.isGM) {
	// 	game.combat.endCombat();
	// }
})

async function startCombat() {
	let data;
	if (!game.user.isGM) {
		return;
	}
	if (game.combat) {
		game.combat.endCombat();
	} else {
		if (canvas.tokens.controlled.length === 0) {
			let allTokens = game.canvas.tokens.placeables;
			allTokens = allTokens.filter((token) => {
				return (token.actor.data.type == "PC" ||
					token.actor.data.type == "NPC" ||
					token.actor.data.type == "Companion")
			})
			allTokens.forEach((item) => {
				item.control({
					releaseOthers: false
				});
			})
			startCombat();
		} else {
			var combat = ui.combat.combat;
			if (!combat) {
				if (game.user.isGM) {
					combat = await game.combats.documentClass.create({
						scene: canvas.scene.id,
						active: true
					});
				}
			} else {
				combat = game.combat;
			}
			await rollNonCombatInitiative(combat).then(() => {
				createRepTokens(combat).then(() => {
					setRepTokenInitiative(combat).then(() => {
						combat.startCombat();
						combatHud.initOnCombatStart(combat);
					})
				})
			});

		}
	}
}



async function rollNonCombatInitiative(combat) {
	let tokens = game.canvas.tokens.controlled;
	let tokensWithInitiative = {}
	let justTokens = {}
	let fastPlayers = []
	let slowPlayers = []
	let enemies = []
	let npcAllies = []
	let unfilteredPlayers = {}
	for (let token of tokens) {
		let actor = getActor(token);
		let initiative = 0;
		if (actor) {
			initiative = parseInt(actor.data.data.settings.initiative.initiativeBonus);
			if (actor.data.type == "PC") {
				unfilteredPlayers[token.id] = token;
				let r = new Roll('1d20').evaluate().result;
				initiative += parseInt(r);
				tokensWithInitiative[token.id] = initiative;
			} else if (actor.data.type == "NPC" || actor.data.type == "Companion") {
				initiative = parseInt(actor.data.data.level) * 3 + (initiative - 0.5)
				tokensWithInitiative[token.id] = initiative;
			}
		}
		justTokens[token.id] = token;
	}
	//get the enemies by filtering the tokens by disposition 
	enemies = tokens.filter((token) => {
		return token.data.disposition == -1
	})
	npcAllies = tokens.filter((token) => {
		return token.data.disposition == 0
	})

	//find the highest enemy initiative
	let highestEnemyInitiative = 0;
	for (let enemy of enemies) {
		let ini = tokensWithInitiative[enemy.id];
		if (ini > highestEnemyInitiative) {
			highestEnemyInitiative = ini;
		}
	}

	for (let tokenId in tokensWithInitiative) {
		//if the initiative is higher than the enemy
		if (tokensWithInitiative[tokenId] >= highestEnemyInitiative) {
			//push this particular token to the fast players
			if (tokenId in unfilteredPlayers) {
				fastPlayers.push(unfilteredPlayers[tokenId]);
			}
		} else if (tokensWithInitiative[tokenId] < highestEnemyInitiative) {
			if (tokenId in unfilteredPlayers) {
				slowPlayers.push(unfilteredPlayers[tokenId]);
			}
		}
	}

	slowPlayersStore = convertToArrayOfIDs(slowPlayers);
	fastPlayersStore = convertToArrayOfIDs(fastPlayers);
	npcAlliesStore = convertToArrayOfIDs(npcAllies);
	enemiesStore = convertToArrayOfIDs(enemies);
	let activeCategories = {
		slowPlayers: convertToArrayOfIDs(slowPlayers),
		fastPlayers: convertToArrayOfIDs(fastPlayers),
		npcAllies: convertToArrayOfIDs(npcAllies),
		enemies: convertToArrayOfIDs(enemies)
	}
	// CombatHud.activeCategories = activeCategories;
	// await HelperFunctions.setSetting("activeCategories", activeCategories);

}

function convertToArrayOfIDs(array) {
	return array.map(item => {
		return item.id
	})
}

function convertToArrayOfTokens(array) {
	if (!array) {
		return;
	}
	return array.map(id => {
		return game.canvas.tokens.objects.children.find(token => token.id == id)
	})
}


function getActor(ourToken) {
	// 
	return game.actors.get(ourToken.data.actorId);
}



function getCanvasToken(id) {
	return canvas.tokens.get(id);
}

function getGameActor(id) {
	return game.actors.get(id);
}

function findInFolder(folder, name) {
	let item = folder.content.find((actor) => {
		return actor.name == name
	})
	return item;
}

async function createToken(ourActor) {
	let tokenDoc = await Token.create(ourActor.data.token);
	let tokenObject = tokenDoc[0]._object;
	return tokenObject;
}


async function createRepTokens(combat) {

	let repTokens = game.folders.getName("RepTokens");
	let representativeTokens = []
	let tokenData = []

	let enemies = enemiesStore; //CombatHud.getSetting("activeCategories").enemies;
	let npcAllies = npcAlliesStore; //CombatHud.getSetting("activeCategories").npcAllies;
	let fastPlayers = fastPlayersStore; //CombatHud.getSetting("activeCategories").fastPlayers;
	let slowPlayers = slowPlayersStore; //CombatHud.getSetting("activeCategories").slowPlayers;


	//create all the tokens representing the different "Sides"
	for (let repTokenActor of repTokens.content) {
		let newToken;
		if (repTokenActor.name == "FastPlayer" && fastPlayers.length > 0) {
			newToken = await createToken(repTokenActor);
		} else if (repTokenActor.name == "SlowPlayer" && slowPlayers.length > 0) {
			newToken = await createToken(repTokenActor);
		} else if (repTokenActor.name == "NPCAllies" && npcAllies.length > 0) {
			newToken = await createToken(repTokenActor);
		} else if (repTokenActor.name == "Enemies" && enemies.length > 0) {
			newToken = await createToken(repTokenActor);
		}
		if (newToken) {
			representativeTokens.push(newToken);
			tokenData.push(newToken.data);
		}
	}
	// 
	addedRepTokens = true;
	//create all of the representative combatants
	await combat.createEmbeddedDocuments("Combatant", tokenData);
}

async function setRepTokenInitiative(combat) {
	for (let combatant of combat.turns) {
		if (combatant.data.name == "FastPlayer") {
			await combat.setInitiative(combatant.id, 30);
		}
		if (combatant.data.name == "Enemies") {
			await combat.setInitiative(combatant.id, 20);
		}
		if (combatant.data.name == "SlowPlayer") {
			await combat.setInitiative(combatant.id, 10);
		}
		if (combatant.data.name == "NPCAllies") {
			await combat.setInitiative(combatant.id, 3);
		}
	}
	initializedRepTokens = true;
}



let refreshed = false;


;
Hooks.on("updateCombat", async (combat, roundData, diff) => {


	if (roundData.round) {
		//If not undefined, think this means it's a new round?
		// CombatHud.unhighlightAll(canvas.tokens.placeables)
	}
	ourCombat = combat;
	let round = combat.current.round;

	//if we're in combat but we haven't toggled inCombat to true
	if (combat.current.round > 0 && !inCombat) {
		inCombat = true;
	}

	if (round > 0) {
		if (!combatHud) {
			if (game.user.isGM) {
				combatHud = new CombatHud(combat).render(true);
			}
		}
		combatHud.currentRound = round;

		let name = combat.combatant.name;
		if (name == "FastPlayer") {

			combatHud.currentPhase = "fastPlayersTurn"
			console.log("Current phase", combatHud.currentPhase);
			if (game.user.isGM) {
				// await CombatHud.setSetting("currentPhase", "fastPlayersTurn")
			}
			whoseTurn = "fastPlayersTurn"
			// 
		} else if (name == "Enemies") {
			combatHud.currentPhase = "enemiesTurn"
			console.log("Current phase", combatHud.currentPhase);
			if (game.user.isGM) {
				// await CombatHud.setSetting("currentPhase", "enemiesTurn")
			}
			whoseTurn = "enemiesTurn"
			// 
		} else if (name == "SlowPlayer") {
			combatHud.currentPhase = "slowPlayersTurn"
			console.log("Current phase", combatHud.currentPhase);
			if (game.user.isGM) {
				// await CombatHud.setSetting("currentPhase", "slowPlayersTurn")
			}
			whoseTurn = "slowPlayersTurn"
			// 
		} else if (name == "NPCAllies") {
			combatHud.currentPhase = "npcAlliesTurn"
			console.log("Current phase", combatHud.currentPhase);
			if (game.user.isGM) {}
			whoseTurn = "npcAlliesTurn"
		}
	}
});

Hooks.on("deleteCombat", async (combat) => {
	inCombat = false;

	if (game.user.isGM) {
		//here we're gonna delete the phase rep tokens
		let allTokens = game.canvas.tokens.placeables
		let tokensToDelete = [];

		//find all tokens on canvas with names of the phase rep tokens
		allTokens.forEach((token) => {
			if (token.name == "Enemies" || token.name == "FastPlayer" || token.name == "NPCAllies" || token.name == "SlowPlayer") {
				tokensToDelete.push(token.id);
			}
		})
		//delete the ones that match
		game.canvas.tokens.deleteMany(tokensToDelete);
	}
	combatHud.inCombat = false;
	combatHud.currentPhase = "fastPlayersTurn"

})

async function _receiveDataAndUpdate(data) {
	console.log(data);
	console.log("Data received!");
	if (game.combatHud.app) {
		await game.combatHud.app.render();
		game.combatHud.activationObject = new ActivationObject(data.activationObject.activationMap);
		game.combatHud.app.currentPhase = data.currentPhase;
		game.combatHud.app.currentRound = data.currentRound;
		game.combatHud.app.inCombat = data.inCombat;
	}

}
/**
 * @param Combat!
 */
export default class CombatHud extends Application {

	async initOnCombatStart(combat) {
		console.log("INITIALIZING HUD ON COMBAT START")
		this.ourCombat = combat;
		this.inCombat = true;

		let fastPlayers = convertToArrayOfTokens(fastPlayersStore);
		let slowPlayers = convertToArrayOfTokens(slowPlayersStore);
		let enemies = convertToArrayOfTokens(enemiesStore);
		let npcAllies = convertToArrayOfTokens(npcAlliesStore);

		this.activationObject = new ActivationObject({}, fastPlayers, slowPlayers, enemies, npcAllies);
		combatHud.render();
	}



	constructor(object) {
		super();
		this.phases = {
			FASTPC: "fastPlayers",
			SLOWPC: "slowPlayers",
			ENEMY: "enemies",
			NPC: "npcAllies"
		}
		this.data = game.settings.get("hud-and-trackers", "savedCombat");
		this.inCombat = this.data.inCombat;
		if (this.inCombat) {
			this.ourCombat = game.combat;
		}
		this.currentPhase = this.data.currentPhase;
		this.currentRound = this.data.currentRound;
		if(Object.keys(this.data.activationObject).length > 0){
			this.activationObject = new ActivationObject(this.data.activationObject.activationMap);
		}
		else{
			this.activationObject = new ActivationObject();
		}

		// this.render(true)
	}

	static phases = {
		FASTPC: "fastPlayers",
		SLOWPC: "slowPlayers",
		ENEMY: "enemies",
		NPC: "npcAllies"
	}

	static currentPhase;

	static currentRound;

	static inCombat;

	static ID = "combat-hud";

	static ourCombat;

	static activeCategories;

	static allActivationMaps;

	static slowPlayers;
	static fastPlayers;
	static enemies;
	static allies;

	static fastPlayersActivation;
	static slowPlayersActivation;
	static enemiesActivation;
	static npcAlliesActivation;

	static activationObject;


	async manageDisplay(html) {
		Hooks.on("renderCombatHud", async (app, newHtml) => {
			let windowApp = newHtml.closest(".window-app")
			// 
			$(windowApp).css({
				"height": "-moz-max-content",
				"height": "fit-content",
				"width": "-moz-max-content",
				"width": "fit-content"
			})
		})
		Hooks.on("updateSetting", async (setting) => {
			if (setting.key == "hud-and-trackers.savedCombat") {
				let data = await game.settings.get("hud-and-trackers", "savedCombat");
			}
		})

	}

	//TODO: This will happen on a new round
	unhighlightAll(tokens) {
		return;
		// let overlayImg = "modules/hud-and-trackers/images/check-mark.png"
		// tokens.forEach(token => {
		// 	token._toggleOverlayEffect(overlayImg, token);
		// })
	}

	highlightTokenInGroup(tokenId) {
		return;
		// let overlayImg = "modules/hud-and-trackers/images/select.png"
		// let token = getCanvasToken(tokenId);
		// token._toggleOverlayEffect(overlayImg, token);
	}


	static setCanvasTokenActivated(tokenId) {
		return;
		// let overlayImg = "modules/hud-and-trackers/images/check-mark.png"
		// let token = getCanvasToken(tokenId);
		// token._toggleOverlayEffect(overlayImg, token);
	}

	static requestSetTokenHasActed(id, userId) {

		//reject if not the token's owner
		if (this.checkIfUserIsTokenOwner(id, userId) == false) {
			return;
		}
		//find element and add activated class
		let element = game.combatHud.app._element[0].querySelector(`[data-id=${id}]`);
		$(element).addClass("activated")


		//find the canvas on the token and add overlay to show it has acted
		this.setCanvasTokenActivated(element.dataset.id);

		//re-render the hud
		this.activationObject.updateActivations(element.dataset.id);
		this.render();
	}

	static async requestIfAllHaveActed(id) {
		let element = game.combatHud.app._element[0].querySelector(`[data-id=${id}]`);
		let phaseName = element.dataset.phase;
		let map = this.activationObject.getSpecificMap(phaseName);
		//go through the map, find which items are false.
		//if none are false, all of them have acted, so go to the next
		//turn and reset the activations
		//*maybe re-render the combat too?
		let allActed = true;
		for (let mapItem in map) {
			if (!map[mapItem]) {
				allActed = false;
			}
		}
		if (allActed) {
			await this.ourCombat.nextTurn();
			this.resetActivations();
			//apply highlights to tokens in new group
			// CombatHud.highightTokensInGroup(CombatHud.)

			//re-render
			combatHud.render();
		}
	}

	setTokenHasActed(event) {
		//find element in hud, and add class to show it has acted
		let element = event.currentTarget;
		$(element).addClass("activated")


		//update the activations in the activation object to keep track
		this.activationObject.updateActivations(element.dataset.id);

		//find the token on the canvas and set overlay to show it has acted
		// this.setCanvasTokenActivated(element.dataset.id);

		this.render(true);
		//re-render
	}
	//each time an actor is clicked on, check if it's the last. IF so, re-render the thing.
	async checkIfAllHaveActed(event) {
		let element = event.currentTarget;
		let phaseName = element.dataset.phase;
		let map = this.activationObject.getSpecificMap(phaseName);
		//go through the map, find which items are false.
		//if none are false, all of them have acted, so go to the next
		//turn and reset the activations
		//*maybe re-render the combat too?
		let allActed = true;
		for (let mapItem in map) {
			if (!map[mapItem]) {
				allActed = false;
			}
		}
		if (allActed) {
			await this.ourCombat.nextTurn();
			this.resetActivations();
			this.render(true);
		}
	}

	//TODO: This one will unset the tokens if possible
	unsetTokenHasActed() {
		console.log();
	}

	resetActivations() {
		this.activationObject.resetActivations();
	}

	/** @override */
	static get defaultOptions() {
		return mergeObject(super.defaultOptions, {
			popOut: true,
			submitOnChange: false,
			closeOnSubmit: false,
			minimizable: false,
			background: "none",
			bottom: 10,
			left: 810,
			template: 'modules/hud-and-trackers/templates/combat-hud.html',
			id: 'combatHud',
			title: 'combatHud',
			onSubmit: (e) => e.preventDefault(),
		});
	}
	async _updateObject(event, formData) {
		console.log(formData);
	}

	getData() {


		if (game.user.isGM) {
			return {
				activationObject: this.activationObject,
				combatActive: this.inCombat,
				fastPlayers: convertToArrayOfTokens(Object.keys(this.returnObjectOrEmpty("fastPlayers"))),
				slowPlayers: convertToArrayOfTokens(Object.keys(this.returnObjectOrEmpty("slowPlayers"))),
				enemies: convertToArrayOfTokens(Object.keys(this.returnObjectOrEmpty("enemies"))),
				npcAllies: convertToArrayOfTokens(Object.keys(this.returnObjectOrEmpty("npcAllies"))),
				currentPhase: this.currentPhase,
				currentRound: this.currentRound
			}
		} else {
			this.data = game.settings.get("hud-and-trackers", "savedCombat");
			this.inCombat = this.data.inCombat;
			if (this.inCombat) {
				this.ourCombat = game.combat;
			}
			this.currentPhase = this.data.currentPhase;
			this.currentRound = this.data.currentRound;
			this.activationObject = new ActivationObject(this.data.activationObject.activationMap);
			return {
				activationObject: this.activationObject,
				combatActive: this.inCombat,
				fastPlayers: convertToArrayOfTokens(Object.keys(this.returnObjectOrEmpty("fastPlayers"))),
				slowPlayers: convertToArrayOfTokens(Object.keys(this.returnObjectOrEmpty("slowPlayers"))),
				enemies: convertToArrayOfTokens(Object.keys(this.returnObjectOrEmpty("enemies"))),
				npcAllies: convertToArrayOfTokens(Object.keys(this.returnObjectOrEmpty("npcAllies"))),
				currentPhase: this.currentPhase,
				currentRound: this.currentRound
			}
		}
	}

	returnObjectOrEmpty(name) {
		let outerMap = this.activationObject.activationMap;
		if (outerMap == undefined) {
			return {};
		}
		let map = outerMap[name];
		if (map) {
			return map;
		} else {
			return {};
		}
	}

	convertToProperObject(object) {
		let oldObject = object;
		if (Object.keys(oldObject).length > 0) {
			this.activationObject = new ActivationObject(null, null, null, null, object)
		}
	}

	async activateListeners(html) {

		console.log("Activating listeners again")
		let data = {
			ourCombat: this.ourCombat,
			currentPhase: this.currentPhase,
			currentRound: this.currentRound,
			inCombat: this.inCombat,
			activationObject: this.activationObject,
		}
		console.log(data);

		if (game.user.isGM) {
			await game.settings.set("hud-and-trackers", "savedCombat", data);
		} else {
			//PROBLEM IS THE RE-RENDERING. DATA SETTINGS GETTING WIPED EACH TIME.
			let data2 = await game.settings.get("hud-and-trackers", "savedCombat");
			console.log(data2);

		}

		//set the hooks and stuff
		this.manageDisplay(html);

		//remove app from "ui.windows" to not let it close with the escape key
		delete ui.windows[this.appId];

		let windowContent = html.closest(".window-content");
		let combatantDivs = windowContent.find(".combatant-div");


		//check if in combat
		if (this.inCombat) {

			//find the in combat button, and allow only the GM to click it
			let endCombat = windowContent.find(".endCombat")[0];
			if (game.user.isGM) {
				endCombat.addEventListener("click", async (event) => {
					await this.ourCombat.endCombat();
					
					let defaultData = {
						ourCombat: null,
						currentPhase: "fastPlayersTurn",
						currentRound: 0,
						inCombat: false,
						activationObject: {},
					}
					await game.settings.set("hud-and-trackers", "savedCombat", defaultData);
					game.combatHud.app.render();
				})
			}
			for (let combatantDiv of combatantDivs) {

				this.highlightTokenInGroup(combatantDiv.dataset.id)
				let token = getCanvasToken(combatantDiv.dataset.id);
				token.update({
					tint: "#FFFFFF"
				})
				$(combatantDiv).mouseenter((event) => {
					token.update({
						tint: "#FF5733"
					})
				})

				$(combatantDiv).mouseleave((event) => {
					token.update({
						tint: "#FFFFFF"
					})
				})

				$(combatantDiv).mousedown((event) => {
					if (event.which == 3) {
						//right click
						if (!game.user.isGM) {
							socket.executeAsGM("requestSetTokenHasActed", combatantDiv.dataset.id, game.userId)
							socket.executeAsGM("requestIfAllHaveActed", combatantDiv.dataset.id)
						} else {
							this.setTokenHasActed(event);
							this.checkIfAllHaveActed(event)
						}
					} else if (event.which == 1) {
						if (game.user.isGM) {
							let token = getCanvasToken(combatantDiv.dataset.id);
							token.control({
								releaseOthers: true
							});
						}
					}

				})
				let map = this.activationObject.getSpecificMap(combatantDiv.dataset.phase);
				for (let id in map) {
					if (combatantDiv.dataset.id == id) {
						if (map[id] == true) {
							$(combatantDiv).addClass("activated");
						}
					}
				}
			}
		} else {
			let startCombatBtn = windowContent.find(".startCombatButton");
			startCombatBtn.click((event) => {
				startCombat();
			})
		}

		//send the data once all the GM's stuff has been activated
		if (game.user.isGM) {
			console.log("Sharing this data with players", this.data)
			this.shareApp();
		}
	}

	getElementFromParent(element, elementSelector) {
		let windowContent = element.closest(".window-content");
		return windowContent.querySelector(elementSelector);
	}

	checkIfUserIsTokenOwner(tokenId, userId) {
		let token = getCanvasToken(tokenId);
		let actor = getActor(token)
		let permission = actor.data.permission[userId];
		if (permission == 3) {
			return true
		} else {
			return false;
		}
	}

	shareApp() {
		let data = {
			activationObject: this.activationObject,
			currentPhase: this.currentPhase,
			currentRound: this.currentRound,
			inCombat: this.inCombat
		}
		console.log(data)
		socket.executeForOthers("receiveDataAndUpdate", data);
	}

	static _receiveDataAndUpdate(data) {
		console.log(data);
		console.log("Data received!");
		this.activationObject = new ActivationObject(data.activationObject.activationMap);
		this.currentPhase = data.currentPhase;
		this.currentRound = data.currentRound;
		this.inCombat = data.inCombat;
		this.render(true);
		// game.combatHud.app.render();
	}



}
window.combatHud = combatHud;