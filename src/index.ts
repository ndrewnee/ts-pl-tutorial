import { TokenStream } from "./tokenizer"
import { InputStream } from "./input"
import { parse } from "./parser"
import { Environment, evaluate } from "./eval"

const code = "sum = lambda(x, y) x + y; print(sum(2, 3));"
const ast = parse(TokenStream(InputStream(code)))
const globalEnv = new Environment()

globalEnv.define("print", console.log)

evaluate(ast, globalEnv)
