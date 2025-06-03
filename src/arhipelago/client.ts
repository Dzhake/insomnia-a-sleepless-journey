import { Client } from "archipelago.js";


export class ArchipelagoClient {

    public client: Client;

    constructor() {
        // Create a new instance of the Client class.
        this.client = new Client();
        console.log("Created archipelago client");

        // Set up an event listener for whenever a message arrives and print the plain-text content to the console.
        this.client.messages.on("message", (content) => {
            console.log(content);
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
}

