export class ActivationObject {
    constructor(activationMap = {}, ...args) {
        //these should be arrays of tokens

        if (Object.keys(activationMap) == 0 && args.length > 0) {
            this.activationMap = {
                fastPlayers: {},
                slowPlayers: {},
                enemies: {},
                npcAllies: {},
            };
            var count = 0;
            for (let mapName in this.activationMap) {
                this.setActivations(mapName, args[count]);
                count++;
            }
        } else if (Object.keys(activationMap) == 0 && args.length == 0) {
            this.activationMap = {};
        } else {
            this.activationMap = activationMap;
        }

        // this.updateGameSetting();
    }

    static fromJSON(obj) {
        if (typeof obj == "string") {
            obj = JSON.parse(obj);
        }
        return new ActivationObject(obj.activationMap);
    }

    setActivations(phaseName, array) {
        array.forEach((element) => {
            this.activationMap[phaseName][element.id] = false;
        });
    }

    //this will reset every activation in the map to false
    resetActivations() {
        for (let mapKey in this.activationMap) {
            for (let tokenId in this.activationMap[mapKey]) {
                this.activationMap[mapKey][tokenId] = false;
            }
        }
        // this.updateGameSetting();
    }

    //each time a token has acted, update the whole map
    updateActivations(_tokenId, hasActed) {
        for (let mapKey in this.activationMap) {
            for (let tokenId in this.activationMap[mapKey]) {
                //if we've found the token id we're updating
                //update and set it to true
                if (tokenId === _tokenId) {
                    console.log("Setting " + _tokenId + " HAS-ACTED to " + hasActed);
                    this.activationMap[mapKey][tokenId] = hasActed;
                } else {
                    console.log("Couldn't find token");
                }
            }
        }
    }

    getTokensInPhase(phaseName) {
        return Object.keys(this.activationMap[phaseName]);
    }

    async updateGameSetting() {
        console.log("THIS activation object is ", this);
        await game.settings.set(
            "combat-hud",
            "activationObject",
            new ActivationObject(null, null, null, null, this.activationMap)
        );
        console.log(
            "The setting is now ",
            game.settings.get("combat-hud", "activationObject")
        );
    }

    getSpecificMap(mapName) {
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

    getSpecificCategory(categoryName) {
        switch (categoryName) {
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

    getFastPlayersMap() {
        return this.activationMap.fastPlayers;
    }
    getSlowPlayersMap() {
        return this.activationMap.slowPlayers;
    }
    getEnemiesMap() {
        return this.activationMap.enemies;
    }
    getNPCAlliesMap() {
        return this.activationMap.npcAllies;
    }

    alertIfUndefined() {}
}

export default ActivationObject;
