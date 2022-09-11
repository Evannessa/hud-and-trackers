/**
 * Description
 */
export class InSceneCharacterManager {
    static async addCharacterToScene(characterData, currentScene) {
        let { url } = characterData;
        if (!currentScene) currentScene = game.scenes.viewed;
        let charactersInScene = await InSceneCharacterManager.getCharactersInScene(currentScene);
        //make sure it doesn't exist already before pushing it
        let exists = charactersInScene.find((data) => data.url === url);
        if (!exists) {
            charactersInScene.push(characterData);
            await InSceneCharacterManager.setCharactersInScene(currentScene, charactersInScene);
        }
    }

    static async removeCharacterFromScene(characterURL, currentScene) {
        if (!currentScene) currentScene = game.scenes.viewed;
        let charactersInScene = await InSceneCharacterManager.getCharactersInScene();
        //filter any urls that don't match this one
        charactersInScene = charactersInScene.filter((url) => url !== characterURL);
        await InSceneCharacterManager.setCharactersInScene(currentScene, charactersInScene);
    }
    static async getCharactersInScene(currentScene) {
        if (!currentScene) currentScene = game.scenes.viewed;
        let charactersInScene = await currentScene.getFlag("hud-and-trackers", "charactersInScene");
        if (!charactersInScene) {
            await currentScene.setFlag("hud-and-trackers", "charactersInScene", []);
        }
        return charactersInScene;
    }

    static async setCharactersInScene(currentScene, charactersInScene) {
        if (!currentScene) currentScene = game.scenes.viewed;
        await currentScene.setFlag("hud-and-trackers", "charactersInScene", charactersInScene);
    }
}
