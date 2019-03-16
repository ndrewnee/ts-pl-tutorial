import { InputStreamer } from "./input"

export interface Token {
    type: "number" | "keyword" | "variable" | "string"
    value: string | number
}

export interface TokenStreamer {
    next(): Token
    peek(): Token
    eof(): boolean
    croak(msg: string): void
}

export class TokenStream {
    private input: InputStreamer
    private current: number | null
    private static keywords = " if then else lambda λ true false "
    private static ids = "?!-<>=0123456789"
    private static operators = "+-*/%=&|<>!"
    private static punctuations = ",;(){}[]"
    constructor(input: InputStreamer) {
        this.input = input
        this.current = null
    }

    isKeyword(word: string): boolean {
        return TokenStream.keywords.includes(` ${word} `)
    }

    isDigit(char: string): boolean {
        return /[0-9]/i.test(char)
    }

    isIdStart(char: string): boolean {
        return /[a-zλ_]/i.test(char)
    }

    isId(char: string): boolean {
        return this.isIdStart(char) || TokenStream.ids.includes(char)
    }

    isOperator(char: string) {
        return TokenStream.operators.includes(char)
    }

    isPunctuation(char: string) {
        return TokenStream.punctuations.includes(char)
    }

    isWhitespace(char: string) {
        " \t\n".includes(char)
    }

    readWhile(predicate: (char: string) => boolean) {
        let str = ""
        while (!this.input.eof() && predicate(this.input.peek())) {
            str += this.input.next()
        }
        return str
    }

    readNumber(): Token {
        let hasDot = false
        const number = this.readWhile(
            (char: string): boolean => {
                if (char != ".") {
                    return this.isDigit(char)
                }

                if (hasDot) {
                    return false
                }

                hasDot = true
                return true
            },
        )

        return { type: "number", value: parseFloat(number) }
    }

    readIdent(): Token {
        const id = this.readWhile(this.isId)
        return {
            type: this.isKeyword(id) ? "keyword" : "variable",
            value: id,
        }
    }

    readEscaped(end: string): string {
        let escaped = false
        let str = ""
        this.input.next()
        while (!this.input.eof()) {
            const char = this.input.next()
            if (escaped) {
                str += char
                escaped = false
                continue
            }

            if (char == "\\") {
                escaped = true
                continue
            }

            if (char == end) {
                break
            }

            str += char
        }

        return str
    }

    readString(): Token {
        return {
            type: "string",
            value: this.readEscaped('"'),
        }
    }

    skipComment() {
        this.readWhile((char: string): boolean => char != "\n")
        this.input.next()
    }
}
