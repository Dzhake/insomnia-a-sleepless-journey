import { Canvas } from "./canvas.ts";
import { CoreEvent } from "./core.ts";
import { negMod } from "./math.ts";
import { Bitmap, State } from "./types.ts";
import { drawBox } from "./messagebox.ts";
import { ActivableObject } from "./activableobject.ts";

export class MenuButton {


    private text : string;
    private callback : (event : CoreEvent) => void;


    constructor(text : string, callback : (event : CoreEvent) => void) {

        this.text = text;
        this.callback = callback;
    }


    public getText = () : string => this.text;
    public evaluateCallback = (event : CoreEvent) => this.callback(event);


    public clone() : MenuButton {

        return new MenuButton(this.text, this.callback);
    }


    public changeText(newText : string) {

        this.text = newText;
    }
}


export class Menu extends ActivableObject {


    private buttons : Array<MenuButton>;

    private cursorPos : number;

    private maxLength : number;


    constructor(buttons : Array<MenuButton>) {

        super();

        this.buttons = (new Array<MenuButton> (buttons.length))
            .fill(null)
            .map((b, i) => buttons[i].clone());

        this.maxLength = Math.max(
            ...this.buttons.map(b => b.getText().length));

        this.cursorPos = 0;
        this.active = false;
    }


    public activate(cursorPos = -1) {

        if (cursorPos >= 0)
            this.cursorPos = cursorPos % this.buttons.length;

        this.active = true;
    }


    public update(event : CoreEvent) {

        if (!this.active) return;

        let oldPos = this.cursorPos;

        if (event.input.upPress()) {

            -- this.cursorPos;
        }
        else if (event.input.downPress()) {

            ++ this.cursorPos;
        }

        if (oldPos != this.cursorPos) {

            this.cursorPos = negMod(this.cursorPos, this.buttons.length);

            event.audio.playSample(event.assets.getSample("choose"), 0.70);
        }

        let activeButton = this.buttons[this.cursorPos];
        
        if (event.input.getAction("select") == State.Pressed ||
            event.input.getAction("start") == State.Pressed) {

            event.audio.playSample(event.assets.getSample("select"), 0.50);    
            activeButton.evaluateCallback(event);
        }
    }


    public draw(canvas : Canvas, x : number, y : number,
        xoff = 0, yoff = 12, box = false) {

        if (!this.active) return;

        let str = "";

        let fontBase = canvas.assets.getBitmap("font");
        let fontYellow = canvas.assets.getBitmap("fontYellow");

        let w = (this.maxLength+1) * (8 + xoff);
        let h = (this.buttons.length * yoff);

        let dx = canvas.width/2 - w / 2 + x;
        let dy = canvas.height/2 - h / 2 + y;

        if (box) {

            drawBox(canvas, dx, dy-2, w, h);
        }

        let font : Bitmap;

        for (let i = 0; i < this.buttons.length; ++ i) {

            str = this.buttons[i].getText();
            if (i == this.cursorPos) {

                str = "@" + str;
                font = fontYellow
            }
            else {

                font = fontBase;
            }

            canvas.drawText(font, str, dx, dy + i * yoff, xoff, 0);
        } 
    }


    public isActive = () : boolean => this.active;


    public changeButtonText(index : number, text : string) {

        this.buttons[index].changeText(text);
    }
}
