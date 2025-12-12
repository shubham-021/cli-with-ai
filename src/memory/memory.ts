import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { Message_memory } from "../types.js";

const MEM_DIR = path.join(os.homedir(), ".arkacli");

// long term memory
const LTM_FILE = path.join(MEM_DIR, 'preferences.json');

// short term memory
const STM_FILE = path.join(MEM_DIR, 'current.json');


export function load_LTMemory(): Array<string> {
    try {
        if (!fs.existsSync(LTM_FILE)) return [];
        const data = fs.readFileSync(LTM_FILE, "utf-8");
        return JSON.parse(data);
    } catch (e) {
        return [];
    }
}

export function load_STMemory(): Array<Message_memory> {
    try {
        if (!fs.existsSync(STM_FILE)) return [];
        const data = fs.readFileSync(STM_FILE, "utf-8");
        return JSON.parse(data);
    } catch (e) {
        return [];
    }
}

export function delete_curr_STMemory() {
    try {
        fs.unlinkSync(STM_FILE);
    } catch (e) {
        return;
    }
}

export function saveLTMemory(preference: string) {
    try {
        if (!fs.existsSync(MEM_DIR)) {
            fs.mkdirSync(MEM_DIR, { recursive: true });
        }

        const prev_messages = load_LTMemory();
        prev_messages.push(preference);

        fs.writeFileSync(LTM_FILE, JSON.stringify(prev_messages, null, 2), "utf-8");
    } catch (e) {
        console.error("Failed to save memory: ", e);
    }
}

export function saveSTMemory(messages: Message_memory[]) {
    try {
        if (!fs.existsSync(MEM_DIR)) {
            fs.mkdirSync(MEM_DIR, { recursive: true });
        }

        const prev_messages = load_STMemory();
        for (const msg of messages) prev_messages.push(msg);

        fs.writeFileSync(STM_FILE, JSON.stringify(prev_messages, null, 2), "utf-8");
    } catch (e) {
        console.error("Failed to save memory: ", e);
    }
}