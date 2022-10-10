Hooks.on("renderHeadsUpDisplay", (app, html, data) => {
    console.log("%chooks.js line:2 args", "color: #26bfa5;", arguments);
    html[0].style.zIndex = 70;
    html.append(`<div id="characterDisplay"></div>`);
});
Hooks.on("ready", () => {
    console.log(
        "%chooks.js line:7 document",
        "color: white; background-color: #007acc;",
        document.documentElement.querySelector("#hud")
    );
});
