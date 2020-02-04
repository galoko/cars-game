const FIELD_NUMBER = 0x00;
const FIELD_STRING = 0x40;
const FIELD_ARRAY = 0x80;
const FIELD_OBJECT = 0xc0;

type FieldType = typeof FIELD_NUMBER | typeof FIELD_STRING | typeof FIELD_ARRAY | typeof FIELD_OBJECT;
type Decimals = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

export class SendablePacket {
    buffer: Array<number>;

    constructor() {
        this.buffer = [];
    }

    serialize(obj: object): Uint8Array {
        this.writeO(obj);

        return new Uint8Array(this.buffer);
    }

    writeFieldHeader(fieldType: FieldType, decimals: Decimals, isNegative: boolean, isLast: boolean): void {
        decimals &= 0x07;

        const sign = isNegative ? 0x08 : 0;
        const last = isLast ? 0x10 : 0;
        const header = fieldType | last | sign | decimals;
        this.buffer.push(header);
    }

    writeValue(value: any, isLast: boolean): void {
        const fieldType: FieldType | undefined = this.getFieldType(value);
        if (fieldType === undefined) {
            throw new Error('Unserializable field in Object.');
        }

        const decimals = fieldType === FIELD_NUMBER ? this.getDecimalCount(value) : 0;
        const isNegative = fieldType === FIELD_NUMBER ? value < 0 : false;

        this.writeFieldHeader(fieldType, decimals, isNegative, isLast);

        switch (fieldType) {
            case FIELD_NUMBER: {
                this.writeN(value, decimals);
                break;
            }
            case FIELD_STRING: {
                this.writeS(value);
                break;
            }
            case FIELD_OBJECT: {
                this.writeO(value);
                break;
            }
            case FIELD_ARRAY: {
                this.writeA(value);
                break;
            }
        }
    }

    writeN(n: number, decimals: number): void {
        // convert number to unsigned integer
        n = Math.abs(Math.round(n * Math.pow(10, decimals)));
        while (true) {
            const b: number = n & 0x7f;
            n >>= 7;
            if (n > 0) {
                this.buffer.push(b | 0x80);
            } else {
                this.buffer.push(b);
                break;
            }
        }
    }

    writeS(s: string): void {
        const bytes = new TextEncoder().encode(s);
        this.writeN(bytes.length, 0);
        this.buffer.push(...bytes);
    }

    // max is 7 (float)
    getDecimalCount(n: number): Decimals {
        let e = 1;
        while (e < 10 ** 7 && Math.round(n * e) / e !== n) e *= 10;
        return Math.round(Math.log10(e)) as Decimals;
    }

    getFieldType(v: any): FieldType | undefined {
        switch (typeof v) {
            case 'number': {
                if (!isFinite(v) || isNaN(v)) {
                    return undefined;
                }
                return FIELD_NUMBER;
            }
            case 'object': {
                if (v === null) {
                    return undefined;
                } else if (Array.isArray(v)) {
                    return FIELD_ARRAY;
                } else {
                    return FIELD_OBJECT;
                }
            }
            case 'string': {
                return FIELD_STRING;
            }
            default:
                return undefined;
        }
    }

    writeO(obj: any): void {
        const fields: Array<string> = Object.keys(obj);
        for (let fieldIndex = 0; fieldIndex < fields.length; fieldIndex++) {
            const isLast: boolean = fieldIndex === fields.length - 1;

            const field = fields[fieldIndex];
            const value: any = obj[field];

            this.writeValue(value, isLast);
        }
    }

    writeA(a: Array<any>): void {
        for (let i = 0; i < a.length; i++) {
            this.writeValue(a[i], i === a.length - 1);
        }
    }
}

export class ReadablePacket {
    data: Uint8Array;
    position: number;

    read(data: Uint8Array): object {
        this.data = data;
        this.position = 0;

        return this.readO();
    }

    readO(): object {
        const result = {};

        while (true) {
            //
        }
    }
}
