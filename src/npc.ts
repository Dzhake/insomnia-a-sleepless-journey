import { Camera } from "./camera.ts";
import { Canvas, Flip } from "./canvas.ts";
import { CoreEvent } from "./core.ts";
import { StrongInteractionTarget } from "./interactiontarget.ts";
import { MessageBox } from "./messagebox.ts";
import { Player } from "./player.ts";
import { Sprite } from "./sprite.ts";
import { Vector2 } from "./vector.ts";


export class NPC extends StrongInteractionTarget {


    private id : number;
    private flip : Flip;

    private readonly message : MessageBox;


    constructor(x : number, y : number, id : number, message : MessageBox) {

        super(x, y, true);

        this.spr = new Sprite(16, 16);
        this.flip = Flip.None;

        this.hitbox = new Vector2(12, 8);

        this.id = id;

        this.message = message;
    }


    protected updateLogic(event : CoreEvent) {

        const ANIM_SPEED = 10;

        this.spr.animate(0, 0, 3, ANIM_SPEED, event.step);
    }

    
    protected playerEvent(player : Player, event : CoreEvent) {

        this.flip = player.getPos().x < this.pos.x ? Flip.Horizontal : Flip.None;
    }


    protected interactionEvent(player : Player, camera : Camera, event : CoreEvent) {

        let text = <Array<string>> event.localization.findValue(["npc", String(this.id)]);

        if (text == null) return;

        this.message.addMessages(text);
        this.message.activate();

        event.audio.playSample(event.assets.getSample("select"), 0.50);
    }


    public draw(canvas : Canvas) {

        let bmp = canvas.assets.getBitmap("npc");

        if (!this.inCamera) return;

        canvas.drawSprite(this.spr, bmp, 
            this.pos.x - this.spr.width/2,
            this.pos.y - this.spr.height/2 + 1,
            this.flip);
    }
}
