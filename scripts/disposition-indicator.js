Hooks.on("canvasReady", () => {
    if (game.user.isGM) {
        let tokenDocs = game.scenes.viewed.getEmbeddedCollection("Token").contents;
        tokenDocs.forEach((tokenDoc) => createDispositionMarker(tokenDoc));
    }
});
Hooks.on("updateToken", (doc, change, options) => {
    console.log("Disposition is ", change.disposition);
    if (change.disposition && game.user.isGM) {
        createDispositionMarker(doc);
    }
});

function createDispositionMarker(tokenDoc) {
    if (!tokenDoc) {
        return;
    }
    let token = tokenDoc.object;
    let disposition = tokenDoc.data.disposition;

    let texturePath;
    let color;
    switch (disposition) {
        case 1:
            //friendly
            color = "0x99FFCC";
            texturePath = "modules/hud-and-trackers/images/hearts.png";
            break;
        case 0:
            //neutral
            color = "0x9999FF";
            texturePath = "/modules/hud-and-trackers/images/person.png";
            break;
        case -1:
            //hostile
            texturePath = "/modules/hud-and-trackers/images/hades-symbol.png";
            color = "0xCC0033";
    }
    // texturePath = "modules/hud-and-trackers/images/convergence-target.png";
    if (token.marker) {
        //destroy the marker PIXI Container stored on the token
        token.marker.destroy();

        //delete the property itself that was storing it
        delete token.marker;
    }

    token.marker = token.addChild(new PIXI.Container());
    // token.marker = token.addChildAt(new PIXI.Container(), 0);
    const sprite = PIXI.Sprite.from(texturePath);
    token.marker.addChild(sprite);
    sprite.zIndex = 2000;
    sprite.width = 25;
    sprite.height = 25;
    // sprite.anchor.set(-0.25, -0.25);
    sprite.position.set(0, 0);
    sprite.anchor.set(0.5, 0.5);
    // sprite.position.set(token.w / 4, token.h / 4);

    token.marker.children.forEach((child) => (child.tint = color));
}
