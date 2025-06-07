import { Camera } from "./camera.ts";
import { Canvas } from "./canvas.ts";
import { CoreEvent } from "./core.ts";
import { StrongInteractionTarget } from "./interactiontarget.ts";
import { MessageBox } from "./messagebox.ts";
import { Player } from "./player.ts";
import { SaveManager } from "./savemanager.ts";
import { Sprite } from "./sprite.ts";
import { Vector2 } from "./vector.ts";


const MESSAGE_TIME_MOVE = 12;
const MESSAGE_TIME_WAIT = 45;


export const saveGame = (message: MessageBox, saveManager: SaveManager, event: CoreEvent): void => {

    let text = event.localization.findValue(["saveGame"]);

    if (text == null) return;

    message.addMessages(text);
    message.activate(0, true, event => {

        if (saveManager.save()) {

            message.addMessages(event.localization.findValue(["gameSaved"]));
        }
        else {

            message.addMessages(event.localization.findValue(["gameSaveFailed"]));
        }
        message.activate();
    }, 0);
}


export class SavePoint extends StrongInteractionTarget {


    public readonly id: number;

    private activated: boolean;
    private wave: number;
    private messageTimer: number;

    private readonly message: MessageBox;
    private readonly saveManager: SaveManager;


    constructor(x: number, y: number, id: number,
        message: MessageBox, saveManager: SaveManager) {

        super(x, y, true);

        this.spr = new Sprite(16, 16);
        this.activated = false;

        this.hitbox = new Vector2(16, 8);

        this.id = id;

        this.wave = 0.0;
        this.messageTimer = 0;

        this.message = message;
        this.saveManager = saveManager;
    }


    protected outsideCameraEvent() {

        this.messageTimer = 0;
    }


    protected updateLogic(event: CoreEvent) {

        const ANIM_SPEED = 6;
        const WAVE_SPEED = 0.067;

        if (this.messageTimer > 0) {

            this.messageTimer -= event.step;
        }

        if (this.activated) {

            this.spr.animate(0, 1, 5, ANIM_SPEED, event.step);
        }
        else {

            this.spr.setFrame(0, 0);
        }

        this.wave = (this.wave + WAVE_SPEED * event.step) % (Math.PI * 2);
    }


    protected playerEvent(player: Player, event: CoreEvent) {

        if (player.getActiveCheckpointReference() != this) {

            this.activated = false;
            this.wave = 0;
        }
    }


    protected extendedPlayerCollisionEvent(player: Player, event: CoreEvent) {

        player.maximizeHealth();
        if (this.activated)
            return;

        this.wave = Math.PI + Math.PI / 2;

        this.messageTimer = MESSAGE_TIME_MOVE + MESSAGE_TIME_WAIT;

        player.progress.setNumberProperty("checkpoint", this.id);

        this.activated = true;
        player.setActiveCheckpointReference(this);

        event.audio.playSample(event.assets.getSample("checkpoint"), 0.50);
    }


    protected interactionEvent(player: Player, camera: Camera, event: CoreEvent) {

        saveGame(this.message, this.saveManager, event);

        event.audio.playSample(event.assets.getSample("select"), 0.50);
    }


    public draw(canvas: Canvas) {

        const AMPLITUDE = 1;

        let bmp = canvas.assets.getBitmap("checkpoint");

        if (!this.inCamera) return;

        let y = 0;
        if (this.activated) {

            y = 3 + Math.round(Math.sin(this.wave) * AMPLITUDE);
        }

        canvas.drawSprite(this.spr, bmp,
            this.pos.x - this.spr.width / 2,
            this.pos.y - this.spr.height / 2 + 1 - y);

        if (this.messageTimer > 0) {

            y = this.pos.y;
            if (this.messageTimer > MESSAGE_TIME_WAIT) {

                y -= (MESSAGE_TIME_MOVE - (this.messageTimer - MESSAGE_TIME_WAIT)) * 2;
            }
            else {

                y -= MESSAGE_TIME_MOVE * 2;
            }

            canvas.drawBitmapRegion(bmp, 0, 16, 48, 16,
                this.pos.x - 24, y - 16);
        }
    }


    public activate() {

        this.wave = 0;
        this.activated = true;

        this.spr.setFrame(1, 0);

        this.messageTimer = 0;
    }
}
