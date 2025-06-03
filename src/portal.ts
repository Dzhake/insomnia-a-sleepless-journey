import { Camera } from "./camera.ts";
import { Canvas } from "./canvas.ts";
import { CoreEvent } from "./core.ts";
import { StrongInteractionTarget } from "./interactiontarget.ts";
import { MessageBox } from "./messagebox.ts";
import { PortalCallback } from "./objectmanager.ts";
import { Player } from "./player.ts";
import { ProgressManager } from "./progress.ts";
import { Sprite } from "./sprite.ts";
import { TransitionEffectType } from "./transition.ts";
import { Vector2 } from "./vector.ts";


export class Portal extends StrongInteractionTarget {


    private readonly message : MessageBox;
    private readonly progress : ProgressManager;

    private readonly cb : PortalCallback;
    

    constructor(x : number, y : number, message : MessageBox, progress : ProgressManager, cb : PortalCallback) {

        super(x, y, true);

        this.spr = new Sprite(32, 48);
        this.spr.setFrame(0, 1);

        this.hitbox = new Vector2(16, 8);

        this.message = message;
        this.progress = progress;

        this.cb = cb;
    }


    protected interactionEvent(player : Player, camera : Camera, event : CoreEvent) {

        event.audio.playSample(event.assets.getSample("select"), 0.50);

        this.message.addMessages(event.localization.findValue(["portal"]));
        this.message.activate(0, true, event => {

            event.audio.stopMusic();

            event.audio.playSample(event.assets.getSample("teleport"), 0.40);

            player.setUsePose(this.pos.x);
            event.shake(120, 4);

            event.transition.activate(true, TransitionEffectType.CirleIn,
                1.0/120.0, event => {

                    event.transition.activate(false, TransitionEffectType.Fade, 1.0/60.0,
                        null, [255, 255, 255], 4);
                    this.cb(event);

                }, [255, 255, 255])
                .setCenter(new Vector2(

                    this.pos.x % camera.width,
                    (this.pos.y-16) % camera.height));
        });
    }


    protected updateLogic(event : CoreEvent) {

        const ANIM_SPEED = 6;

        this.spr.animate(1, 0, 2, ANIM_SPEED, event.step);

        this.setInteractionState();
    }


    public draw(canvas : Canvas) {

        if (!this.inCamera) return;

        let bmp = canvas.assets.getBitmap("bigDoor");

        let sx = 0;

        canvas.drawSprite(this.spr, bmp, 
            this.pos.x - 16, 
            this.pos.y - 40);

        for (let i = 0; i < 2; ++ i) {

            sx = this.progress.doesValueExistInArray("orbsDestroyed", i) ? 32 : 0;
            canvas.drawBitmapRegion(bmp,
                i*16 + sx, 0, 16, 48,
                this.pos.x - 16 + i*16, 
                this.pos.y - 40);
        }
    }

    
    public setInteractionState() {

        this.canInteract = this.progress.doesValueExistInArray("orbsDestroyed", 0) &&
            this.progress.doesValueExistInArray("orbsDestroyed", 1);
    }
}
