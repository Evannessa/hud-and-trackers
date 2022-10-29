/**
 * Description
 */
export class InSceneEntityManager {
    static async processEntityType(entityData, currentScene, type) {
        const { url } = entityData;
        if (!currentScene) currentScene = game.scenes.viewed;
        const flagName = type === "character" ? "charactersInScene" : "linkedLocations";
        const entitiesInScene = await InSceneEntityManager.getEntitiesInScene(currentScene, flagName);
        return { url, flagName, entitiesInScene };
    }
    static async addEntityToScene(entityData, currentScene, type = "character") {
        let { url, flagName, entitiesInScene } = await InSceneEntityManager.processEntityType(
            entityData,
            currentScene,
            type
        );
        // const { url } = entityData;
        // if (!currentScene) currentScene = game.scenes.viewed;
        // const flagName = type === "character" ? "charactersInScene" : "linkedLocations";
        // let entitiesInScene = await InSceneEntityManager.getEntitiesInScene(currentScene, flagName);
        //make sure it doesn't exist already before pushing it
        let exists = entitiesInScene.find((data) => data.url === url);
        if (!exists) {
            entitiesInScene.push(entityData);
            await InSceneEntityManager.setEntitiesInScene(currentScene, entitiesInScene, flagName);
        }
    }

    static async removeEntityFromScene(entityData, currentScene, type = "character") {
        let { url, flagName, entitiesInScene } = await InSceneEntityManager.processEntityType(
            entityData,
            currentScene,
            type
        );
        // const { url } = characterData;
        // if (!currentScene) currentScene = game.scenes.viewed;
        // const entitiesInScene = await InSceneEntityManager.getEntitiesInScene();
        // const flagName = type === "character" ? "charactersInScene" : "linkedLocations";
        //filter any urls that don't match this one
        console.log("%cInSceneCharacterManager.js line:10 entitiesInScene BEFORE", "color: #26bfa5;", entitiesInScene);
        entitiesInScene = entitiesInScene.filter((data) => data.url !== url);
        console.log("%cInSceneCharacterManager.js line:10 entitiesInScene AFER", "color: #26bfa5;", entitiesInScene);
        await InSceneEntityManager.setEntitiesInScene(currentScene, entitiesInScene, flagName);
    }
    static async getEntitiesInScene(currentScene, flagName = "charactersInScene") {
        if (!currentScene) currentScene = game.scenes.viewed;
        const entitiesInScene = await currentScene.getFlag("hud-and-trackers", flagName);
        // let charactersInScene = await currentScene.getFlag("hud-and-trackers", "charactersInScene");
        if (!entitiesInScene) {
            entitiesInScene = await currentScene.setFlag("hud-and-trackers", flagName, []);
        }
        return entitiesInScene;
    }

    static async setEntitiesInScene(currentScene, entitiesInScene, flagName = "charactersInScene") {
        if (!currentScene) currentScene = game.scenes.viewed;
        await currentScene.setFlag("hud-and-trackers", flagName, entitiesInScene);
        if (flagName === "charactersInScene") {
            Hooks.callAll("sceneCharactersUpdated", currentScene);
        }
    }
}
