import { Camera } from "./camera.ts";
import { Canvas, Flip } from "./canvas.ts";
import { CoreEvent } from "./core.ts";
import { INSIDE_THEME_VOLUME, playTheme, THEME_VOLUME } from "./game.ts";
import { StrongInteractionTarget } from "./interactiontarget.ts";
import { MessageBox } from "./messagebox.ts";
import { Player } from "./player.ts";
import { Sprite } from "./sprite.ts";
import { TransitionEffectType } from "./transition.ts";
import { Vector2 } from "./vector.ts";


export class Door extends StrongInteractionTarget {


    private open : boolean;
    private pair : Door;

    private readonly message : MessageBox;
    
    public readonly id : number;
    public readonly inside : boolean;


    constructor(x : number, y : number, id : number, inside : boolean, message : MessageBox) {

        super(x, y, true);

        const ALWAYS_OPEN = [0, 2, 9, 10, 11, 12, 13, 16, 19];

        this.spr = new Sprite(16, 32);

        this.hitbox = new Vector2(10, 8);

        this.open = ALWAYS_OPEN.includes(id) || inside;
        this.id = id;
        this.inside = inside;
        this.pair = null;

        this.message = message;
    }


    public markPair(door : Door) {

        if (this.pair != null) return;

        this.pair = door;
    }


    protected interactionEvent(player : Player, camera : Camera, event : CoreEvent) {

        if (this.pair == null) return;

        let msg : Array<string>;
        if (!this.open) {

            if (!player.progress.doesValueExistInArray("items", 2)) {

                msg = event.localization.findValue(["locked"]);

                event.audio.playSample(event.assets.getSample("select"), 0.50);
            }
            else {

                msg = event.localization.findValue(["open"]);
                this.open = true;

                player.progress.addValueToArray("doors", this.id, true);

                event.audio.playSample(event.assets.getSample("open"), 0.60);
            }

            if (msg == null) return;

            this.message.addMessages(msg);
            this.message.activate();

            return;
        }

        let p = player.getPos();

        player.setUsePose(this.pos.x);

        this.canInteract = false;

        event.audio.stopMusic();
        event.audio.playSample(event.assets.getSample("door"), 0.50);

        event.transition.activate(true, TransitionEffectType.CirleIn, 1.0/30.0,
            event => {

                this.canInteract = true;

                player.teleportTo(
                    Vector2.add(this.pair.getPos(), new Vector2(0, 1)), 
                    true, !this.inside);
                camera.focusOnObject(player);

                p = player.getPos();
                event.transition.setCenter(new Vector2(p.x % 160, p.y % 144));

                playTheme(event, player.isInside(), player.isInFinalArea);
                
            })
            .setCenter(new Vector2(p.x % 160, p.y % 144));
    }


    public draw(canvas : Canvas) {

        let bmp = canvas.assets.getBitmap("door");

        if (!this.inCamera || this.open) return;

        canvas.drawSprite(this.spr, bmp, 
            this.pos.x - this.spr.width/2,
            this.pos.y - 24);
    }


    public forceOpen() {

        this.open = true;
    }


    public getPairPos = () : Vector2 => this.pair.getPos();
}
