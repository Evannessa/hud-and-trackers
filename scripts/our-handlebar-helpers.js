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
    Handlebars.registerHelper("getFirstNLetters", function (strInput, number) {
        number = parseInt(number)
        let firstTwo = strInput.substring(0, number);
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
        return Object.keys(object).length;
    });
    Handlebars.registerHelper("ternary", function (test, yes, no) {
        return test ? yes : no;
    });
    Handlebars.registerHelper("capitalize", (stringInput) => {
        if (stringInput && typeof stringInput === "string") {
            return stringInput.charAt(0).toUpperCase() + stringInput.slice(1);
        }
    });
    Handlebars.registerHelper("equalAny", (stringInput, array) => {
        let equalsAny = array.some((el) => el === stringInput);
        return equalsAny;
    });
    Handlebars.registerHelper('times', function (n, block) {
        let count = '';
        for (var i = 0; i < n; ++i)
            count += block.fn(i);
        return count;
    });
    Handlebars.registerHelper('ternary', function (test, yes, no) {
        return test ? yes : no;
    });
    Handlebars.registerHelper('eq', function(a, b) {
    return (a === b);
    });
    Handlebars.registerHelper('gt', function(a, b) {
    return (a > b);
    });
    Handlebars.registerHelper('gte', function(a, b) {
    return (a >= b);
    });
    Handlebars.registerHelper('lt', function(a, b) {
    return (a < b);
    });
    Handlebars.registerHelper('lte', function(a, b) {
    return (a <= b);
    });
    Handlebars.registerHelper('ne', function(a, b) {
    return (a !== b);
    });
}
    /**
     * Helpers below by Makis Tracend
     * @link https://gist.github.com/tracend/7522125
     * @author Makis Tracend
     */
//     // greater than or equal to
//     Handlebars.registerHelper('ge', function (a, b, options) {
//         let next = options
//         console.log({next, options})
//         return (a >= b) ? next.fn(this) : next.inverse(this);
//     });
//     // less than or equal to
//     Handlebars.registerHelper('le', function (a, b, options) {
//         let next = options//arguments[arguments.length - 1];
//         console.log({next, options})
//         return (a <= b) ? next.fn(this) : next.inverse(this);
//     });
//     // less than
//     Handlebars.registerHelper('lt', function (a, b, options) {
//         let next = options;
//         console.log({next, arguments})
//         return (a < b) ? next.fn(this) : next.inverse(this);
//     });
//     Handlebars.registerHelper('ne', function (a, b,options) {
//         let next = options;
//         console.log({next, arguments})
//         return (a !== b) ? next.fn(this) : next.inverse(this);
//     });
// }
// Handlebars.registerHelper("getCharacterData", (id) => {

// });
// Handlebars.registerHelper("areScenesEqual", )
