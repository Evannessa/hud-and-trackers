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
	socket.register("requestSetTokenHasActed", _requestSetTokenHasActed);
	socket.register("requestIfAllHaveActed", _requestIfAllHaveActed);
})

Hooks.on("init", () => {
	game.combatHud = {};
	game.combatHud.startCombat = startCombat;
})

Hooks.on("ready", () => {
	registerSettings();
	combatHud = new CombatHud(combat).render(true);
	game.combatHud.app = combatHud;
	createRepresentativeActors();
})





Hooks.on("ready", () => {

	// if (game.combat && game.user.isGM) {
	// 	game.combat.endCombat();
	// }
})

async function createRepresentativeActors(){
	let repTokens = game.folders.getName("RepTokens");
	if (!repTokens) {
		await Folder.create({
				name: "RepTokens",
				type: "Actor"
			})
			.then(parentFolder => {
				Actor.create({
					name: "FastPlayer",
					type: "NPC",
					folder: parentFolder.id
				});
				Actor.create({
					name: "SlowPlayer",
					type: "NPC",
					folder: parentFolder.id
				});
				Actor.create({
					name: "NPCAllies",
					type: "NPC",
					folder: parentFolder.id
				});
				Actor.create({
					name: "Enemies",
					type: "NPC",
					folder: parentFolder.id
				});
			});
	}
}

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


/**
 * We're rolling a "Fake" initiative to determine what category
 * the various combatants go into
 * @param {combat} combat - the specific combat that's just been started
 */
async function rollNonCombatInitiative(combat) {
	let tokens = game.canvas.tokens.controlled;
	let tokensWithInitiative = {}
	let justTokens = {}
	let fastPlayers = []
	let slowPlayers = []
	let enemies = []
	let npcAllies = []
	let unfilteredPlayers = {}

	// this will make sure there are no duplicate tokens w/ the same actor,
	// which CAN be a problem if not players.
	let npcTokens = tokens.filter(token => token.actor.type == "NPC" || token.actor.type == "Companion")
	let playerTokens = tokens.filter(token => token.actor.type == "PC");
	playerTokens = Array.from(new Set(tokens.map(token => token.actor.name)))
		.map(actorName => {
			return tokens.find(token => token.actor.name == actorName);
	})
	tokens = [...playerTokens, ...npcTokens];

	for (let token of tokens) {
		let actor = getActor(token);
		let initiative = 0;
		if (actor) {
			initiative = parseInt(actor.data.data.settings.initiative.initiativeBonus);
			if (actor.data.type == "PC") {
				//if this token id is not already in there
				//not working because tokens w/ same actor might have different id
				unfilteredPlayers[token.id] = token;
				let r = new Roll('1d20').evaluate("async=true").result;
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

	//this will make sure there are no duplicate tokens w/ the same actor,
	//which CAN be a problem if not players.
	// let tokens = Array.from(new Set(controlledTokens.map(token => token.actor.name)))
	// 	.map(actorName => {
	// 		return controlledTokens.find(token => token.actor.name == actorName);
	// })

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
}

/**
 * 
 * @param {array} array an array of tokens we want to convert to an array of token ids
 * @returns an array of token ids from the tokens
 */
function convertToArrayOfIDs(array) {
	return array.map(item => {
		return item.id
	})
}
/**
 * 
 * @param {array} array an array of token ids we want to convert to tokens
 * @returns an array of tokens
 */
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

async function createToken(ourActor) {
	let tokenDoc = await Token.create(ourActor.data.token);
	let tokenObject = tokenDoc[0]._object;
	return tokenObject;
}
async function createTokenFromActor(ourActor, scene){
	let tk = duplicate(ourActor.data.token);
	tk.x = 100;
	tk.y = 100;
	let tokenDoc = await scene.createEmbeddedDocuments("Token", tk)
	return tokenDoc;
}

async function createRepTokens(combat) {

	let repTokens = game.folders.getName("RepTokens");
	if (!repTokens) {
		await Folder.create({
				name: "RepTokens",
				type: "Actor"
			})
			.then(parentFolder => {
				Actor.create({
					name: "FastPlayer",
					type: "NPC",
					folder: parentFolder.id
				});
				Actor.create({
					name: "SlowPlayer",
					type: "NPC",
					folder: parentFolder.id
				});
				Actor.create({
					name: "NPCAllies",
					type: "NPC",
					folder: parentFolder.id
				});
				Actor.create({
					name: "Enemies",
					type: "NPC",
					folder: parentFolder.id
				});
			});
	}
	let representativeTokens = []
	let tokenData = []

	let enemies = enemiesStore; //CombatHud.getSetting("activeCategories").enemies;
	let npcAllies = npcAlliesStore; //CombatHud.getSetting("activeCategories").npcAllies;
	let fastPlayers = fastPlayersStore; //CombatHud.getSetting("activeCategories").fastPlayers;
	let slowPlayers = slowPlayersStore; //CombatHud.getSetting("activeCategories").slowPlayers;

	console.log("Stored values", enemies, npcAllies, fastPlayers, slowPlayers);

	//create all the tokens representing the different "Sides"
	let scene = game.scenes.viewed;
	let tokenActors = repTokens.content;
	if(slowPlayers.length == 0){
		tokenActors = tokenActors.filter(actor => actor.name != "SlowPlayer")
	}
	if(fastPlayers.length == 0){
		tokenActors = tokenActors.filter(actor => actor.name != "FastPlayer")
	}
	if(npcAllies.length == 0){
		tokenActors = tokenActors.filter(actor => actor.name != "NPCAllies")
	}
	if(enemies.length == 0){
		tokenActors = tokenActors.filter(actor => actor.name != "Enemies")
	}
	console.log(tokenActors);
	tokenData = tokenActors.map(actor => actor.data.token);
	console.log(tokenData);
	scene.createEmbeddedDocuments("Token", tokenData);
	// for (let repTokenActor of repTokens.content) {
	// 	let newToken;
	// 	let scene = game.scenes.viewed;
	// 	if (repTokenActor.name == "FastPlayer" && fastPlayers.length > 0) {
	// 		newToken = await createTokenFromActor(repTokenActor, scene);
	// 	} else if (repTokenActor.name == "SlowPlayer" && slowPlayers.length > 0) {
	// 		newToken = await createTokenFromActor(repTokenActor, scene);
	// 		// newToken = await HelperFunctions.createTokenFromActor(repTokenActor, scene);
	// 	} else if (repTokenActor.name == "NPCAllies" && npcAllies.length > 0) {
	// 		newToken = await createTokenFromActor(repTokenActor, scene);
	// 		// newToken = await HelperFunctions.createTokenFromActor(repTokenActor, scene);
	// 	} else if (repTokenActor.name == "Enemies" && enemies.length > 0) {
	// 		newToken = await createTokenFromActor(repTokenActor, scene);
	// 		// newToken = await HelperFunctions.createTokenFromActor(repTokenActor, scene);
	// 	}
	// 	if (newToken) {
	// 		representativeTokens.push(newToken);
	// 		tokenData.push(newToken.data);
	// 	}
	// }
	// 
	addedRepTokens = true;
	//create all of the representative combatants
	await combat.createEmbeddedDocuments("Combatant", tokenData);
}

async function setRepTokenInitiative(combat) {
	for (let combatant of combat.turns) {
		console.log(combatant);
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



Hooks.on("updateCombat", async (combat, roundData, diff) => {


	if (roundData.round) {
		//If not undefined, think this means it's a new round?
		game.combatHud.app.unhighlightAll(canvas.tokens.placeables)
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
			if (game.user.isGM) {
				// await CombatHud.setSetting("currentPhase", "fastPlayersTurn")
			}
			whoseTurn = "fastPlayersTurn"
			// 
		} else if (name == "Enemies") {
			combatHud.currentPhase = "enemiesTurn"
			if (game.user.isGM) {
				// await CombatHud.setSetting("currentPhase", "enemiesTurn")
			}
			whoseTurn = "enemiesTurn"
			// 
		} else if (name == "SlowPlayer") {
			combatHud.currentPhase = "slowPlayersTurn"
			if (game.user.isGM) {
				// await CombatHud.setSetting("currentPhase", "slowPlayersTurn")
			}
			whoseTurn = "slowPlayersTurn"
			// 
		} else if (name == "NPCAllies") {
			combatHud.currentPhase = "npcAlliesTurn"
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
		let scene = game.scenes.viewed;
		let tokensToDelete = [];

		//find all tokens on canvas with names of the phase rep tokens
		allTokens.forEach((token) => {
			if (token.name == "Enemies" || token.name == "FastPlayer" || token.name == "NPCAllies" || token.name == "SlowPlayer") {
				tokensToDelete.push(token.id);
			}
		})
		//delete the ones that match
		scene.deleteEmbeddedDocuments("Token", tokensToDelete);
	}
	combatHud.inCombat = false;
	combatHud.currentPhase = "fastPlayersTurn"

})
	async function _requestSetTokenHasActed(id, userId) {

		console.log(game.combatHud.app);
		//reject if not the token's owner
		if (game.combatHud.app.checkIfUserIsTokenOwner(id, userId) == false) {
			return;
		}
		//find element and add activated class
		let element = game.combatHud.app._element[0].querySelector(`[data-id=${id}]`);
		$(element).addClass("activated")


		//find the canvas on the token and add overlay to show it has acted
		game.combatHud.app.setCanvasTokenActivated(element.dataset.id);

		//re-render the hud
		game.combatHud.app.activationObject.updateActivations(element.dataset.id);
		game.combatHud.app.render();
	}

	async function _requestIfAllHaveActed(id) {
		let element = game.combatHud.app._element[0].querySelector(`[data-id=${id}]`);
		let phaseName = element.dataset.phase;
		let map = game.combatHud.app.activationObject.getSpecificMap(phaseName);
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
			await game.combatHud.app.ourCombat.nextTurn();
			game.combatHud.app.resetActivations();
			//apply highlights to tokens in new group
			// CombatHud.highightTokensInGroup(CombatHud.)

			//re-render
			combatHud.render();
		}
	}

async function _receiveDataAndUpdate(data) {
	console.log(data);
	console.log("Data received!");
	if (game.combatHud.app) {
		await game.combatHud.app.render();
		game.combatHud.app.activationObject = new ActivationObject(data.activationObject.activationMap);
		game.combatHud.app.currentPhase = data.currentPhase;
		game.combatHud.app.currentRound = data.currentRound;
		game.combatHud.app.inCombat = data.inCombat;
	}

}

function createMarkerOnToken(token, hasActed){
	console.log(`Creating marker. Has ${token.name} acted?`, hasActed);
	let color;
	if(token.marker){
		token.marker.destroy();
	}

	if(hasActed){
		color = 0x00DD;
	}
	else{
		color = 0xd53510; 
	}
	
	token.marker = token.addChildAt(new PIXI.Container(), token.getChildIndex(token.icon));
	const frameWidth = canvas.grid.grid.w;
	const g = new PIXI.Graphics();
	token.marker.addChild(g);
	g.beginFill(color, 0.5);
	g.drawCircle(token.w/2, token.h/2, 100);
	g.endFill();
}
function removeMarkerOnToken(token){
	if(token.marker){
		token.marker.destroy();
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
		this.currentRound = ourCombat.current.round;
		//if we have no fast players
		if(fastPlayers.length == 0){
			//set the first turn to ememies
			this.currentPhase = "enemiesTurn"
		}
		else{
			//otherwise, if we have no enemies, we should always have fast players, as there were no enemies to compare to
			this.currentPhase = "fastPlayersTurn"
		}

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
		if (Object.keys(this.data.activationObject).length > 0) {
			this.activationObject = new ActivationObject(this.data.activationObject.activationMap);
		} else {
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

	unhighlightAll(tokens) {
		tokens.forEach(token => {
			removeMarkerOnToken(token);
		})
	}



	highlightTokenInGroup(tokenId, hasActed) {
		let token = game.canvas.tokens.placeables.find(token => token.id == tokenId);
		createMarkerOnToken(token, hasActed);
	}


	setCanvasTokenActivated(tokenId) {
		let token = game.canvas.tokens.placeables.find(token => token.id == tokenId);
		createMarkerOnToken(token, true);
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
		this.setCanvasTokenActivated(element.dataset.id);

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
			this.unhighlightAll(game.canvas.tokens.placeables)
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

		if (game.user.isGM) {
			await game.settings.set("hud-and-trackers", "savedCombat", data);
		} else {
			//PROBLEM IS THE RE-RENDERING. DATA SETTINGS GETTING WIPED EACH TIME.
			let data2 = await game.settings.get("hud-and-trackers", "savedCombat");

		}

		//set the hooks and stuff
		this.manageDisplay(html);

		//remove app from "ui.windows" to not let it close with the escape key
		delete ui.windows[this.appId];

		let windowContent = html.closest(".window-content");
		let combatantDivs = windowContent.find(".combatant-div");
		let scene = game.scenes.viewed;

		//check if in combat
		if (this.inCombat) {

			//find the in combat button, and allow only the GM to click it
			let endCombat = windowContent.find(".endCombat")[0];
			if (game.user.isGM) {
				if (endCombat) {
					endCombat.addEventListener("click", async (event) => {
						await this.ourCombat.endCombat();

						let defaultData = {
							ourCombat: null,
							currentPhase: "fastPlayersTurn",
							currentRound: 0,
							inCombat: false,
							activationObject: {},
						}
						this.unhighlightAll(game.canvas.tokens.placeables);
						await game.settings.set("hud-and-trackers", "savedCombat", defaultData);
						game.combatHud.app.render();
					})
				}
			}
			for (let combatantDiv of combatantDivs) {

				if(!combatantDiv.classList.contains("activated")){
					this.highlightTokenInGroup(combatantDiv.dataset.id, false)
				}
				else{
					this.highlightTokenInGroup(combatantDiv.dataset.id, true)
				}
				let token = getCanvasToken(combatantDiv.dataset.id);

				// scene.updateEmbeddedDocuments("Token", [{_id: token.id, tint: "#FFFFFF"}])
			
				// $(combatantDiv).mouseenter((event) => {
				// 	scene.updateEmbeddedDocuments("Token", [{_id: token.id, tint: "#FF5733"}])
				// })

				// $(combatantDiv).mouseleave((event) => {
				// 	scene.updateEmbeddedDocuments("Token", [{_id: token.id, tint: "#FFFFFF"}])
				// })

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
							this.highlightTokenInGroup(token.id, true)
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
		socket.executeForOthers("receiveDataAndUpdate", data);
	}

	static _receiveDataAndUpdate(data) {
		this.activationObject = new ActivationObject(data.activationObject.activationMap);
		this.currentPhase = data.currentPhase;
		this.currentRound = data.currentRound;
		this.inCombat = data.inCombat;
		this.render(true);
		// game.combatHud.app.render();
	}



}
window.combatHud = combatHud;