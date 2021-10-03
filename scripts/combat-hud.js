import registerSettings from './settings.js'
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
	socket.register("receiveDataAndUpdate", CombatHud._receiveDataAndUpdate)
	socket.register("requestSetTokenHasActed", CombatHud.requestSetTokenHasActed);
	socket.register("requestIfAllHaveActed", CombatHud.requestIfAllHaveActed);
})

Hooks.on("init", () => {
	game.combatHud = {};
	game.combatHud.startCombat = startCombat;
})

Hooks.on("ready", () => {
	registerSettings();
	game.settings.get("combat-hud", "activationObject", {});
	combatHud = new CombatHud(combat).render(true);
	game.combatHud.app = combatHud;
})

Hooks.on("renderSidebarTab", (app, html) => {
	if (!game.user.isGM) {
		return;
	}
	if (app.options.id == "combat") {
		let button = $("<button>Start Combat</button>");
		button.click(startCombat);
		html.find(".directory-footer").prepend(button);
	}

});



Hooks.on("ready", () => {

	if (game.combat && game.user.isGM) {
		game.combat.endCombat();
	}
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
						CombatHud.initOnCombatStart(combat);
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
	CombatHud.activeCategories = activeCategories;
	await CombatHud.setSetting("activeCategories", activeCategories);

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
		CombatHud.currentRound = round;

		let name = combat.combatant.name;
		if (name == "FastPlayer") {

			CombatHud.currentPhase = "fastPlayersTurn"
			console.log("Current phase", CombatHud.currentPhase);
			if (game.user.isGM) {
				// await CombatHud.setSetting("currentPhase", "fastPlayersTurn")
			}
			whoseTurn = "fastPlayersTurn"
			// 
		} else if (name == "Enemies") {
			CombatHud.currentPhase = "enemiesTurn"
			console.log("Current phase", CombatHud.currentPhase);
			if (game.user.isGM) {
				// await CombatHud.setSetting("currentPhase", "enemiesTurn")
			}
			whoseTurn = "enemiesTurn"
			// 
		} else if (name == "SlowPlayer") {
			CombatHud.currentPhase = "slowPlayersTurn"
			console.log("Current phase", CombatHud.currentPhase);
			if (game.user.isGM) {
				// await CombatHud.setSetting("currentPhase", "slowPlayersTurn")
			}
			whoseTurn = "slowPlayersTurn"
			// 
		} else if (name == "NPCAllies") {
			CombatHud.currentPhase = "npcAlliesTurn"
			console.log("Current phase", CombatHud.currentPhase);
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
	CombatHud.inCombat = false;
	CombatHud.currentPhase = "fastPlayersTurn"

})


/**
 * @param Combat!
 */
export default class CombatHud extends Application {

	static async initOnCombatStart(combat) {
		CombatHud.ourCombat = combat;
		CombatHud.inCombat = true;

		let fastPlayers = convertToArrayOfTokens(fastPlayersStore);
		let slowPlayers = convertToArrayOfTokens(slowPlayersStore);
		let enemies = convertToArrayOfTokens(enemiesStore);
		let npcAllies = convertToArrayOfTokens(npcAlliesStore);

		CombatHud.activationObject = new ActivationObject({}, fastPlayers, slowPlayers, enemies, npcAllies);
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
	}

	static phases = {
		FASTPC: "fastPlayers",
		SLOWPC: "slowPlayers",
		ENEMY: "enemies",
		NPC: "npcAllies"
	}

	static currentPhase = "fastPlayersTurn";

	static currentRound = 1;

	static inCombat = false;

	static ID = "combat-hud";

	static ourCombat;

	static activeCategories = {}

	static allActivationMaps = {};

	static slowPlayers;
	static fastPlayers;
	static enemies;
	static allies;

	static fastPlayersActivation;
	static slowPlayersActivation;
	static enemiesActivation;
	static npcAlliesActivation;

	static activationObject = {};


	static manageDisplay(html) {
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
	}

	//TODO: This will happen on a new round
	static unhighlightAll(tokens) {
		return;
		// let overlayImg = "modules/hud-and-trackers/images/check-mark.png"
		// tokens.forEach(token => {
		// 	token._toggleOverlayEffect(overlayImg, token);
		// })
	}

	static highlightTokenInGroup(tokenId) {
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


	static async pullValues() {
		console.log("Before", CombatHud.currentPhase)
		CombatHud.currentPhase = await CombatHud.getSetting("currentPhase");
		console.log("After", CombatHud.currentPhase)
		CombatHud.currentRound = game.combat ? game.combat.round : await CombatHud.getSetting("currentRound"); // get the current round getSetting("currentRound");
		CombatHud.activationObject = ActivationObject.fromJSON(await CombatHud.getSetting("activationObject"));


		CombatHud.combatActive = await CombatHud.getSetting("combatActive");

		CombatHud.activeCategories = await CombatHud.getSetting("activeCategories");
		CombatHud.allActivationMaps = await CombatHud.getSetting("activationMaps");
	}


	static async updateApp() {
		//save the values
		const combas = document.querySelectorAll(".combatant-div");
		if (game.user.isGM) {
			await CombatHud.setSetting("currentPhase", CombatHud.currentPhase);
			await CombatHud.setSetting("currentRound", CombatHud.currentRound);
			await CombatHud.setSetting("activationObject", CombatHud.activationObject);
			await CombatHud.setSetting("combatActive", CombatHud.combatActive);

			CombatHud.setSetting("activeCategories", CombatHud.activeCategories);
			CombatHud.setSetting("activationMaps", CombatHud.allActivationMaps);
		}
	}

	static async setSetting(settingName, value) {
		await game.settings.set(CombatHud.ID, settingName, value);
	}
	static async getSetting(settingName) {
		let settingValue = await game.settings.get(CombatHud.ID, settingName);
		return settingValue;
	}

	static requestSetTokenHasActed(id, userId) {

		//reject if not the token's owner
		if (CombatHud.checkIfUserIsTokenOwner(id, userId) == false) {
			return;
		}
		//find element and add activated class
		let element = game.combatHud.app._element[0].querySelector(`[data-id=${id}]`);
		$(element).addClass("activated")


		//find the canvas on the token and add overlay to show it has acted
		CombatHud.setCanvasTokenActivated(element.dataset.id);

		//re-render the hud
		CombatHud.activationObject.updateActivations(element.dataset.id);
		combatHud.render();
	}

	static async requestIfAllHaveActed(id) {
		let element = game.combatHud.app._element[0].querySelector(`[data-id=${id}]`);
		let phaseName = element.dataset.phase;
		let map = CombatHud.activationObject.getSpecificMap(phaseName);
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
			await CombatHud.ourCombat.nextTurn();
			CombatHud.resetActivations();
			//apply highlights to tokens in new group
			// CombatHud.highightTokensInGroup(CombatHud.)

			//re-render
			combatHud.render();
		}
	}

	static setTokenHasActed(event) {
		//find element in hud, and add class to show it has acted
		let element = event.currentTarget;
		$(element).addClass("activated")


		//update the activations in the activation object to keep track
		CombatHud.activationObject.updateActivations(element.dataset.id);

		//find the token on the canvas and set overlay to show it has acted
		CombatHud.setCanvasTokenActivated(element.dataset.id);

		//re-render
		combatHud.render();
	}
	//each time an actor is clicked on, check if it's the last. IF so, re-render the thing.
	static async checkIfAllHaveActed(event) {
		let element = event.currentTarget;
		let phaseName = element.dataset.phase;
		let map = CombatHud.activationObject.getSpecificMap(phaseName);
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
			await CombatHud.ourCombat.nextTurn();
			CombatHud.resetActivations();
			combatHud.render();
		}
	}

	//TODO: This one will unset the tokens if possible
	unsetTokenHasActed() {
		console.log();
	}

	static resetActivations() {
		CombatHud.activationObject.resetActivations();
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
		return {
			activationObject: CombatHud.activationObject,
			combatActive: CombatHud.inCombat,
			fastPlayers: convertToArrayOfTokens(Object.keys(CombatHud.returnObjectOrEmpty("fastPlayers"))),
			slowPlayers: convertToArrayOfTokens(Object.keys(CombatHud.returnObjectOrEmpty("slowPlayers"))),
			enemies: convertToArrayOfTokens(Object.keys(CombatHud.returnObjectOrEmpty("enemies"))),
			npcAllies: convertToArrayOfTokens(Object.keys(CombatHud.returnObjectOrEmpty("npcAllies"))),
			currentPhase: CombatHud.currentPhase,
			currentRound: CombatHud.currentRound
		};
	}

	static returnObjectOrEmpty(name) {
		let outerMap = CombatHud.activationObject.activationMap;
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

	static convertToProperObject(object) {
		let oldObject = object;
		if (Object.keys(oldObject).length > 0) {
			CombatHud.activationObject = new ActivationObject(null, null, null, null, object)
		}
	}

	activateListeners(html) {

		console.log("Activating listeners again")

		//set the hooks and stuff
		CombatHud.manageDisplay(html);

		//remove app from "ui.windows" to not let it close with the escape key
		delete ui.windows[this.appId];

		let windowContent = html.closest(".window-content");
		let combatantDivs = windowContent.find(".combatant-div");


		//check if in combat
		if (CombatHud.inCombat) {

			//find the in combat button, and allow only the GM to click it
			let endCombat = windowContent.find(".endCombat")[0];
			if (game.user.isGM) {
				endCombat.addEventListener("click", async (event) => {
					await CombatHud.ourCombat.endCombat();
					game.combatHud.app.render();
				})
			}
			for (let combatantDiv of combatantDivs) {

				CombatHud.highlightTokenInGroup(combatantDiv.dataset.id)
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
							CombatHud.setTokenHasActed(event);
							CombatHud.checkIfAllHaveActed(event)
						} 
					}
					else if (event.which == 1) {
						if(game.user.isGM){
							let token = getCanvasToken(combatantDiv.dataset.id);
							token.control({releaseOthers: true});
						}
					}
					
				})
				let map = CombatHud.activationObject.getSpecificMap(combatantDiv.dataset.phase);
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
			CombatHud.shareApp();
		}
	}

	static getElementFromParent(element, elementSelector) {
		let windowContent = element.closest(".window-content");
		return windowContent.querySelector(elementSelector);
	}

	static checkIfUserIsTokenOwner(tokenId, userId) {
		let token = getCanvasToken(tokenId);
		let actor = getActor(token)
		let permission = actor.data.permission[userId];
		if (permission == 3) {
			return true
		} else {
			return false;
		}
	}

	static shareApp() {
		let data = {
			activationObject: CombatHud.activationObject,
			currentPhase: CombatHud.currentPhase,
			currentRound: CombatHud.currentRound,
			inCombat: CombatHud.inCombat
		}
		socket.executeForOthers("receiveDataAndUpdate", data);
	}

	static _receiveDataAndUpdate(data) {
		console.log("Data received!");
		CombatHud.activationObject = new ActivationObject(data.activationObject.activationMap);
		CombatHud.currentPhase = data.currentPhase;
		CombatHud.currentRound = data.currentRound;
		CombatHud.inCombat = data.inCombat;
		game.combatHud.app.render();
	}



}
window.combatHud = combatHud;