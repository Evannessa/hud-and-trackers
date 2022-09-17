export class LocationsManager {
    static async linkLocationToScene(locationData, currentScene) {
        let { url } = locationData;
        if (!currentScene) currentScene = game.scenes.viewed;
        let linkedLocations = await LocationsManager.getLinkedLocations(currentScene);
        //make sure it doesn't exist already before pushing it
        let exists = linkedLocations.find((data) => data.url === url);
        if (!exists) {
            linkedLocations.push(locationData);
            await LocationsManager.setLinkedLocations(currentScene, linkedLocations);
        }
    }
    static async getLinkedLocations(currentScene) {
        if (!currentScene) currentScene = game.scenes.viewed;
        let linkedLocations = await currentScene.getFlag("hud-and-trackers", "linkedLocations");
        if (!linkedLocations) {
            linkedLocations = await currentScene.setFlag("hud-and-trackers", "linkedLocations", []);
        }
        return linkedLocations;
    }
    static async setLinkedLocations(currentScene, linkedLocations) {
        if (!currentScene) currentScene = game.scenes.viewed;
        await currentScene.setFlag("hud-and-trackers", "linkedLocations", linkedLocations);
    }
}
