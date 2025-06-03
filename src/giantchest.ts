import { Camera } from "./camera.ts";
import { Canvas } from "./canvas.ts";
import { CoreEvent } from "./core.ts";
import { Ending } from "./ending.ts";
import { StrongInteractionTarget } from "./interactiontarget.ts";
import { MessageBox } from "./messagebox.ts";
import { PortalCallback } from "./objectmanager.ts";
import { Player } from "./player.ts";
import { ProgressManager } from "./progress.ts";
import { Sprite } from "./sprite.ts";
import { TransitionEffectType } from "./transition.ts";
import { Vector2, Vector3 } from "./vector.ts";


export class GiantChest extends StrongInteractionTarget {


    private readonly message : MessageBox;


    constructor(x : number, y : number, message : MessageBox) {

        super(x, y, true);

        this.spr = new Sprite(32, 32);
        this.spr.setFrame(0, 0);

        this.hitbox = new Vector2(16, 8);

        this.message = message;
    }


    protected interactionEvent(player : Player, camera : Camera, event : CoreEvent) {

        event.audio.playSample(event.assets.getSample("select"), 0.50);

        player.setUsePose(this.pos.x-4, true);

        // Good grief
        this.message.addMessages(event.localization.findValue(["preEnding", "0"]));
        this.message.activate(0, false, event => {

            this.canInteract = false;
            this.spr.setFrame(1, 0);

            this.message.addMessages(event.localization.findValue(["preEnding", "1"]));
            this.message.activate(0, false, event => {

                player.setSleepPose();

                this.message.addMessages(event.localization.findValue(["preEnding", "2"]));
                this.message.activate(0, false, event => {

                    event.audio.stopMusic();
                    event.audio.playSample(event.assets.getSample("asleep"), 0.55);

                    event.copyCanvasToBuffer();
                    event.transition.activate(true, TransitionEffectType.HorizontalWavesWithFading, 1.0/210.0,
                        event => {

                            event.changeScene(Ending);

                        }, [255, 255, 255], 8, new Vector2(80, 4));
                });
            });
        });
    }


    public draw(canvas : Canvas) {

        if (!this.inCamera) return;

        let bmp = canvas.assets.getBitmap("giantChest");

        canvas.drawSprite(this.spr, bmp, 
            this.pos.x - this.spr.width/2, 
            this.pos.y - 24);
    }

}
