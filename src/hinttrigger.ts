import { CoreEvent } from "./core.ts";
import { HintBox } from "./hintbox.ts";
import { WeakInteractionTarget } from "./interactiontarget.ts";
import { Sprite } from "./sprite.ts";


export class HintTrigger extends WeakInteractionTarget {


    public readonly id : number;

    private readonly hintbox : HintBox;

    private message : string;


    constructor(x : number, y : number, id : number, hintbox : HintBox,
        event : CoreEvent) {

        super(x, y, true);

        this.id = id;
        this.hintbox = hintbox;

        this.message = event.localization.findValue(["hints", String(id)]);

        this.canInteract = false;

        // For camera check only
        this.spr = new Sprite(16, 16);
    }


    protected updateLogic(event : CoreEvent) {

        this.exist = false;

        this.hintbox.setMessage(this.message);
        this.hintbox.activate();
    }
}
