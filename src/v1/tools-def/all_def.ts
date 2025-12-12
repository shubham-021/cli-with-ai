import { get_def } from "./function-temp/temp_fn.js";

const web_search = get_def({
    name: "web_search",
    description: "Search the web for information. Use this to get the latest information on a topic.",
    properties: {
        openai: {
            query: { type: "string", description: "The query to search the web for" }
        },
        gemini: {
            query: { type: "string" }
        },
        claude: {
            query: { type: "string" }
        }
    },
    required: ["query"]
});

const parse_pdf = get_def({
    name: "parse_pdf",
    description: "Read the pdf from the given path , then parse it and return the text content.",
    properties: {
        openai: {
            path: { type: "string", description: "File path of the PDF" }
        },
        gemini: {
            path: { type: "string" }
        },
        claude: {
            path: { type: "string" }
        }
    },
    required: ["path"]
});

const write_file = get_def({
    name: "write_file",
    description: "Write content to a file. Overwrites existing content.",
    properties: {
        openai: {
            path: { type: "string", description: "File path to write to" },
            content: { type: "string", description: "Content to write" }
        },
        gemini: {
            path: { type: "string" },
            content: { type: "string" }
        },
        claude: {
            path: { type: "string" },
            content: { type: "string" }
        }
    },
    required: ["path", "content"]
});

const execute_command = get_def({
    name: "execute_command",
    description: "Execute shell commands like npm install, npm run dev, git commands, etc. Use this after creating project files to install dependencies or run scripts.",
    properties: {
        openai: {
            command: { type: "string", description: "The shell command to execute" },
            cwd: { type: "string", description: "Working directory (relative path)" }
        },
        gemini: {
            command: { type: "string" },
            cwd: { type: "string" }
        },
        claude: {
            command: { type: "string" },
            cwd: { type: "string" }
        }
    },
    required: ["command"]
});

const curr_loc = get_def({
    name: "current_loc",
    description: "Get the current location of the project.",
    properties: {
        openai: {},
        gemini: {},
        claude: {}
    },
    required: []
});

const make_dir = get_def({
    name: "make_dir",
    description: "Create a directory. Relative paths resolve from current working directory.",
    properties: {
        openai: {
            path: { type: "string", description: "Directory path to create" }
        },
        gemini: {
            path: { type: "string" }
        },
        claude: {
            path: { type: "string" }
        }
    },
    required: ["path"]
});

const create_file = get_def({
    name: "create_file",
    description: "Create an empty file. Parent directories will be created if missing.",
    properties: {
        openai: {
            path: { type: "string", description: "File path to create" }
        },
        gemini: {
            path: { type: "string" }
        },
        claude: {
            path: { type: "string" }
        }
    },
    required: ["path"]
});

const append_file = get_def({
    name: "append_file",
    description: "Append content to a file.",
    properties: {
        openai: {
            path: { type: "string", description: "File path to append to" },
            content: { type: "string", description: "Content to append" }
        },
        gemini: {
            path: { type: "string" },
            content: { type: "string" }
        },
        claude: {
            path: { type: "string" },
            content: { type: "string" }
        }
    },
    required: ["path", "content"]
});

const read_file = get_def({
    name: "read_file",
    description: "Read the contents of a file and return it as text.",
    properties: {
        openai: {
            path: { type: "string", description: "File path to read from" }
        },
        gemini: {
            path: { type: "string" }
        },
        claude: {
            path: { type: "string" }
        }
    },
    required: ["path"]
});

const delete_file_dir = get_def({
    name: "delete_file_dir",
    description: "Delete any file or directory",
    properties: {
        openai: {
            path: { type: "string" , description: "File or directory path to be deleted"},
            recursive: { type: "boolean" , description: "True for directory , false for file"}
        },
        gemini: {
            path: { type: "string"},
            recursive: { type: "boolean" }
        },
        claude: {
            path: { type: "string"},
            recursive: { type: "boolean" }
        }
    },
    required: ["path"]
});

const move_file = get_def({
    name: "move_file",
    description: "Move any file",
    properties: {
        openai: {
            source: { type: "string" , description: "File path to be moved"},
            destination: { type: "string" , description: "Destination path , where file has to be moved"}
        },
        gemini: {
            source: { type: "string"},
            destination: { type: "string" }
        },
        claude: {
            source: { type: "string"},
            destination: { type: "string" }
        }
    },
    required: ["source","destination"]
});

const copy_file = get_def({
    name: "copy_file",
    description: "Copy any file",
    properties: {
        openai: {
            source: { type: "string" , description: "File path to be copied"},
            destination: { type: "string" , description: "Destination path , where file has to be copied"}
        },
        gemini: {
            source: { type: "string"},
            destination: { type: "string" }
        },
        claude: {
            source: { type: "string"},
            destination: { type: "string" }
        }
    },
    required: ["source","destination"]
});

const search_in_files = get_def({
    name: "search_in_files",
    description: "Search for a specific query string within files in a directory, supporting glob patterns and case sensitivity.",
    properties: {
        openai: {
            query: { 
                type: "string", 
                description: "The string query to search for within the file contents."
            },
            path: { 
                type: "string", 
                description: "The directory path to start the search from (optional, defaults to '.')."
            },
            filePattern: { 
                type: "string", 
                description: "A glob pattern to filter which files to search (optional, defaults to '**/*')."
            },
            caseSensitive: {
                type: "boolean",
                description: "If true, the search will be case-sensitive (optional, defaults to false)."
            }
        },
        gemini: {
            query: { type: "string" },
            path: { type: "string" },
            filePattern: { type: "string" },
            caseSensitive: { type: "boolean" }
        },
        claude: {
            query: { type: "string" },
            path: { type: "string" },
            filePattern: { type: "string" },
            caseSensitive: { type: "boolean" }
        }
    },
    required: ["query"]
});

const http_request = get_def({
    name: "http_request",
    description: "Perform an HTTP request to a specified URL, supporting GET, POST, PUT, and DELETE methods, custom headers, and a JSON body.",
    properties: {
        openai: {
            url: { 
                type: "string", 
                description: "The URL to send the HTTP request to."
            },
            method: { 
                type: "string", 
                enum: ['GET', 'POST', 'PUT', 'DELETE'],
                description: "The HTTP method to use (optional, defaults to 'GET')."
            },
            headers: { 
                type: "object", 
                description: "A dictionary of custom headers to include in the request (optional)."
            },
            body: {
                type: "object",
                description: "The request body, which will be automatically stringified as JSON (required for POST/PUT, optional otherwise)."
            }
        },
        gemini: {
            url: { type: "string" },
            method: { type: "string", enum: ['GET', 'POST', 'PUT', 'DELETE'] },
            headers: { type: "object" },
            body: { type: "object" }
        },
        claude: {
            url: { type: "string" },
            method: { type: "string", enum: ['GET', 'POST', 'PUT', 'DELETE'] },
            headers: { type: "object" },
            body: { type: "object" }
        }
    },
    required: ["url"]
});


export const all_def = [
    web_search,
    parse_pdf, 
    write_file, 
    execute_command, 
    curr_loc,
    make_dir, 
    create_file, 
    append_file, 
    read_file,
    delete_file_dir,
    move_file,
    copy_file,
    search_in_files,
    http_request
];