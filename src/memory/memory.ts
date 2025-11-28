import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const MEM_DIR = path.join(os.homedir(), ".arkacli");
const MEM_FILE = path.join(MEM_DIR, "memory.json");

export function loadMemory() {
    try {
        if (!fs.existsSync(MEM_FILE)) return { summary: "" };
        const data = fs.readFileSync(MEM_FILE, "utf-8");
        return JSON.parse(data);
    } catch (e) {
        return { summary: "" };
    }
}

export function saveMemory(summary: string) {
    try {
        if (!fs.existsSync(MEM_DIR)) {
            fs.mkdirSync(MEM_DIR, { recursive: true });
        }

        fs.writeFileSync(MEM_FILE, JSON.stringify({ summary }, null, 2), "utf-8");
    } catch (e) {
        console.error("Failed to save memory: ", e);
    }
}