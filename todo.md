## LLM HALLUCINAION OVER SEARCHING
    - Ex. Searching for : Who won the series between ind and sa ?
    - Expected : Searching for ind vs sa in 2025
    - Actual: Searching for ind vs sa in 2023

    - Solution : 
        - Better prompt ? 
        - Missing system prompt ?
        - Larger context (Short Term memory contains all the converstaions including tool results)


## ADD PARSERS (AST)
    - JS/TS : @babel/parser
    - PYTHON : ast module (built-in)
    - GO : go/parser
    - JAVA : javaparser
    - RUST : syn
    - RUBY : parser gem


    - TREE SITTER : 
        - Tree-sitter is a parser generator that supports 40+ languages with the same API.
        - Supported languages: JavaScript, TypeScript, Python, Go, Rust, Java, C, C++, C#, Ruby, PHP, Swift, Kotlin, Scala, Elixir, Haskell, and more

## REFACTOR (IN PROGRESS)
    - Stronger foundation for tool registering ✔️
    - Use ReAct arch instead for multi model pipeline ✔️
    - current prompt is vague , lots of other issues
    - May fix hallucination 😞
    - Migrating out of langchain to direct communication with providers ✔️
    - Still hallucinating (context management can be better i think)
    - Use ink for better ui (like claude code) ✔️