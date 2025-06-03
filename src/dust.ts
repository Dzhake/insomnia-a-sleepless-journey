import { Canvas } from "./canvas.ts";
import { CoreEvent } from "./core.ts";
import { ExistingObject } from "./gameobject.ts";
import { Sprite } from "./sprite.ts";
import { Vector2 } from "./vector.ts";


export class Dust extends ExistingObject {

    
    private pos : Vector2;
    private animSpeed : number;
    private spr : Sprite;
    private speed : Vector2;


    constructor() {

        super();

        this.pos = new Vector2();
        this.animSpeed = 0;
        this.spr = new Sprite(8, 8);
        this.speed = new Vector2();

        this.exist = false;
    }


    public spawn(x : number, y : number, animSpeed : number, speed = new Vector2(), row = 0) {

        this.pos = new Vector2(x, y);
        this.animSpeed = animSpeed;
        this.speed = speed.clone();
        this.spr.setFrame(0, row);

        this.exist = true;
    }


    public update(event : CoreEvent) {

        if (!this.exist) return;

        this.pos.x += this.speed.x * event.step;
        this.pos.y += this.speed.y * event.step;

        this.spr.animate(this.spr.getRow(), 0, 4, this.animSpeed, event.step);
        if (this.spr.getColumn() == 4) {

            this.exist = false;
        }
    }


    public draw(canvas : Canvas) {

        if (!this.exist) return;

        let x = Math.round(this.pos.x-4) | 0;
        let y = Math.round(this.pos.y-4) | 0;

        canvas.drawSprite(this.spr, 
            canvas.assets.getBitmap("dust"),
            x, y);
    }


    public kill() {

        this.exist = false;
    }
}
