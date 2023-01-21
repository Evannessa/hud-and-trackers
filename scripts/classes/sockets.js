import { HelperFunctions } from "../helper-functions.js";

export let socket;

Hooks.once("socketlib.ready", () => {
    socket = socketlib.registerModule("hud-and-trackers");
    socket.register("setFlagValue", HelperFunctions.setFlagValue);
    // socket.register("renderNewClockFromData", renderNewClockFromData);
    // socket.register("refreshClockDependentItems", refreshClockDependentItems);
});
