import registerSettings from './settings.js'
import {ActivationObject} from './ActivationObject.js'
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


Hooks.once("socketlib.ready", () => {
	socket = socketlib.registerModule("hud-and-trackers");
	socket.register("updateForPlayers", updateForPlayers);
	// socket.register("updateApp", CombatHud.updateApp());
	// socket.register("pullValues", CombatHud.pullValues());

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
			startCombat(); //TODO: hopefully this recursion is okay
			// ui.notifications.error("No tokens selected");
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
						// socket.executeForOthers("initializeForPlayers", data)
					})
				})
			});

			// setTimeout(function () {
			// 	// 
			// 	// 
			// 	data = {
			// 		ourCombat: combat,
			// 		inCombat: true,
			// 		"slowPlayers": CombatHud.slowPlayers, //slowPlayersStore;
			// 		"fastPlayers": CombatHud.fastPlayers,
			// 		"npcAllies": CombatHud.npcAllies,
			// 		"enemies": CombatHud.enemies,
			// 		"combatActive": CombatHud.combatActive,
			// 		"allActivationMaps": CombatHud.allActivationMaps
			// 	}
			// 	socket.executeForOthers("updateForPlayers", data)
			// }, 10);




		}
	}
}

async function callPlayerExecute(data) {
	// 
	socket.executeForOthers("updateForPlayers", data)
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
	await CombatHud.setSetting("activeCategories", activeCategories);
	// // 
	// // 
	// // 
	// // 
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
	// 
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
	// 
	addedRepTokens = true;
	// await combat.setFlag("hud-and-trackers", "addedRepTokens", addedRepTokens);
	//create all of the representative combatants
	await combat.createEmbeddedDocuments("Combatant", tokenData);
}

async function setRepTokenInitiative(combat) {
	for (let combatant of combat.turns) {
		// 
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
	// await combat.setFlag("hud-and-trackers", "initializedRepTokens", initializedRepTokens);
}

async function moveToPreviousTurn(combat) {
	await combat.previousTurn()
	turnReset = true;
	await combat.setFlag("hud-and-trackers", "turnReset", turnReset);
}

let refreshed = false;

function getStuff(combat) {
	CombatHud.ourCombat = combat;
	// 
	CombatHud.inCombat = true;
	CombatHud.slowPlayers = convertToArrayOfTokens(CombatHud.getSetting("activeCategories").slowPlayers); //slowPlayersStore;
	CombatHud.fastPlayers = convertToArrayOfTokens(CombatHud.getSetting("activeCategories").fastPlayers); //fastPlayersStore;
	CombatHud.npcAllies = convertToArrayOfTokens(CombatHud.getSetting("activeCategories").npcAllies); //npcAlliesStore;
	CombatHud.enemies = convertToArrayOfTokens(CombatHud.getSetting("activeCategories").enemies); //enemiesStore;

	CombatHud.allActivationMaps = CombatHud.getSetting("activationMaps");


	CombatHud.fastPlayersActivation = CombatHud.setActivations(CombatHud.fastPlayers, CombatHud.phases.FASTPC);
	CombatHud.slowPlayersActivation = CombatHud.setActivations(CombatHud.slowPlayers, CombatHud.phases.SLOWPC);
	CombatHud.enemiesActivation = CombatHud.setActivations(CombatHud.enemies, CombatHud.phases.ENEMY);
	CombatHud.npcAlliesActivation = CombatHud.setActivations(CombatHud.npcAllies, CombatHud.phases.NPC);
	combatHud.render();
	refreshed = true;
}
Hooks.on("renderCombatHud", async (app, html) => {

});
Hooks.on("updateCombat", (combat, roundData, diff) => {

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
		} else {
			if (!refreshed) {
				getStuff(combat)
			}
			// 
			// combatHud.render();
		}

		let name = combat.combatant.name;
		if (name == "FastPlayer") {
			CombatHud.currentPhase = "fastPlayersTurn"
			if (game.user.isGM) {
				CombatHud.setSetting("currentPhase", "fastPlayersTurn")
			}
			whoseTurn = "fastPlayersTurn"
			// 
		} else if (name == "Enemies") {
			CombatHud.currentPhase = "enemiesTurn"
			if (game.user.isGM) {
				CombatHud.setSetting("currentPhase", "enemiesTurn")
			}
			whoseTurn = "enemiesTurn"
			// 
		} else if (name == "SlowPlayer") {
			CombatHud.currentPhase = "slowPlayersTurn"
			if (game.user.isGM) {
				CombatHud.setSetting("currentPhase", "slowPlayersTurn")
			}
			whoseTurn = "slowPlayersTurn"
			// 
		} else if (name == "NPCAllies") {
			CombatHud.currentPhase = "npcAlliesTurn"
			if (game.user.isGM) {
				CombatHud.setSetting("currentPhase", "npcAlliesTurn")
			}
			whoseTurn = "npcAlliesTurn"
			// 
		}
		// combat.setFlag("hud-and-trackers", "whoseTurn", whoseTurn);
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


function updateForPlayers(data) {

	CombatHud.ourCombat = data.combat;
	CombatHud.inCombat = data.combatActive;
	CombatHud.slowPlayers = data.slowPlayers;
	CombatHud.fastPlayers = data.fastPlayers;
	CombatHud.npcAllies = data.npcAllies;
	CombatHud.enemies = data.enemies;
	CombatHud.allActivationMaps = data.allActivationMaps;

	// CombatHud.pullValues();
	CombatHud.updateApp();
}

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

	static async initOnCombatStart(combat) {
		CombatHud.ourCombat = combat;
		// 
		CombatHud.inCombat = true;
		CombatHud.activationObject = new ActivationObject();

		CombatHud.slowPlayers = convertToArrayOfTokens(CombatHud.getSetting("activeCategories").slowPlayers); //slowPlayersStore;
		CombatHud.fastPlayers = convertToArrayOfTokens(CombatHud.getSetting("activeCategories").fastPlayers); //fastPlayersStore;
		CombatHud.npcAllies = convertToArrayOfTokens(CombatHud.getSetting("activeCategories").npcAllies); //npcAlliesStore;
		CombatHud.enemies = convertToArrayOfTokens(CombatHud.getSetting("activeCategories").enemies); //enemiesStore;

		CombatHud.fastPlayersActivation = await CombatHud.setActivations(CombatHud.fastPlayers, CombatHud.phases.FASTPC);
		CombatHud.slowPlayersActivation = await CombatHud.setActivations(CombatHud.slowPlayers, CombatHud.phases.SLOWPC);
		CombatHud.enemiesActivation = await CombatHud.setActivations(CombatHud.enemies, CombatHud.phases.ENEMY);
		CombatHud.npcAlliesActivation = await CombatHud.setActivations(CombatHud.npcAllies, CombatHud.phases.NPC);


		// CombatHud.pullValues();
		CombatHud.updateApp();
		let data = {
			ourCombat: combat,
			inCombat: true,
			slowPlayers: CombatHud.slowPlayers, //slowPlayersStore;
			fastPlayers: CombatHud.fastPlayers,
			npcAllies: CombatHud.npcAllies,
			enemies: CombatHud.enemies,
			combatActive: CombatHud.combatActive,
			allActivationMaps: CombatHud.allActivationMaps
		}
		// socket.executeForOthers("updateForPlayers", data)
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

	static activationObject;

	static manageDisplay(html) {
		Hooks.on("renderCombatHud", (app, html) => {
			let windowApp = html.closest(".window-app")
			// 
			$(windowApp).css({
				"height": "fit-content",
				"width": "fit-content"
			})
			CombatHud.pullValues();
			CombatHud.updateApp();
		})
		// socket.executeForOthers("updateApp")
		// socket.executeForOthers("pullValues")

		Hooks.on("updateSetting", setting => {
			if ((setting.data.key === "combat-hud.currentPhase" || setting.data.key === "combat-hud.currentRound" || setting.data.key === "combat-hud.activeCategories" || setting.data.key === "combat-hud.combatActive") && !game.user.isGM) {
				// CombatHud.pullValues();
				// CombatHud.updateApp();
			}
		});
	}

	static pullValues() {
		CombatHud.currentPhase = CombatHud.getSetting("currentPhase");
		CombatHud.currentRound = game.combat ? game.combat.round : CombatHud.getSetting("currentRound"); // get the current round getSetting("currentRound");
		CombatHud.activeCategories = CombatHud.getSetting("activeCategories");
		CombatHud.allActivationMaps = CombatHud.getSetting("activationMaps");
	}


	static updateApp() {
		//save the values
		const combas = document.querySelectorAll(".combatant-div");
		if (game.user.isGM) {
			CombatHud.setSetting("currentPhase", CombatHud.currentPhase);
			CombatHud.setSetting("currentRound", CombatHud.currentRound);
			CombatHud.setSetting("activeCategories", CombatHud.activeCategories);
			console.log("BEFORE UPDATE APP" + CombatHud.currentPhase, CombatHud.allActivationMaps);
			CombatHud.setSetting("activationMaps", CombatHud.allActivationMaps);
			console.log("AFTER UPDATE APP " + CombatHud.currentPhase, CombatHud.allActivationMaps);
			CombatHud.setSetting("combatActive", CombatHud.combatActive);
			//TODO: Put game settings here
		}

		//get the current phase
		let phaseString = CombatHud.currentPhase;
		phaseString = phaseString.replace("Turn", "");
		let currentMap = CombatHud.allActivationMaps[phaseString + "Activation"];
		for (let tokenId in currentMap) {
			// 
			// 
			for (let comba of combas) {
				// 
				// 
				if (tokenId == comba.dataset.id) {
					if (currentMap[tokenId] == true) {
						//if this one IS activated
						comba.classList.add("activated");
					} else if (currentMap[tokenId] == false) {
						//if this one is NOT activated
						comba.classList.remove("activated")
					}
				}
			}
		}

		// for(let activationMap in CombatHud.allActivationMaps){
		// 	for(let tokenId in CombatHud.allActivationMaps[activationMap]){
		// 		// 

		// 	}
		// }
		// document.querySelector(".roundNumber").innerText = CombatHud.currentRound;
	}

	static setSetting(settingName, value) {
		game.settings.set(CombatHud.ID, settingName, value);
		// 
	}
	static getSetting(settingName) {
		return game.settings.get(CombatHud.ID, settingName);
	}

	//each time an actor is clicked on, 
	static async checkIfAllHaveActed(event) {
		let element = event.currentTarget;
		let phaseName = element.dataset.phase;
		let map = CombatHud.allActivationMaps[phaseName + "Activation"]; //ourCombat.getFlag("hud-and-trackers", phaseName + "Activation");
		let allActed = true;
		for (let mapItem in map) {
			if (map[mapItem] == false) {
				allActed = false;
			}
		}
		if (allActed) {
			await CombatHud.ourCombat.nextTurn();
			// this.ourCombat.nextTurn();
			CombatHud.resetActivations();
			combatHud.render();
		}
	}

	static resetActivations() {
		for (let phase in this.phases) {
			let map = ourCombat.getFlag("hud-and-trackers", this.phases[phase] + "Activation");
			for (let item in map) {
				map[item] = false
			}
			//store in static var
			CombatHud.allActivationMaps[this.phases[phase] + "Activation"] = map;
		}
	}

	static async setActivations(tokenArray, phase) {
		console.log("THIS IS BEING CALLED")
		let activationMap = {}
		for (let item of tokenArray) {
			// 
			activationMap[item.id] = false;
		}
		// await CombatHud.ourCombat.setFlag("hud-and-trackers", phase + "Activation", activationMap)
		// 
		//store in static var
		CombatHud.allActivationMaps[phase + "Activation"] = activationMap;
		if (game.user.isGM) {
			await CombatHud.setSetting("activationMaps", CombatHud.allActivationMaps);
		}
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

		// this.render();
	}

	getData() {
		return {
			combatActive: CombatHud.inCombat,
			slowPlayers: CombatHud.slowPlayers,
			fastPlayers: CombatHud.fastPlayers,
			enemies: CombatHud.enemies,
			npcAllies: CombatHud.npcAllies,
			currentPhase: CombatHud.currentPhase, //TODO: Set this to below
			// // currentPhase: this.ourCombat.getFlag("hud-and-trackers", "whoseTurn"),
		};
	}

	activateListeners(html) {
		console.log("Activating listeners again")
		//remove app from "ui.windows" to not let it close with the escape key
		// const drag = new Draggabilly(this, html, document.querySelector(#hudApp)) 
		// delete ui.windows[this.appId];




		// super.activateListeners(html);
		let windowContent = html.closest(".window-content");
		let combatantDivs = windowContent.find(".combatant-div");
		// 
		CombatHud.manageDisplay(html);
		if (CombatHud.inCombat) {
			for (let combatantDiv of combatantDivs) {
				combatantDiv.addEventListener("click", (event) => {
					CombatHud.setTokenHasActed(event);
					CombatHud.checkIfAllHaveActed(event)
				})

				let activationMapString;
				switch (combatantDiv.dataset.phase) {
					case CombatHud.phases.FASTPC:
						activationMapString = this.phases.FASTPC.replace("Turn", "");
						break;
					case CombatHud.phases.SLOWPC:
						activationMapString = this.phases.SLOWPC.replace("Turn", "");
						break;
					case CombatHud.phases.ENEMY:
						activationMapString = this.phases.ENEMY.replace("Turn", "");
						break;
					case CombatHud.phases.NPC:
						activationMapString = this.phases.NPC.replace("Turn", "");
						break;
					default:
						break;
				}
				let activationMap = CombatHud.allActivationMaps[activationMapString + "Activation"] //ourCombat.getFlag("hud-and-trackers", activationMapString + "Activation");
				if (activationMap[combatantDiv.dataset.id] == true) {
					$(combatantDiv).addClass("activated");
				}
				//update it 
				CombatHud.allActivationMaps[activationMapString + "Activation"] = activationMap;

				console.log("After phase turn",CombatHud.allActivationMaps);
			}
		} else {
			let startCombatBtn = windowContent.find(".startCombatButton");
			startCombatBtn.click((event) => {
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
			case "fastPlayersTurn":
				activationMap = CombatHud.allActivationMaps.fastPlayersActivation; //ourCombat.getFlag("hud-and-trackers", "fastPlayersActivation")
				phaseString = this.phases.FASTPC;
				break;
			case "slowPlayersTurn":
				activationMap = CombatHud.allActivationMaps.slowPlayersActivation; //ourCombat.getFlag("hud-and-trackers", "slowPlayersActivation")
				phaseString = this.phases.SLOWPC;
				break;
			case "enemiesTurn":
				activationMap = CombatHud.allActivationMaps.enemyActivation; // CombatHud.ourCombat.getFlag("hud-and-trackers", "enemiesActivation")
				phaseString = this.phases.ENEMY;
				break;
			case "npcAlliesTurn":
				activationMap = CombatHud.allActivationMaps.npcAlliesActivation; //CombatHud.ourCombat.getFlag("hud-and-trackers", "npcAlliesActivation")
				phaseString = this.phases.NPC;
				break;
		}
		//set the activation for this token id in the map to true
		console.log("BEFORE PHASE CHANGE", CombatHud.allActivationMaps);
		activationMap[element.dataset.id] = true;
		//update the static var
		CombatHud.allActivationMaps[phaseString + "Activation"] = activationMap;
		console.log("AFTER PHASE CHANGE", CombatHud.allActivationMaps);
		CombatHud.updateApp();
		// combatHud.render();
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