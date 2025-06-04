import { Client, defaultConnectionOptions } from "archipelago.js";


export class ArchipelagoClient {

    private static instance: ArchipelagoClient;

    public static getInstance(): ArchipelagoClient {
        if (!ArchipelagoClient.instance) {
            ArchipelagoClient.instance = new ArchipelagoClient();
        }
        return ArchipelagoClient.instance;
    }



    public client: Client;

    constructor() {
        //this.showConnected(false);
        this.client = new Client();
        console.log("Created archipelago client");

        this.client.messages.on("message", (content) => {
            console.log(content);
        });

        this.client.messages.on()

        document.getElementById('input-chat').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const input = e.target as HTMLInputElement;
                this.input(input.value);
                input.value = '';
            }
        });

        document.getElementById('connect').addEventListener('click', (e) => {
            console.log('ahaaa');
            this.login(
                (document.getElementById('input-host') as HTMLInputElement).value,
                (document.getElementById('input-port') as HTMLInputElement).value,
                (document.getElementById('input-slot') as HTMLInputElement).value,
                (document.getElementById('input-password') as HTMLInputElement).value
            );
        });
    }

    public login(host: string, port: string, playerName: string, password: string) {
        this.client.login(host + ':' + port, playerName, "Insomnia a sleepless journey", { password: password })
            .then(function () { console.log("Connected to the Archipelago server!"); this.showConnected(true); })
            .catch(function (e) { console.error(e); alert(e); });
    }

    public input(text: string): void {
        this.client.messages.say(text);
    }

    public showId(id: string, value: boolean): void {
        document.getElementById(id).style.setProperty("display", value ? "" : "none")
    }

    public showConnected(value: boolean): void {
        this.showId('connection-inputs', !value);
        this.showId('cdiv', value);
        this.showId('input-chat', value);
    }
}

