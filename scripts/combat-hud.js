
let ourCombat;
let combatHud;
let inCombat = false;
let whoseTurn = "fastPlayerTurn";

let initializationStarted = false;
let addedRepTokens = false;
let initializedRepTokens = false;
let turnReset = false;

Hooks.on("ready", ()=> {
	if(game.combat){
		game.combat.endCombat();
	}
})

function getEnemyLevels() {

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


async function rollAllInitiatives(combat) {
	initializationStarted = true;
	await combat.setFlag("world", "initializationStarted", initializationStarted);
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
	await combat.setFlag("world", "slowPlayers", slowPlayers);
	await combat.setFlag("world", "fastPlayers", fastPlayers);
	await combat.setFlag("world", "npcAllies", npcAllyTokens);
	await combat.setFlag("world", "enemies", enemyTokens);
	await combat.setFlag("world", "combatantsToRemove", combatantsToRemove);
}

async function deleteCombatants(combat) {
	let combatantsToRemove = await combat.getFlag("world", "combatantsToRemove")
	await combat.deleteEmbeddedDocuments("Combatant", combatantsToRemove);
}

async function createRepTokens(combat) {
	//set level to NPC level
	//TODO: Add representative tokens
	let repTokens = game.folders.getName("RepTokens");
	let representativeTokens = []
	let tokenData = []

	let enemies = await combat.getFlag("world", "enemies");
	let npcAllies = await combat.getFlag("world", "npcAllies");
	let fastPlayers = await combat.getFlag("world", "fastPlayers");
	let slowPlayers = await combat.getFlag("world", "slowPlayers");

	//create all the tokens representing the different "Sides"
	for (let repTokenActor of repTokens.content) {
		let newToken;
		if (repTokenActor.name == "FastPlayer" && fastPlayers.length > 0) {
			newToken = await createToken(repTokenActor);
		} else if (repTokenActor.name == "SlowPlayer" && slowPlayers.length > 0) {
			newToken = await createToken(repTokenActor);
		} else if (repTokenActor.name == "NPCAllies" && npcAllies.length > 0) {
			newToken = await createToken(repTokenActor);
		} else if (repTokenActor.name == "Enemies") {
			newToken = await createToken(repTokenActor);
		}
		if (newToken) {
			representativeTokens.push(newToken);
			tokenData.push(newToken.data);
		}
	}
	addedRepTokens = true;
	await combat.setFlag("world", "addedRepTokens", addedRepTokens);
	//create all of the representative combatants
	let combatantTest = await combat.createEmbeddedDocuments("Combatant", tokenData);
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
	await combat.setFlag("world", "initializedRepTokens", initializedRepTokens);
}

async function moveToPreviousTurn(combat){
	await combat.previousTurn()
	turnReset = true;
	await combat.setFlag("world", "turnReset", turnReset);
}

Hooks.on("renderCombatHud", async(app, html) => {

});
Hooks.on("updateCombat", async (combat, roundData, diff) => {
	ourCombat = combat;

	let round = combat.current.round;

	if (!addedRepTokens && !initializedRepTokens && !initializationStarted) {
		await rollAllInitiatives(combat).then(() => {
			categorizeCombatants(combat).then(() => {
				deleteCombatants(combat).then(() => {
					createRepTokens(combat).then(() => {
						setRepTokenInitiative(combat).then(()=>{
							moveToPreviousTurn(combat);
						});
					})
				})
			})
		})
	}


	//if we're in combat but we haven't toggled inCombat to true
	if (combat.current.round > 0 && !inCombat) {
		inCombat = true;
	}

	if (round > 0 && addedRepTokens && initializedRepTokens && turnReset) {
		if(!combatHud){
			combatHud = new CombatHud(combat).render(true);
		}
		else{
			console.log("RE-RENDERING HUD");
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
		await combat.setFlag("world", "whoseTurn", whoseTurn);
	}

});

Hooks.on("deleteCombat", (combat) => {
	inCombat = false;
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
export class CombatHud extends Application {
	constructor(object) {
		super();
		this.phases = {
			FASTPC: "fastPlayers",
			SLOWPC: "slowPlayers",
			ENEMY: "enemies",
			NPC: "npcAllies"
		}
		this.ourCombat = ourCombat;
		this.currentPhase = whoseTurn
		this.slowPlayers = ourCombat.getFlag("world", "slowPlayers");
		this.fastPlayers = ourCombat.getFlag("world", "fastPlayers");
		console.log(this.fastPlayers);
		this.enemies = ourCombat.getFlag("world", "enemies");
		this.npcAllies = ourCombat.getFlag("world", "npcAllies");
		this.combatActive = inCombat;

		this.fastPlayersActivation = this.setActivations(this.fastPlayers, this.phases.FASTPC);
		this.slowPlayersActivation = this.setActivations(this.slowPlayers, this.phases.SLOWPC);
		this.enemiesActivation = this.setActivations(this.enemies, this.phases.ENEMY);
		this.npcAlliesActivation = this.setActivations(this.npcAllies, this.phases.NPC);
	}

	async checkIfAllHaveActed(event){
		let element = event.currentTarget;
		let currentPhase = this.ourCombat.getFlag("world", "whoseTurn")
		let phaseName = element.dataset.phase;
		let map = ourCombat.getFlag("world", phaseName+"Activation");
		let allActed = true;
		for(let mapItem in map){
			if(map[mapItem] == false){
				allActed = false;
			}
		}
		if(allActed){
			ourCombat.nextTurn();
		}
	}

	async setActivations(tokenArray, phase){
		let activationMap = {}
		for(let item of tokenArray){
			activationMap[item._id] = false;
		}
		await ourCombat.setFlag("world", phase+"Activation", activationMap)
		console.log(ourCombat.getFlag("world", phase+"Activation", activationMap));
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
			slowPlayers: this.slowPlayers,
			fastPlayers: this.fastPlayers,
			enemies: this.enemies,
			npcAllies: this.npcAllies,
			currentPhase: whoseTurn,//TODO: Set this to below
			// currentPhase: this.ourCombat.getFlag("world", "whoseTurn"),
			combatActive: this.combatActive,
			fastPlayersActivation: this.ourCombat.getFlag("world", "fastPlayersActivation"),
			slowPlayersActivation:  this.ourCombat.getFlag("world", "slowPlayersActivation"),
			enemiesActivation: this.ourCombat.getFlag("world", "enemiesActivation"),
			npcAlliesActivation:  this.ourCombat.getFlag("world", "npcAlliesActivation"),
		};
	}

	activateListeners(html) {
		// super.activateListeners(html);
		let windowContent = html.closest(".window-content");
		let combatantDivs = windowContent.find(".combatant-div");
		console.log(combatantDivs);
		for (let combatantDiv of combatantDivs) {
			combatantDiv.addEventListener("click", (event) => {this.setTokenHasActed(event); this.checkIfAllHaveActed(event)})

			let activationMapString;
			switch (combatantDiv.dataset.phase) {
				case this.phases.FASTPC:
					activationMapString = this.phases.FASTPC;
					break;
				case this.phases.SLOWPC:
					activationMapString = this.phases.SLOWPC;
					break;
				case this.phases.ENEMY:
					activationMapString = this.phases.ENEMY;
					break;
				case this.phases.NPC:
					activationMapString = this.phases.NPC;
					break;
				default:
					break;
			}
			console.log(activationMapString+"Activation");
			let activationMap = this.ourCombat.getFlag("world", activationMapString+"Activation");
			console.log(activationMap);
			if(activationMap[combatantDiv.dataset.id] == true){
				$(combatantDiv).addClass("activated");
			}
		}
	}

	getElementFromParent(element, elementSelector){
		let windowContent = element.closest(".window-content");
		return windowContent.querySelector(elementSelector);
	}

	async setTokenHasActed(event){
		let element = event.currentTarget;
		$(element).addClass("activated")
		let phaseEl = this.getElementFromParent(element, ".phaseName");
		let phase = phaseEl.textContent;
		let phaseString;
		let activationMap;

		switch (phase) {
			case "fastPlayerTurn":
				activationMap = this.ourCombat.getFlag("world", "fastPlayersActivation")
				phaseString = this.phases.FASTPC;
				break;
			case "slowPlayerTurn":
				activationMap = this.ourCombat.getFlag("world", "slowPlayersActivation")
				phaseString = this.phases.SLOWPC;
				break;
			case "enemyTurn":
				activationMap = this.ourCombat.getFlag("world", "enemiesActivation")
				phaseString = this.phases.ENEMY;
				break;
			case "npcAlliesTurn":
				activationMap = this.ourCombat.getFlag("world", "npcAlliesActivation")
				phaseString = this.phases.NPC;
				break;
		}
		//set the activation for this token id in the map to true
		activationMap[element.dataset.id] = true;
		await this.ourCombat.setFlag("world", phaseString+"Activation", activationMap);
		this.render();
	}

	getActor(ourToken) {
		if (ourToken.data.actorLink) {
			return game.actors.get(ourToken.data.actorId);
		} else {
			return null;
		}
	}

}
window.combatHud = combatHud;