type WheelNumber = 1 | 2 | 3 | 4;
type Side = "Light" | "Dark";
type ClockType = "Corner" | "Edge" | "Centre";
type PinNumber = 1 | 2 | 3 | 4;
type PinState = -1 | 1;

class Position {
    constructor (
        public row: number,
        public col: number,
        public side: Side
    ) {} // No need to assign value as public already does it
}

class ClockFace {
    constructor (
        public type: ClockType,
        public time: number,
        public quadrants: Set<PinNumber>
    ) {}

    changeTime(move: number): void {
        this.time = (((this.time - 1 + move) % 12 + 12) % 12) + 1;
    }
}

class Pins {
    pins: Map<PinNumber, PinState>;

    constructor () {
        this.pins = new Map<PinNumber, PinState>([
            [1, -1],
            [2, -1],
            [3, -1],
            [4, -1],
        ]);
    }

    changeState(pinNumber: PinNumber, pinState: PinState): void {
        this.pins.set(pinNumber, pinState);
    }

    get activePins(): Set<PinNumber> {
        const active = new Set<PinNumber>();

        for (const[pinNumber, pinState] of this.pins) {
            if (pinState == 1) active.add(pinNumber);
        }
        return active;
    }

    get otherPins(): Set<PinNumber> {
        const other = new Set<PinNumber>();

        for (const[pinNumber, pinState] of this.pins) {
            if (pinState == -1) other.add(pinNumber);
        }
        return other;
    }
}

const setsIntersect = (a: Set<PinNumber>, b: Set<PinNumber>) : boolean => {
    for (const item of a) {
        if (b.has(item)) return true;
    }
    return false;
}

const SWAP_MAP: Record<PinNumber | WheelNumber, PinNumber | WheelNumber> = {
    1: 2,
    2: 1,
    3: 4,
    4: 3,
};


type ClockDataType = [number, number, Side, ClockType, number, PinNumber[]];

class Clock {
    pins: Pins;
    clocks: Map<Position, ClockFace>;

    constructor () {
        this.pins = new Pins();
        this.clocks = new Map();

        const clockData: ClockDataType[] = [
            [0, 0, "Light", "Corner", 12, [1]],
            [0, 1, "Light", "Edge",   12, [1, 2]],
            [0, 2, "Light", "Corner", 12, [2]],
            [1, 0, "Light", "Edge",   12, [1, 3]],
            [1, 1, "Light", "Centre", 12, [1, 2, 3, 4]],
            [1, 2, "Light", "Edge",   12, [2, 4]],
            [2, 0, "Light", "Corner", 12, [3]],
            [2, 1, "Light", "Edge",   12, [3, 4]],
            [2, 2, "Light", "Corner", 12, [4]],
            [0, 0, "Dark", "Corner", 12, [2]],
            [0, 1, "Dark", "Edge",   12, [1, 2]],
            [0, 2, "Dark", "Corner", 12, [1]],
            [1, 0, "Dark", "Edge",   12, [2, 4]],
            [1, 1, "Dark", "Centre", 12, [1, 2, 3, 4]],
            [1, 2, "Dark", "Edge",   12, [1, 3]],
            [2, 0, "Dark", "Corner", 12, [4]],
            [2, 1, "Dark", "Edge",   12, [3, 4]],
            [2, 2, "Dark", "Corner", 12, [3]]
        ];

        for (const[row, col, side, type, time, quads] of clockData) {
            const pos: Position = new Position(row, col, side);
            const face: ClockFace = new ClockFace(type, time, new Set(quads));
            this.clocks.set(pos, face);
        }
    }

    updateClock (wheel: WheelNumber, move: number): void {
        const active: Set<PinNumber> = this.pins.activePins;
        const other: Set<PinNumber> = this.pins.otherPins;

        for (const [pos, face] of this.clocks) {
            if (pos.side === "Light") {
                if (active.has(wheel)) {
                    if (setsIntersect(face.quadrants, active)) {
                        face.changeTime(move);
                    }
                } else {
                    if (face.type === "Corner" && !(setsIntersect(face.quadrants, active))) {
                        face.changeTime(move);
                    }
                }
            }
        }

        for (const [pos, face] of this.clocks) {
            if (pos.side === "Dark") {
                if (other.has(wheel)) {
                    if (setsIntersect(face.quadrants, other)) {
                        face.changeTime(-move);
                    }
                } else {
                    if (face.type === "Corner" && !(setsIntersect(face.quadrants, other))) {
                        face.changeTime(-move);
                    }
                }
            }
        }
    }

    // this union is actually not required but keeping it as its easier to understand 
    swapValue(value: PinNumber | WheelNumber): PinNumber | WheelNumber {
        return SWAP_MAP[value];
    }

    swapPins (): void {
        const original: Map<PinNumber, PinState> = new Map(this.pins.pins);
        for (const [pinNumber] of original) {
            this.pins.pins.set(pinNumber, (-1 * original.get(this.swapValue(pinNumber))!) as PinState);
            // exclamation mark is because it enforces that the key will always be present 
        }
    }

    turnWheel (wheel: WheelNumber, move: number, mainSide: Side): void {
        if (mainSide == "Light") {
            this.updateClock(wheel, move);
        } else {
            this.swapPins();
            this.updateClock(this.swapValue(wheel), -move);
            this.swapPins();
        }
    }

    getClockAt(row: number, col: number, side: Side): ClockFace {
        for (const[pos, face] of this.clocks) {
            if (pos.row == row && pos.col === col && pos.side === side) {
                return face;
            }
        }

        throw new Error(`Clock not found at ${row}, ${col}, ${side}`);
    }

    toString(mainSide: Side = "Light"): string {
        const sides: [Side, Side] = mainSide === "Light"
            ? ["Light", "Dark"]
            : ["Dark", "Light"];

        const lines: string[] = [];

        for (const side of sides) {
            const title = side === "Light" ? "LIGHT SIDE" : "DARK SIDE";
            lines.push(title);
            lines.push("-".repeat(title.length));

            for (let r = 0; r < 3; r++) {
                const rowVals: string[] = [];
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

// --- Quick test ---
const clock = new Clock();
clock.pins.changeState(2, 1);
clock.turnWheel(2, 3, "Dark");
console.log(clock.toString("Dark"));
clock.pins.changeState(2, -1);
clock.pins.changeState(3, 1);
clock.turnWheel(3, -2, "Light");
console.log(clock.toString("Light"));