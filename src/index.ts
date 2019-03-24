import { TokenStream } from "./tokenizer"
import { InputStream } from "./input"
import { parse } from "./parser"
import { Environment, evaluate } from "./eval"

const globalEnv = new Environment()

globalEnv.define("print", console.log)
globalEnv.define("println", console.log)

let code = ""
process.stdin.on("readable", () => {
    const chunk = process.stdin.read()
    if (chunk) {
        code += chunk
    }
})

process.stdin.on("end", () => {
    const ast = parse(TokenStream(InputStream(code)))
    evaluate(ast, globalEnv)
})
