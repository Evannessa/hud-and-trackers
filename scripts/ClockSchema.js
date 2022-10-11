export class Clock {
    constructor(type, level) {
        this._type = type;
        this._level = level;
    }
}
export const ClockFactory = {
    makeClock: function (type, level) {
        return new Clock(type, level);
    },
};
