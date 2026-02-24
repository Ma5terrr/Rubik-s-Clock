const CORNER = "Corner";
const EDGE = "Edge";
const CENTRE = "Centre";
const LIGHTSIDE = 0;
const DARKSIDE = 1;



class Position {
    constructor (row, col, side) {
        this.row = row; // from 0-2
        this.col = col; // from 0-2
        this.side = side; // 0 is light side and 1 is dark side
    }

}

class ClockFace {
    constructor (type, time, quadrants) {
        this.type = type; // Corner or Edge or Centre
        this.time = time; // from 1-12
        this.quadrants = quadrants; // new Set([]) can take values from 1-4
    }

    changeTime(move) {
        this.time = (((this.time - 1 + move) % 12 + 12) % 12) + 1; // JS can return negative values with %
    }; 
}

class Pins {
    constructor () {
        this.pins = new Map([
            [1, 0],
            [2, 0],
            [3, 0],
            [4, 0]
        ]); // Initialize all pins to down; 0 - down and 1 - up 
    }

    changeState (pinNumber, state) {
        this.pins.set(pinNumber, state);
    };

    // basically get makes the method into a property so u dont need to call it using brackets
    get activePins() {
        const active = new Set();
        for (const [pinNumber, state] of this.pins) {
            if (state == 1) active.add(pinNumber); 
        }
        return active;
    };

    get otherPins() {
        const other = new Set();
        for (const [pinNumber, state] of this.pins) {
            if (state == 0) other.add(pinNumber); 
        }
        return other;
    };
}

function setsIntersect(a, b) {
    for (const item of a) {
        if (b.has(item)) return true;
    }
    return false;
}


class Clock {
    constructor () {
        this.pins = new Pins();
        this.clocks = new Map();

        const clockData = [
            [0, 0, 0, CORNER, 12, [1]],
            [0, 1, 0, EDGE,   12, [1, 2]],
            [0, 2, 0, CORNER, 12, [2]],
            [1, 0, 0, EDGE,   12, [1, 3]],
            [1, 1, 0, CENTRE, 12, [1, 2, 3, 4]],
            [1, 2, 0, EDGE,   12, [2, 4]],
            [2, 0, 0, CORNER, 12, [3]],
            [2, 1, 0, EDGE,   12, [3, 4]],
            [2, 2, 0, CORNER, 12, [4]],
            [0, 0, 1, CORNER, 12, [2]],
            [0, 1, 1, EDGE,   12, [1, 2]],
            [0, 2, 1, CORNER, 12, [1]],
            [1, 0, 1, EDGE,   12, [2, 4]],
            [1, 1, 1, CENTRE, 12, [1, 2, 3, 4]],
            [1, 2, 1, EDGE,   12, [1, 3]],
            [2, 0, 1, CORNER, 12, [4]],
            [2, 1, 1, EDGE,   12, [3, 4]],
            [2, 2, 1, CORNER, 12, [3]]
        ];

        for (const [row, col, side, type, time, quads] of clockData) {
            const pos = new Position(row, col, side);
            const face = new ClockFace(type, time, new Set(quads));
            this.clocks.set(pos, face);
        }
    }

    updateClock (wheel, move) {
        const active = this.pins.activePins;
        const other = this.pins.otherPins;

        for (const [pos, face] of this.clocks) {
            if (pos.side === LIGHTSIDE) {
                if (active.has(wheel)) {
                    if (setsIntersect(face.quadrants, active)) {
                        face.changeTime(move);
                    }
                } else {
                    if (face.type === CORNER && !(setsIntersect(face.quadrants, active))) {
                        face.changeTime(move);
                    }
                }
            }
        }

        for (const [pos, face] of this.clocks) {
            if (pos.side === DARKSIDE) {
                if (other.has(wheel)) {
                    if (setsIntersect(face.quadrants, other)) {
                        face.changeTime(-move);
                    }
                } else {
                    if (face.type === CORNER && !(setsIntersect(face.quadrants, other))) {
                        face.changeTime(-move);
                    }
                }
            }
        }
    };

    swapValue (value) {
        const swapMap = new Map([
            [1, 2],
            [2, 1],
            [3, 4],
            [4, 3]
        ]);
        return swapMap.get(value);
    }

    swapPins () {
        const original = new Map(this.pins.pins);
        for (const [pinNumber] of original) {
            this.pins.pins.set(pinNumber, original.get(this.swapValue(pinNumber)));
        }
    }

    swapFaces() {
        const newClocks = new Map();
        for (const [pos, face] of this.clocks) {
            const swappedPos = new Position(pos.row, pos.col, pos.side === LIGHTSIDE ? DARKSIDE : LIGHTSIDE);
            newClocks.set(swappedPos, face);
        }
        this.clocks = newClocks;
    }

    turnWheel (wheel, move, mainSide) {
        if (mainSide == 0) {
            this.updateClock(wheel, move);
        } else {
            this.swapPins();
            this.swapFaces();
            this.updateClock(this.swapValue(wheel), move);
            this.swapFaces();
            this.swapPins();
        }       
    }

    getClockAt(row, col, side) {
        for (const [pos, face] of this.clocks) {
            if (pos.row === row && pos.col === col && pos.side === side) {
                return face;
            }
        }
    }

    toString() {
        const lines = [];

        for (const side of [0, 1]) {
            const title = side === 0 ? "LIGHT SIDE" : "DARK SIDE";
            lines.push(title);
            lines.push("-".repeat(title.length));

            for (let r = 0; r < 3; r++) {
                const rowVals = [];
                for (let c = 0; c < 3; c++) {
                    const t = this.getClockAt(r, c, side).time;
                    rowVals.push(String(t).padStart(2));
                }
                lines.push(rowVals.join(" "));
            }
            lines.push("");
        }

        return lines.join("\n");
    }
}



//--- Quick test ---
const clock = new Clock();
console.log(clock.toString());
clock.pins.changeState(2, 1);
clock.turnWheel(2, 3, 0);
console.log(clock.toString());