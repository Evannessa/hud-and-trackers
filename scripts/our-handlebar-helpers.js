export default function registerAllHandlebarHelpers() {
    Handlebars.registerHelper("convertToSentence", function (strInputCode) {
        let result = strInputCode.replace(/([A-Z])/g, " $1");
        let finalResult = result.charAt(0).toUpperCase() + result.slice(1);
        return finalResult;
    });
    Handlebars.registerHelper("getFirstTwoLetters", function (strInput) {
        let firstTwo = strInput.substring(0, 2);
        return firstTwo;
    });
    Handlebars.registerHelper("getUserData", (userId, prop) => {
        let user = game.users.get(userId);
        return user.data[prop];
    });
    Handlebars.registerHelper("getAtIndex", (array, index) => {
        return array[index];
    });
    Handlebars.registerHelper("returnLength", (object) => {
        console.log(object);
        return Object.keys(object).length;
    });
    // Handlebars.registerHelper("getCharacterData", (id) => {

    // });
    // Handlebars.registerHelper("areScenesEqual", )
}
