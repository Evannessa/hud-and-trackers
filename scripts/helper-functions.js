export const moduleName = "hud-and-trackers"

export async function setSetting(name, value){
	await game.settings.set(moduleName, name, value);
}

export async function getSetting(name){
	await game.settings.get(moduleName, name);
}


export function getCanvasToken(id) {
	return canvas.tokens.get(id);
}
export function getActorFromToken(ourToken) {
	return game.actors.get(ourToken.data.actorId);
}

export function getSceneTokenFromActor(actor) {
	return canvas.scene.data.tokens.contents.find(token => token.name == actor.name)
}


export function getActorFromUser(user) {
	return user.character;
}

export async function createTokenFromTokenData(tokenData){
	const td = duplicate(tokenData);
	td.x = 100;
	td.y = 100;
	await Token.create(td);
}

export async function createTokenFromActor(ourActor) {
	let tk = duplicate(ourActor.data.token);
	tk.x = 100;
	tk.y = 100;
	let tokenDoc = await Token.create(tk);
	let tokenObject = tokenDoc[0]._object;
	return tokenObject;
}
//https://stackoverflow.com/questions/6860853/generate-random-string-for-div-id/6860916
export function idGenerator() {
	var S4 = function () {
		return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
	};
	return ("id" + S4() + S4() + "-" + S4() + "-" + S4() + "-" + S4() + "-" + S4() + S4() + S4());
}

export function getGameActorById(id) {
	return game.actors.get(id);
}
export function getGameActorByName(name){
	return game.actors.getName(name);
}
export function findInFolder(folder, name) {
	return folder.content.find((actor) => {
		return actor.name == name
	})
}

export function getFolderContents(folderName) {
	return game.folders.getName(folderName)?.content;
}

export async function callMacro(name) {
	let macro = game.macros.getName(name);
	if (macro) {
		await macro.execute();
	} else {
		ui.notifications.warn(`Couldn't find macro named ${name}`)
	}
}

export function addPCsToScene() {
	let tokensInScene = Array.from(game.scenes.viewed.tokens)
	let tokenNamesInScene = tokensInScene.map((element)=> {
		return element.name;
	})
	let PCs = getFolderContents("Main PCs")
	let pcTokens = PCs.map((element) => {
		return element.data.token
	})
	if (PCs) {
		const notInScene = pcTokens.filter(element => !tokenNamesInScene.includes(element.name));
		notInScene.forEach((element) => {
			createTokenFromTokenData(element);
		})
	} else {
		ui.notifications.warn("Could not find Main PCs folder")
	}
}