interface Outpost{
    name: string,
        pointPool: number,
        ratings: {
            comfort: {
                value: number,
                name: string
            },
            destruction: { value: number, name: "Destruction" },
            defenseSupport: { value: number, name: "Defense/Support" },
            dataProcessing: { value: number, name: "Data Processing & Automation" },
            resourceProcessing: { value: number, name: "Resource Processing" },
        },
        consequenceClocks: {
            pollution: {
                name: "Tumult/Pollution",
                value: number,
                symbol: "🧪️"
            },
            destabilization: {
                name: "Destabilization/Calamity",
                value: number,
                symbol: "💥"
            },
            powerSurge: {
                name: "Power Surge",
                value: number,
                symbol: "⚡"
            },
        }
}

