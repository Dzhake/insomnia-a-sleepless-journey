import { Camera } from "./camera.ts";
import { Canvas, Flip } from "./canvas.ts";
import { CoreEvent } from "./core.ts";
import { StrongInteractionTarget } from "./interactiontarget.ts";
import { MessageBox } from "./messagebox.ts";
import { Player } from "./player.ts";
import { Sprite } from "./sprite.ts";
import { Vector2 } from "./vector.ts";


export class Lever extends StrongInteractionTarget {

    private activated : boolean;

    private readonly message : MessageBox;


    constructor(x : number, y : number, message : MessageBox) {

        super(x, y, true);

        this.spr = new Sprite(16, 16);

        this.hitbox = new Vector2(12, 8);

        this.activated = false;

        this.message = message;
    }


    protected interactionEvent(player : Player, camera : Camera, event : CoreEvent) {

        const WAIT_TIME = 60;

        if (this.activated) return;

        let text = <Array<string>> event.localization.findValue(["lever"]);

        if (text == null) return;

        this.message.addMessages(text);
        this.message.activate(WAIT_TIME);

        event.shake(WAIT_TIME, 2.0);

        this.enable();

        player.setUsePose();
        player.progress.setBooleanProperty("fansEnabled");

        event.audio.playSample(event.assets.getSample("lever"), 0.50);
    }


    public draw(canvas : Canvas) {

        let bmp = canvas.assets.getBitmap("lever");

        if (!this.inCamera) return;

        canvas.drawSprite(this.spr, bmp, 
            this.pos.x - this.spr.width/2,
            this.pos.y - this.spr.height/2);
    }


    public enable() {

        this.activated = true;
        this.canInteract = false;

        this.spr.setFrame(1, 0);
    }
}
