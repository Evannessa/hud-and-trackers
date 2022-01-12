Hooks.on("canvasReady", () => {
    let tokenDocs = game.scenes.viewed.getEmbeddedCollection("Token").contents;
    tokenDocs.forEach((tokenDoc) => createDispositionMarker(tokenDoc));
});

function createDispositionMarker(tokenDoc) {
    if (!tokenDoc) {
        return;
    }
    let token = tokenDoc.object;
    let disposition = tokenDoc.data.disposition;
    console.log(token, disposition);

    let texturePath;
    texturePath = "modules/hud-and-trackers/images/convergence-target.png";
    if (token.marker) {
        //destroy the marker PIXI Container stored on the token
        token.marker.destroy();

        //delete the property itself that was storing it
        delete token.marker;
    }

    token.marker = token.addChildAt(
        new PIXI.Container(),
        token.getChildIndex(token.icon)
    );
    const sprite = PIXI.Sprite.from(texturePath);
    token.marker.addChild(sprite);
    sprite.zIndex = 2000;
    sprite.width = 200;
    sprite.height = 200;
    sprite.anchor.set(0.5, 0.5);
    sprite.position.set(token.w / 2, token.h / 2);

    let color;
    switch (disposition) {
        case 1:
            //friendly
            color = "0x99FFCC";
            break;
        case 0:
            //neutral
            color = "0x9999FF";
            break;
        case -1:
            //hostile
            color = "0xCC0033";
    }
    token.marker.children.forEach((child) => (child.tint = color));
}
