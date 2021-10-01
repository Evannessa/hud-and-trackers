import CombatHud from "./combat-hud.js";
export default function registerSettings(){
	game.settings.register(CombatHud.ID, "currentPhase", {
		scope: "world",
		config: false,
		type: String,
		default: "fastPlayerTurn",
		onChange: currentPhase => {
			if(!game.user.isGM) Hooks.call("combatHudPhaseChanged", currentPhase);
		}
	})
	game.settings.register(CombatHud.ID, "currentRound", {
		scope: "world",
		config: false,
		type: Number,
		default: 0,
		onChange: currentRound => {
			if(!game.user.isGM) Hooks.call("combatHudRoundChanged", currentRound);
		}
	})
	game.settings.register(CombatHud.ID, "activeCategories", {
		scope: "world",
		config: false,
		type: Object,
		default: {},
		// onChange: activeCategories => {
		// 	if(!game.user.isGM) Hooks.call("combatHudRoundChanged", currentRound);
		// }
	})
	game.settings.register(CombatHud.ID, "activationMaps", {
		scope: "world",
		config: false,
		type: Object,
		default: {},
		onChange: activationMaps => {
			if(!game.user.isGM) Hooks.call("combatHudActivationChanged", activationMaps);
		}
	})
	game.settings.register(CombatHud.ID, "combatActive", {
		scope: "world",
		config: false,
		type: Boolean,
		default: false,
		onChange: combatActive => {
			if(!game.user.isGM) Hooks.call("combatActiveChanged", combatActive);
		}
	})

}