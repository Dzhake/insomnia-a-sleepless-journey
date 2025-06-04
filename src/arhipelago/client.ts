import { Client, Item } from "archipelago.js";
import { Player } from "../player";
import { Core, CoreEvent, Scene } from '../core';
import { GameScene } from "../game";
import { MessageBox } from "../messagebox";
import { HintBox } from "../hintbox";


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

        this.client.items.on("itemsReceived", this.onReceive);

        document.getElementById('input-chat').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const input = e.target as HTMLInputElement;
                this.input(input.value);
                input.value = '';
            }
        });

        document.getElementById('connect').addEventListener('click', (e) => {
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

    public onReceive(items: Item[]) {
        const player: Player = Player.getInstance();
        for (const item of items) {
            switch (item.id) {
                case 13:
                    player.progress.increaseNumberProperty("stars");
                    break;
                case 14:
                    player.progress.increaseNumberProperty("kills");
                    break;
                default:
                    if (!player.progress.doesValueExistInArray("items", item.id)) {
                        this.receiveEquipment(item.id)
                    }
                    break;
            }
        }
    }

    public receiveEquipment(id: int) {
        const event: CoreEvent = Core.getInstance().event;
        let text = <Array<string>>event.localization.findValue(["chest", String(id)]);

        if (text == null) return;

        const HINT_ID = [5, 6, -1, 7, 8, 9, -1, -1, -1, -1, -1, 10];
        const WAIT_TIME = 45;

        event.audio.playSample(event.assets.getSample("item"), 0.40);

        event.audio.pauseMusic();

        const scene: Scene = Core.getInstance().activeScene;
        if (scene instanceof GameScene) {
            const message: MessageBox = (scene as GameScene).message;
            const hintbox: HintBox = (scene as GameScene).hintbox;
            message.addMessages(text);

            message.activate(WAIT_TIME, false, event => {

                if (id < HINT_ID.length && HINT_ID[id] >= 0) {

                    hintbox.setMessage(event.localization.findValue(["hints", String(HINT_ID[id])]));
                    hintbox.activate();
                }

                event.audio.resumeMusic();
            });
        }

        const player: Player = Player.getInstance();
        player.setObtainItemPose(id);
        player.progress.addValueToArray("items", id, true);
    }
}




export const Equipment: string[] = ["Running boots", "Nice helmet", "Master key", "Endless bag of tennis balls", "Lubricant", "Old rocket pack", "Rocket expansion", "Extra greasy hamburger", "Power glove", "Extra heart", "Poison mushroom of awesome powers", "Magic map", "Brain"];