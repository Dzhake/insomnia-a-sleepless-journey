import { Client } from "archipelago.js";


export class ArchipelagoClient {

    public client: Client;

    constructor() {
        this.client = new Client();
        console.log("Created archipelago client");

        this.client.messages.on("message", (content) => {
            console.log(content);
        });

        this.client.messages.on()

        document.getElementById('input')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const input = e.target as HTMLInputElement;
                this.input(input.value);
                input.value = '';
            }
        });
    }

    private static instance: ArchipelagoClient;

    public static getInstance(): ArchipelagoClient {
        if (!ArchipelagoClient.instance) {
            ArchipelagoClient.instance = new ArchipelagoClient();
        }
        return ArchipelagoClient.instance;
    }

    public say(text: string): void {
        this.client.messages.say(text);
    }

    public connect(ip: string, playerName: string) {
        this.client.login(ip, playerName)
            .then(() => console.log("Connected to the Archipelago server!"))
            .catch(console.error);
    }

    public input(text: string): void {
        if (text.startsWith("connect ")) {
            const args: string[] = text.split(' ');
            this.connect(args[1], args[2]);
            return;
        }
        this.say(text);
    }
}

