import CombatHud from "./combat-hud.js";
export default function registerSettings(){
	game.settings.register(CombatHud.ID, "currentPhase", {
		scope: "client",
		config: false,
		type: Number,
		onChange: currentPhase => {
			if(!game.user.isGM) Hooks.call("combatHudPhaseChanged", currentPhase);
		}
	})
	game.settings.register(CombatHud.ID, "currentRound", {
		scope: "client",
		config: false,
		type: Number,
		onChange: currentRound => {
			if(!game.user.isGM) Hooks.call("combatHudRoundChanged", currentRound);
		}
	})
	game.settings.register(CombatHud.ID, "activeCategories", {
		scope: "client",
		config: false,
		type: Object,
		// onChange: activeCategories => {
		// 	if(!game.user.isGM) Hooks.call("combatHudRoundChanged", currentRound);
		// }
	})

}