export interface InputStreamer {
    next(): string
    peek(): string
    eof(): boolean
    throwError(msg: string): void
}

export function InputStream(input: string): InputStreamer {
    let position = 0
    let line = 1
    let column = 0

    return { next, peek, eof, throwError }

    function next(): string {
        const char = input.charAt(position++)
        if (char != "\n") {
            column++
            return char
        }

        line++
        column = 0
        return char
    }

    function peek(): string {
        return input.charAt(position)
    }

    function eof(): boolean {
        return peek() == ""
    }

    function throwError(msg: string): void {
        throw new Error(`${msg} (${line}:${column})`)
    }
}
