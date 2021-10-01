
export class ActivationObject{
	constructor(fastPlayers, slowPlayers, enemies, npcAllies){
		//these should be arrays of tokens
		this.activationMap = {
			"fastPlayers": {},
			"slowPlayers": {},
			"enemies": {},
			"npcAllies": {}
		};	
		var count = 0;
		for(let mapName in this.activationMap){
			this.setActivations(mapName, arguments[count]);
			count++;
		}
	}

	setActivations(phaseName, array){
		console.log(phaseName);
		array.forEach(element => {
			this.activationMap[phaseName][element.id] = false;
		});
	}

	//this will reset every activation in the map to false
	resetActivations(){
		for(let map in this.activationMap){
			for(let tokenId in map){
				map[tokenId] = false;
			}
		}	
	}

	//each time a token has acted, update the whole map
	updateActivations(_tokenId){
		for(let map in this.activationMap){
			for(let tokenId in map){
				//if we've found the token id we're updating
				//update and set it to true
				if(tokenId === _tokenId){
					map[tokenId] = true;
				}
			}
		}	
	}

	updateGameSetting(){
		game.settings.get
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