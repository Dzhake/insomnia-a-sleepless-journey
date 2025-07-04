import { Canvas } from "./canvas.ts";
import { CoreEvent } from "./core.ts";
import { boxOverlay, WeakGameObject } from "./gameobject.ts";
import { Player } from "./player.ts";
import { Sprite } from "./sprite.ts";
import { Stage } from "./stage.ts";
import { Vector2 } from "./vector.ts";


export class Switch extends WeakGameObject {


    private down : boolean;


    constructor(x : number, y : number) {

        super(x, y, true);

        this.down = false;

        this.spr = new Sprite(16, 16);

        this.center = new Vector2(0, -6);
        this.hitbox = new Vector2(8, 4);
    }


    public updateLogic(event : CoreEvent) {

        // ...
    }


    public playerCollision(player : Player, stage : Stage, event : CoreEvent) : boolean {

        const PLAYER_JUMP = -3.0;
        const JUMP_EPS = 0.1;

        if (this.down || !this.inCamera) return false;

        let sy = player.getSpeed().y;
        if (sy <= JUMP_EPS) return false;

        if (player.overlayObject(this)) {

            this.down = true;
            this.spr.setFrame(1, 0);

            player.makeJump(PLAYER_JUMP);

            stage.toggleSpecialBlocks();

            player.progress.setBooleanProperty("switchState",
                !player.progress.getBooleanProperty("switchState"));

            event.audio.playSample(event.assets.getSample("toggle"), 0.50);

            return true;
        }

        return false;
    }


    public draw(canvas : Canvas) {

        if (!this.inCamera) return;

        canvas.drawSprite(this.spr, 
            canvas.assets.getBitmap("switch"),
            this.pos.x-8, this.pos.y-16);
    }


    public reset() {

        this.down = false;
        this.spr.setFrame(0, 0);
    }
}
