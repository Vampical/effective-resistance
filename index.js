"use strict";

const OPCODES = {
    376012: 61950,
    385362: 38899,
    386769: 36067,
    387110: 59169,
    387400: 25149,
    387421: 52025
};

function stats(event, type) {
    const piercing = event[`piercing${type}`];
    const piercingBonus = event[`piercing${type}Bonus`] ?? 0;
    const ignore = event[`defenseReduction${type}`];
    const ignoreBonus = event[`defenseReduction${type}Bonus`] ?? 0;

    if (![piercing, piercingBonus, ignore, ignoreBonus].every(Number.isFinite)) return null;

    const amount = Math.fround(Math.max(0, piercing + piercingBonus));

    if (!Number.isFinite(amount)) return null;

    const rate = Math.min(Math.fround(0.8), Math.fround(amount / Math.fround(amount + 10000)));

    return {
        factor: Math.fround(1 - rate),
        ignore: Math.max(0, ignore + ignoreBonus)
    };
}

function resistance(value, personal) {
    const current = Math.fround(value);
    let result = Math.max(-33333, Math.min(current, Math.fround(current - Math.fround(personal.ignore))));

    // Percentage piercing applies only to a nonnegative remainder.
    if (result >= 0) result = Math.fround(result * personal.factor);

    return Math.min(2147483647, Math.ceil(result));
}

module.exports = class EffectiveResistance {
    constructor(mod) {
        this.physical = null;
        this.magical = null;

        const dispatch = mod.dispatch;
        const name = "S_NPC_RESISTANCE";
        const known = dispatch.protocolMap.name.get(name);
        const opcode = known ?? OPCODES[dispatch.protocolVersion];
        const owner = dispatch.protocolMap.code.get(opcode);

        if (!opcode || owner && owner !== name) {
            mod.error(`Cannot register ${name} for protocol ${dispatch.protocolVersion}.`);

            return;
        }

        if (known === undefined) dispatch.addOpcode(name, opcode);

        const definition = [
            ["gameId", "uint64"],
            ["physicalResistance", "int32"],
            ["magicalResistance", "int32"]
        ];

        definition.type = "root";
        dispatch.addDefinition(name, 1, definition, false);

        mod.hook("S_LOGIN", "event", () => {
            this.physical = null;
            this.magical = null;
        });

        mod.hook("S_PLAYER_STAT_UPDATE", "*", { filter: { fake: false } }, event => {
            this.physical = stats(event, "Physical");
            this.magical = stats(event, "Magical");
        });

        mod.hook(name, 1, { filter: { fake: false } }, event => {
            if (!this.physical || !this.magical) return;

            const physical = resistance(event.physicalResistance, this.physical);
            const magical = resistance(event.magicalResistance, this.magical);

            if (physical === event.physicalResistance && magical === event.magicalResistance) return;

            event.physicalResistance = physical;
            event.magicalResistance = magical;

            return true;
        });
    }

    saveState() {
        return {
            physical: this.physical,
            magical: this.magical
        };
    }

    loadState(state) {
        const valid = value => value && Number.isFinite(value.factor) && value.factor >= 0 && value.factor <= 1 && Number.isFinite(value.ignore) && value.ignore >= 0;

        this.physical = valid(state?.physical) ? { ...state.physical } : null;
        this.magical = valid(state?.magical) ? { ...state.magical } : null;
    }
};
