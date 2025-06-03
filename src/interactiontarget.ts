import { Camera } from "./camera.ts";
import { CoreEvent } from "./core.ts";
import { WeakGameObject } from "./gameobject.ts";
import { Player } from "./player.ts";


export class WeakInteractionTarget extends WeakGameObject {


    protected canInteract : boolean;


    constructor(x : number, y : number, exist = true) {

        super(x, y, exist);

        this.canInteract = true;
    }


    protected playerCollisionEvent(player : Player, camera : Camera, event : CoreEvent) {}
    protected playerEvent(player : Player, event : CoreEvent) {}


    public playerCollision(player : Player, camera : Camera, event : CoreEvent) : boolean {

        if (player.isDying() || !player.doesExist() ||
            !this.canInteract || !this.exist || !this.inCamera || this.dying) 
            return false;

        this.playerEvent(player, event);

        if (player.overlayObject(this)) {

            this.playerCollisionEvent(player, camera, event);
            return true;
        }
        return false;
    }

}


export class StrongInteractionTarget extends WeakInteractionTarget {


    constructor(x : number, y : number, exist = true) {

        super(x, y, exist);
    }


    protected interactionEvent(player : Player, camera : Camera, event : CoreEvent) {}
    protected extendedPlayerCollisionEvent(player : Player, event : CoreEvent) {}


    protected playerCollisionEvent(player : Player, camera : Camera, event : CoreEvent) {

        this.extendedPlayerCollisionEvent(player, event);

        if (!player.touchGround()) return;

        player.showSymbol();

        if (event.input.upPress()) {

            this.interactionEvent(player, camera, event);
        }
    }

}
