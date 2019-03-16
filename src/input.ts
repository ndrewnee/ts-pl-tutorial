export interface InputStreamer {
    next(): string
    peek(): string
    eof(): boolean
    croak(msg: string): void
}

export class InputStream implements InputStreamer {
    private input: string
    private position: number
    private line: number
    private column: number
    constructor(input: string) {
        this.input = input
        this.position = 0
        this.line = 1
        this.column = 0
    }

    next(): string {
        const char = this.input.charAt(this.position++)
        if (char != "\n") {
            this.column++
            return char
        }

        this.line++
        this.column = 0
        return char
    }

    peek(): string {
        return this.input.charAt(this.position)
    }

    eof(): boolean {
        return this.peek() == ""
    }

    croak(msg: string) {
        throw new Error(`${msg} (${this.line}:${this.column})`)
    }
}
