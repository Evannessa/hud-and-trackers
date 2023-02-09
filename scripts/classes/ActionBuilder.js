export const ActionBuilder = (function () {


    function init(actionsArray) {
        const actions = {

        }
        actionsArray.forEach((action) => {
            const { category, key, handler } = action
            actions[category][key] = {
                handler: async (event, options) => {
                    handler(event, options)
                }
            }
        })
        return actions
    }

    return {
        init
    }
})();
