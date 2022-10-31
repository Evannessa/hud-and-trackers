export const HudActions = {
    tab: {
        click: {},
        hover: {
            hideTab: {
                onHover: async (event, options) => {
                    const { app } = options;
                    const isLeave = event.type === "mouseleave" || event.type === "mouseout";
                    if (isLeave) {
                        this.render(true);
                    }
                },
            },
        },
    },
    hudItem: {
        click: {},
        hover: {},
    },
};
