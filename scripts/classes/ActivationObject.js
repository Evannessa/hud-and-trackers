
export default class ActivationObject{
	constructor(fastPlayers, slowPlayers, enemies, npcAllies){
		//these should be arrays of tokens
		this.activationMap = {
			"fastPlayers": {},
			"slowPlayers": {},
			"enemies": {},
			"npcAllies": {}
		};	
		for(let arg of arguments){
			let phaseName = Object.keys({arg})[0];
			this.setActivations(phaseName, arg);
		}
		// fastPlayers.forEach(element => {
		// 	this.activationMap.fastPlayers[element.id] = false;
		// });
		// slowPlayers.forEach(element => {
		// 	this.activationMap.slowPlayers[element.id] = false;
		// });
		// enemies.forEach(element => {
		// 	this.activationMap.fastPlayers[element.id] = false;
		// });
		// npcAllies.forEach(element => {
		// 	this.activationMap.fastPlayers[element.id] = false;
		// });
	}

	setActivations(phaseName, array){
		array.forEach(element => {
			this.activationMap[phaseName][element.id] = false;
		});
	}


	getSpecificMap(mapName){
		switch (mapName) {
			case "fastPlayers":
				return this.getFastPlayersMap();
			case "slowPlayers":
				return this.getSlowPlayersMap();
			case "enemies":
				return this.getEnemiesMap();
			case "npcAllies":
				return this.getNPCAlliesMap();
			default:
				break;
		}
	}

	getSpecificCategory(categoryName){
		switch(categoryName){
			case "fastPlayers":
				return this.getFastPlayersMap().keys();
			case "slowPlayers":
				return this.getSlowPlayersMap().keys();
			case "enemies":
				return this.getEnemiesMap().keys();
			case "npcAllies":
				return this.getNPCAlliesMap().keys();
			default:
				break;
		}
	}

	getFastPlayersMap(){
		return this.activationMap.fastPlayers;
	}
	getSlowPlayersMap(){
		return this.activationMap.slowPlayers;
	}
	getEnemiesMap(){
		return this.activationMap.enemies;
	}
	getNPCAlliesMap(){
		return this.activationMap.npcAllies;
	}



	alertIfUndefined(){

	}
}


export default ActivationObject