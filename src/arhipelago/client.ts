import { Client, Item } from "archipelago.js";
import { Player } from "../player";
import { Core, CoreEvent, Scene } from '../core';
import { GameScene } from "../game";
import { MessageBox } from "../messagebox";
import { HintBox } from "../hintbox";
import { ProgressManager } from '../progress';
import { Vector2 } from "../vector";


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
        this.showConnected(false);
        this.client = new Client();
        console.log("Created archipelago client");

        this.client.messages.on("message", (content) => {
            console.log(content);
        });

        this.client.items.on("itemsReceived", (items: Item[]) => this.onReceive(items));

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
            .then(() => this.onConnect())
            .catch(function (e) { console.error(e); alert(e); });
    }

    private onConnect() {
        console.log("Connected to the Archipelago server!");
        this.showConnected(true);
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
        const log: HTMLParagraphElement = document.getElementById("log") as HTMLParagraphElement;
        log.innerText = "";
        for (const item of items) {
            log.innerText += `Received ${item.name} at ${item.locationName}\n`
            const id = item.id - 1;
            switch (id) {
                case 13:
                    ProgressManager.getInstance().setBooleanProperty("fansEnabled");
                    log.style.color = "#FFFFFF"
                    break;
                case 14:
                    ProgressManager.getInstance().increaseNumberProperty("stars");
                    log.style.color = "#F4FF00"
                    break;
                case 15:
                    ProgressManager.getInstance().increaseNumberProperty("kills");
                    log.style.color = "#FF0000"
                    break;
                default:
                    if (!ProgressManager.getInstance().doesValueExistInArray("items", id)) {
                        this.receiveEquipment(id)
                    }
                    log.style.color = "#FFFFFF"
                    break;
            }
        }
    }

    public updateReceivedItems() {
        ProgressManager.getInstance().setNumberProperty("stars", 0);
        ProgressManager.getInstance().setNumberProperty("kills", 0);
        this.onReceive(this.client.items.received);
    }

    public receiveEquipment(id: int) {
        ProgressManager.getInstance().addValueToArray("items", id, true);

        if (!Core.getInstance() || !Player.getInstance()) return;
        const event: CoreEvent = Core.getInstance().event;
        let text = <Array<string>>event.localization.findValue(["chest", String(id)]);

        if (text == null) return;

        const HINT_ID = [-1, 6, -1, 7, 8, 9, -1, -1, -1, -1, -1, 10];
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
    }

    public toggleFans(): void {
        const progress: ProgressManager = Player.getInstance().progress;
        progress.setBooleanProperty("fansEnabled", !progress.getBooleanProperty("fansEnabled"))
    }

    public removeEquipment(id: int): void {
        const progress: ProgressManager = Player.getInstance().progress;
        progress.removeValueFromArray("items", id)
    }

    public teleportToRoom(c: int, r: int): void {
        const player: Player = Player.getInstance();
        const prevPos: Vector2 = player.pos.clone();
        const roomOffset: Vector2 = new Vector2(prevPos.x % 160, prevPos.y % 144);
        const newPos: Vector2 = new Vector2(c * 160 + roomOffset.x, r * 144 + roomOffset.y);
        player.pos = newPos;
    }
}




export const Equipment: string[] = ["Running boots", "Nice helmet", "Master key", "Endless bag of tennis balls", "Lubricant", "Old rocket pack", "Rocket expansion", "Extra greasy hamburger", "Power glove", "Extra heart", "Poison mushroom of awesome powers", "Magic map", "Brain"];