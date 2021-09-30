import registerSettings from './settings.js'

let ourCombat;
let combatHud;
let inCombat = false;
let whoseTurn = "fastPlayerTurn";

let initializationStarted = false;
let addedRepTokens = false;
let initializedRepTokens = false;
let turnReset = false;
// let socket;

let slowPlayersStore;
let fastPlayersStore;
let enemiesStore;
let npcAlliesStore;


Hooks.once("socketlib.ready", () => {
	// socket = socketlib.registerModule("hud-and-trackers");
	// socket.register("show-combat-hud", renderCombatHud);
	// socket.register("update-combat-hud", updateCombatHud);
	// socket.register("close-combat-hud", updateCombatHud);

})

Hooks.on("init", () => {
	game.combatHud = {};
	game.combatHud.startCombat = startCombat;
})

Hooks.on("ready", () => {
	registerSettings();
	combatHud = new CombatHud(combat).render(true);
	// startCombat();
})

Hooks.on("renderSidebarTab", (app, html) => {
	console.log(app.options.id)
	if (!game.user.isGM) {
		return;
	}
	if (app.options.id == "combat") {
		let button = $("<button>Start Combat</button>");
		button.click(startCombat);
		html.find(".directory-footer").prepend(button);
	}

});



function renderCombatHud(combat) {
	combatHud = new CombatHud(combat).render(true);
	console.log(combat);
}

function updateCombatHud() {
	if (combatHud) {
		combatHud.render();
	}
}

function closeCombatHud() {
	if (combatHud) {
		combatHud.close();
	}
}

Hooks.on("ready", () => {
	// combatHud = new CombatHud(null).render(true);
	// game.socket.on("module.hud-and-trackers", (data) => {
	// 	if (data.operation == "renderCombatHud") {
	// 		console.log("WE SHOULD BE RENDERING HUD IS THIS SOCKET WORKINGAAAH")
	// 		renderCombatHud();
	// 		console.log("THIS IS OUR DATA");
	// 		console.log(data);
	// 	}
	// });
	// game.socket.on('module.hud-and-trackers', (data) => {
	// 	if(data.operation == "render")
	// })

	async function handleSocket(data) {

	}

	if (game.combat && game.user.isGM) {
		game.combat.endCombat();
	}
})

async function startCombat() {
	if(!game.user.isGM){
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
			startCombat(); //TODO: hopefully this recursion is okay
			// ui.notifications.error("No tokens selected");
		} else {
			var combat = ui.combat.combat;
			if (!combat) {
				if (game.user.isGM) {
					// combat = await Combat.implementation.create({
					// 	scene: canvas.scene?.id,
					// })
					// await combat.activate({render: false});
					// ui.combat.initialize({combat})
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
					})
				})
			});
			CombatHud.initOnCombatStart(combat);

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

	slowPlayersStore = slowPlayers;
	fastPlayersStore = fastPlayers;
	npcAlliesStore = npcAllies;
	enemiesStore = enemies;
	let activeCategories = {
		slowPlayers: convertToArrayOfIDs(slowPlayers),
		fastPlayers: convertToArrayOfIDs(fastPlayers),
		npcAllies: convertToArrayOfIDs(npcAllies),
		enemies: convertToArrayOfIDs(enemies)
	}
	CombatHud.activeCategories = activeCategories;
	CombatHud.setSetting("activeCategories", activeCategories);
	// console.log(slowPlayersStore)
	// console.log(fastPlayersStore)
	// console.log(npcAlliesStore)
	// console.log(enemiesStore)
	// let slow =  await combat.setFlag("hud-and-trackers", "slowPlayers", slowPlayers);
	// let fast =  await combat.setFlag("hud-and-trackers", "fastPlayers", fastPlayers);
	// let npc =  await combat.setFlag("hud-and-trackers", "npcAllies", npcAllies);
	// let enemy =  await combat.setFlag("hud-and-trackers", "enemies", enemies);
}

function convertToArrayOfIDs(array) {
	return array.map(item => {
		return item.id
	})
}

function convertToArrayOfTokens(array) {
	return array.map(id => {
		return game.canvas.tokens.objects.children.find(token => token.id == id)
	})
}

function simpleStringify(object) {
	var simpleObject = {};
	for (var prop in object) {
		if (!object.hasOwnProperty(prop)) {
			continue;
		}
		if (typeof (object[prop]) == 'object') {
			continue;
		}
		if (typeof (object[prop]) == 'function') {
			continue;
		}
		simpleObject[prop] = object[prop];
	}
	return JSON.stringify(simpleObject); // returns cleaned up JSON
};

function getActor(ourToken) {
	console.log(ourToken);
	return game.actors.get(ourToken.data.actorId);
}


// function getEnemyLevels() {

// }

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


async function rollAllInitiatives(combat) {
	initializationStarted = true;
	await combat.setFlag("hud-and-trackers", "initializationStarted", initializationStarted);
	await combat.rollAll();
}

async function categorizeCombatants(combat) {
	let enemyTokens = []
	let enemies = combat.turns.filter((combatant) => {
		let token = combatant._token;
		if (token.data.disposition == -1) {
			enemyTokens.push(token);
			return true;
		}
	});
	console.log("We've found enemies?")
	console.log(enemies);

	let npcAllyTokens = []
	let npcAllies = combat.turns.filter((combatant) => {
		let token = combatant._token;
		if (token.data.disposition == 0) {
			npcAllyTokens.push(token);
			return true;
		}
	})
	let highestEnemyInitiative = 0;
	for (let enemy of enemies) {
		if (enemy.initiative > highestEnemyInitiative) {
			highestEnemyInitiative = enemy.initiative;
		}
	}
	let fastPlayers = []
	let slowPlayers = []
	let playersToRemove = [];
	let combatantsToRemove = []
	for (let combatant of combat.turns) {
		combatantsToRemove.push(combatant.id);
		if (!combatant.isNPC) {
			if (combatant.initiative >= highestEnemyInitiative) {
				fastPlayers.push(combatant._token);
				playersToRemove.push(combatant.id);
			} else if (combatant.initiative < highestEnemyInitiative) {
				slowPlayers.push(combatant._token);
				playersToRemove.push(combatant.id);
			}
		}
	}
	await combat.setFlag("hud-and-trackers", "slowPlayers", slowPlayers);
	await combat.setFlag("hud-and-trackers", "fastPlayers", fastPlayers);
	await combat.setFlag("hud-and-trackers", "npcAllies", npcAllyTokens);
	await combat.setFlag("hud-and-trackers", "enemies", enemyTokens);
	await combat.setFlag("hud-and-trackers", "combatantsToRemove", combatantsToRemove);
}

async function deleteCombatants(combat) {
	let combatantsToRemove = await combat.getFlag("hud-and-trackers", "combatantsToRemove")
	await combat.deleteEmbeddedDocuments("Combatant", combatantsToRemove);
}

async function createRepTokens(combat) {

	let repTokens = game.folders.getName("RepTokens");
	let representativeTokens = []
	let tokenData = []

	let enemies = CombatHud.getSetting("activeCategories").enemies;
	let npcAllies = CombatHud.getSetting("activeCategories").npcAllies;
	let fastPlayers = CombatHud.getSetting("activeCategories").fastPlayers;
	let slowPlayers = CombatHud.getSetting("activeCategories").slowPlayers;


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
	console.log(representativeTokens);
	addedRepTokens = true;
	await combat.setFlag("hud-and-trackers", "addedRepTokens", addedRepTokens);
	//create all of the representative combatants
	await combat.createEmbeddedDocuments("Combatant", tokenData);
}

async function setRepTokenInitiative(combat) {
	for (let combatant of combat.turns) {
		console.log(combatant.data.name);
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
	await combat.setFlag("hud-and-trackers", "initializedRepTokens", initializedRepTokens);
}

async function moveToPreviousTurn(combat) {
	await combat.previousTurn()
	turnReset = true;
	await combat.setFlag("hud-and-trackers", "turnReset", turnReset);
}



Hooks.on("renderCombatHud", async (app, html) => {

});
Hooks.on("updateCombat", (combat, roundData, diff) => {
	// if (!game.user.isGM) {
	// 	game.socket.emit("module.hud-and-trackers", {
	// 		operation: 'renderCombatHud',
	// 		user: game.user.id,
	// 		content: "Sup"
	// 	});
	// 	return
	// }
	ourCombat = combat;

	let round = combat.current.round;



	//if we're in combat but we haven't toggled inCombat to true
	if (combat.current.round > 0 && !inCombat) {
		// combat.setFlag("hud-and-trackers", "slowPlayers", slowPlayersStore);
		// combat.setFlag("hud-and-trackers", "fastPlayers", fastPlayersStore);
		// combat.combatant.setFlag("hud-and-trackers", "fastPlayers", fastPlayersStore);
		// combat.combatant.setFlag("hud-and-trackers", "npcAllies", npcAlliesStore);
		// combat.combatant.setFlag("hud-and-trackers", "enemies", enemiesStore);
		inCombat = true;

	}

	if (round > 0) {
		if (!combatHud) {
			// await socket.executeForOthers("show-combat-hud", combat)
			if (game.user.isGM) {
				combatHud = new CombatHud(combat).render(true);
			} else {
				// game.socket.emit("module.hud-and-trackers", {
				// 	operation: 'renderCombatHud',
				// 	user: game.user.id,
				// 	content: combatHud
				// });
			}
		} else {
			console.log("RE-RENDERING HUD");
			// await socket.executeForOthers("update-combat-hud", combat)
			combatHud.render();
		}

		let name = combat.combatant.name;
		if (name == "FastPlayer") {
			whoseTurn = "fastPlayerTurn"
			console.log("It's the fast players' turn!");
		} else if (name == "Enemies") {
			whoseTurn = "enemyTurn"
			console.log("It's the enemies' turn!");
		} else if (name == "SlowPlayer") {
			whoseTurn = "slowPlayerTurn"
			console.log("It's the slow players' turn!")
		} else if (name == "NPCAllies") {
			whoseTurn = "npcAlliesTurn"
			console.log("It's the NPC allies turn!")
		}
		combat.setFlag("hud-and-trackers", "whoseTurn", whoseTurn);
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

	// await socket.executeAsGM("close-combat-hud")
})

Hooks.on("canvasReady", () => {

});

/*APPLY TURN FINISHED OVERLAY */
function turnFinishedOverlay() {
	const effect = "icons/svg/skull.svg";
	canvas.tokens.controlled.forEach(token => {
		token.toggleOverlay(effect);
	});
}
/**
 * @param Combat!
 */
export default class CombatHud extends Application {

	static initOnCombatStart(combat){
		CombatHud.ourCombat = combat;
		console.log(CombatHud.ourCombat);
		CombatHud.inCombat = true;
		CombatHud.slowPlayers = convertToArrayOfTokens(CombatHud.getSetting("activeCategories").slowPlayers); //slowPlayersStore;
		CombatHud.fastPlayers = convertToArrayOfTokens(CombatHud.getSetting("activeCategories").fastPlayers); //fastPlayersStore;
		CombatHud.npcAllies = convertToArrayOfTokens(CombatHud.getSetting("activeCategories").npcAllies); //npcAlliesStore;
		CombatHud.enemies = convertToArrayOfTokens(CombatHud.getSetting("activeCategories").enemies); //enemiesStore;

		this.combatActive = inCombat;

		CombatHud.fastPlayersActivation = CombatHud.setActivations(this.fastPlayers, CombatHud.phases.FASTPC);
		CombatHud.slowPlayersActivation = CombatHud.setActivations(this.slowPlayers, CombatHud.phases.SLOWPC);
		CombatHud.enemiesActivation = CombatHud.setActivations(this.enemies, CombatHud.phases.ENEMY);
		CombatHud.npcAlliesActivation = CombatHud.setActivations(this.npcAllies, CombatHud.phases.NPC);
	}

	constructor(object) {
		super();
		this.phases = {
			FASTPC: "fastPlayers",
			SLOWPC: "slowPlayers",
			ENEMY: "enemies",
			NPC: "npcAllies"
		}
		// this.ourCombat = CombatHud.ourCombat;
		// this.currentPhase = whoseTurn
		// this.slowPlayers = convertToArrayOfTokens(CombatHud.getSetting("activeCategories").slowPlayers); //slowPlayersStore;
		// this.fastPlayers = convertToArrayOfTokens(CombatHud.getSetting("activeCategories").fastPlayers); //fastPlayersStore;
		// this.npcAllies = convertToArrayOfTokens(CombatHud.getSetting("activeCategories").npcAllies); //npcAlliesStore;
		// this.enemies = convertToArrayOfTokens(CombatHud.getSetting("activeCategories").enemies); //enemiesStore;

		// this.combatActive = inCombat;

		// if (CombatHud.inCombat) {
		// 	this.fastPlayersActivation = this.setActivations(this.fastPlayers, this.phases.FASTPC);
		// 	this.slowPlayersActivation = this.setActivations(this.slowPlayers, this.phases.SLOWPC);
		// 	this.enemiesActivation = this.setActivations(this.enemies, this.phases.ENEMY);
		// 	this.npcAlliesActivation = this.setActivations(this.npcAllies, this.phases.NPC);
		// }
	}

	static phases = {
		FASTPC: "fastPlayers",
		SLOWPC: "slowPlayers",
		ENEMY: "enemies",
		NPC: "npcAllies"
	}

	static currentPhase = 1;

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

	static manageDisplay(html) {
		Hooks.on("renderCombatHud", (app, html) => {
			let windowApp = html.closest(".window-app")
			console.log("Window app is $O", windowApp);
			$(windowApp).css({"height": "fit-content", "width": "fit-content"})
			CombatHud.pullValues();
			CombatHud.updateApp();
		})

		Hooks.on("updateSetting", setting => {
			if((setting.data.key === "CombatHud.currentPhase" || setting.data.key === "CombatHud.currentRound" || setting.data.key === "CombatHud.activeCategories") && !game.user.isGM){
				CombatHud.pullValues();
				CombatHud.updateApp();
			}
		});
	}

	static pullValues() {
		CombatHud.currentPhase = this.getSetting("currentPhase");
		CombatHud.currentRound = game.combat ? game.combat.round : this.getSetting("currentRound"); // get the current round getSetting("currentRound");
		CombatHud.activeCategories = this.getSetting("activeCategories");
		CombatHud.allActivationMaps = this.getSetting("activationMaps");
	}


	static updateApp() {
		//save the values
		const combas = document.querySelectorAll(".combatant-div");
		if (game.user.isGM) {
			this.setSetting("currentPhase", CombatHud.currentPhase);
			this.setSetting("currentRound", CombatHud.currentRound);
			this.setSetting("activeCategories", CombatHud.activeCategories);
			this.setSetting("activationMaps", CombatHud.allActivationMaps);
			//TODO: Put game settings here
		}
		// combas.forEach(current => current.classList.remove("activated"));

		//get the current phase
		let currentMap = CombatHud.allActivationMaps[CombatHud.currentPhase];

		for(let tokenId in currentMap){
			console.log("TOKEN ID IS");
			console.log(tokenId);
			for(let comba of combas){
				console.log("COMBAT DIV IS");
				console.log(comba);
				if(tokenId == comba.dataset.id){
					if(currentMap[tokenId] == true){
						//if this one IS activated
						comba.classList.add("activated");
					}
					else if(currentMap[tokenId] == false){
						//if this one is NOT activated
						comba.classList.remove("activated")
					}
				}
			}
		}

		// for(let activationMap in CombatHud.allActivationMaps){
		// 	for(let tokenId in CombatHud.allActivationMaps[activationMap]){
		// 		console.log(tokenId);

		// 	}
		// }
		document.querySelector(".roundNumber").innerText = CombatHud.currentRound;
	}

	static setSetting(settingName, value) {
		game.settings.set(CombatHud.ID, settingName, value);
	}
	static getSetting(settingName) {
		return game.settings.get(CombatHud.ID, settingName);
	}

	//each time an actor is clicked on, 
	static async checkIfAllHaveActed(event) {
		let element = event.currentTarget;
		let phaseName = element.dataset.phase;
		let map = ourCombat.getFlag("hud-and-trackers", phaseName + "Activation");
		let allActed = true;
		for (let mapItem in map) {
			if (map[mapItem] == false) {
				allActed = false;
			}
		}
		if (allActed) {
			CombatHud.ourCombat.nextTurn();
			// this.ourCombat.nextTurn();
			this.resetActivations();
		}
	}

	static resetActivations() {
		for (let phase in this.phases) {
			let map = ourCombat.getFlag("hud-and-trackers", this.phases[phase] + "Activation");
			for (let item in map) {
				map[item] = false
			}
			//store in static var
			CombatHud.allActivationMaps[this.phases[phase]+"Activation"] = map;
		}
	}

	static async setActivations(tokenArray, phase) {
		let activationMap = {}
		for (let item of tokenArray) {
			console.log(item)
			activationMap[item.id] = false;
		}
		await CombatHud.ourCombat.setFlag("hud-and-trackers", phase + "Activation", activationMap)
		console.log("Our combat Activation Map Flags %O", CombatHud.ourCombat.getFlag("hud-and-trackers", phase + "Activation", activationMap))
		//store in static var
		CombatHud.allActivationMaps[phase+"Activation"] = activationMap;
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
			template: 'modules/hud-and-trackers/templates/combat-hud.html',
			id: 'combatHud',
			title: 'combatHud',
			onSubmit: (e) => e.preventDefault(),
		});
	}
	async _updateObject(event, formData) {

		this.render();
	}

	getData() {
		return {
			combatActive: CombatHud.inCombat,
			slowPlayers: CombatHud.slowPlayers,
			fastPlayers: CombatHud.fastPlayers,
			enemies: CombatHud.enemies,
			npcAllies: CombatHud.npcAllies,
			currentPhase: whoseTurn, //TODO: Set this to below
			// // currentPhase: this.ourCombat.getFlag("hud-and-trackers", "whoseTurn"),
			// fastPlayersActivation: {},//this.ourCombat.getFlag("hud-and-trackers", "fastPlayersActivation"),
			// slowPlayersActivation: {},//this.ourCombat.getFlag("hud-and-trackers", "slowPlayersActivation"),
			// enemiesActivation: {},//this.ourCombat.getFlag("hud-and-trackers", "enemiesActivation"),
			// npcAlliesActivation: {}//this.ourCombat.getFlag("hud-and-trackers", "npcAlliesActivation"),
		};
	}

	activateListeners(html) {
		//remove app from "ui.windows" to not let it close with the escape key
		// const drag = new Draggabilly(this, html, document.querySelector(#hudApp)) 
		delete ui.windows[this.appId];




		// super.activateListeners(html);
		let windowContent = html.closest(".window-content");
		let combatantDivs = windowContent.find(".combatant-div");
		console.log(combatantDivs);
		if (CombatHud.inCombat) {
			for (let combatantDiv of combatantDivs) {
				combatantDiv.addEventListener("click", (event) => {
					CombatHud.setTokenHasActed(event);
					CombatHud.checkIfAllHaveActed(event)
				})

				let activationMapString;
				switch (combatantDiv.dataset.phase) {
					case CombatHud.phases.FASTPC:
						activationMapString = this.phases.FASTPC;
						break;
					case CombatHud.phases.SLOWPC:
						activationMapString = this.phases.SLOWPC;
						break;
					case CombatHud.phases.ENEMY:
						activationMapString = this.phases.ENEMY;
						break;
					case CombatHud.phases.NPC:
						activationMapString = this.phases.NPC;
						break;
					default:
						break;
				}
				console.log("Our combat is %O", CombatHud.ourCombat);
				let activationMap = CombatHud.ourCombat.getFlag("hud-and-trackers", activationMapString + "Activation");
				// let activationMap = this.ourCombat.getFlag("hud-and-trackers", activationMapString + "Activation");
				if (activationMap[combatantDiv.dataset.id] == true) {
					$(combatantDiv).addClass("activated");
				}
			}
		}
		else{
			let startCombatBtn = windowContent.find(".startCombatButton");
			startCombatBtn.click((event)=>{
				startCombat();
			})
		}
	}

	static getElementFromParent(element, elementSelector) {
		let windowContent = element.closest(".window-content");
		return windowContent.querySelector(elementSelector);
	}

	static async setTokenHasActed(event) {
		let element = event.currentTarget;
		$(element).addClass("activated")
		let phaseEl = this.getElementFromParent(element, ".phaseName");
		let phase = phaseEl.textContent;
		let phaseString;
		let activationMap;

		switch (phase) {
			case "fastPlayerTurn":
				// activationMap = this.ourCombat.getFlag("hud-and-trackers", "fastPlayersActivation")
				activationMap = CombatHud.ourCombat.getFlag("hud-and-trackers", "fastPlayersActivation")
				phaseString = this.phases.FASTPC;
				break;
			case "slowPlayerTurn":
				activationMap = CombatHud.ourCombat.getFlag("hud-and-trackers", "slowPlayersActivation")
				// activationMap = this.ourCombat.getFlag("hud-and-trackers", "slowPlayersActivation")
				phaseString = this.phases.SLOWPC;
				break;
			case "enemyTurn":
				activationMap = CombatHud.ourCombat.getFlag("hud-and-trackers", "enemiesActivation")
				// activationMap = this.ourCombat.getFlag("hud-and-trackers", "enemiesActivation")
				phaseString = this.phases.ENEMY;
				break;
			case "npcAlliesTurn":
				activationMap = CombatHud.ourCombat.getFlag("hud-and-trackers", "npcAlliesActivation")
				// activationMap = this.ourCombat.getFlag("hud-and-trackers", "npcAlliesActivation")
				phaseString = this.phases.NPC;
				break;
		}
		//set the activation for this token id in the map to true
		activationMap[element.dataset.id] = true;
		await CombatHud.ourCombat.setFlag("hud-and-trackers", phaseString + "Activation", activationMap);	
		//update the static var
		CombatHud.allActivationMaps[phaseString + "Activation"] = activationMap;
		// CombatHud.render(true);
	}

	static getActor(ourToken) {
		if (ourToken.data.actorLink) {
			return game.actors.get(ourToken.data.actorId);
		} else {
			return null;
		}
	}

}
window.combatHud = combatHud;